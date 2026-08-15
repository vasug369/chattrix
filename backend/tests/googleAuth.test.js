import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as googleClient from '../src/config/googleClient.js';
import User from '../src/models/user.model.js';
import { VALID_PASSWORD, app, request } from './helpers.js';

/**
 * Google's verifier is replaced throughout: the point of these tests is what
 * we do with a set of claims, not whether google-auth-library can check a
 * signature. Reaching the network would make the suite slow and flaky and
 * would test somebody else's code.
 *
 * The credential string itself only has to satisfy the request schema — the
 * verifier never looks at it here.
 */
const CREDENTIAL = ['a'.repeat(20), 'b'.repeat(20), 'c'.repeat(20)].join('.');

const claims = (overrides = {}) => ({
  sub: 'google-subject-1',
  email: 'sso@example.com',
  email_verified: true,
  name: 'SSO User',
  picture: 'https://lh3.googleusercontent.com/photo.jpg',
  ...overrides,
});

const mockGoogle = (payload) =>
  vi.spyOn(googleClient, 'verifyGoogleIdToken').mockResolvedValue(payload);

const signIn = () => request(app).post('/api/auth/google').send({ credential: CREDENTIAL });

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/auth/google', () => {
  it('creates a verified account the first time, and signs it in', async () => {
    mockGoogle(claims());

    const res = await signIn().expect(201);

    expect(res.body.data.email).toBe('sso@example.com');
    expect(res.body.data.isNewAccount).toBe(true);
    // Google already proved the address, so no OTP round-trip.
    expect(res.body.data.isAccountVerified).toBe(true);

    // Same cookies as a password login, so every downstream route works
    // without knowing which door the user came through.
    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toMatch(/token=/);
    expect(cookies).toMatch(/refreshToken=/);

    const stored = await User.findOne({ email: 'sso@example.com' }).select('+googleId +password');
    expect(stored.googleId).toBe('google-subject-1');
    expect(stored.authProviders).toEqual(['google']);
    // No invented password: absent is honest, a random hash would look usable.
    expect(stored.password).toBeUndefined();
  });

  it('reuses the account on a second sign-in rather than duplicating it', async () => {
    mockGoogle(claims());
    await signIn().expect(201);

    mockGoogle(claims());
    const res = await signIn().expect(200);

    expect(res.body.data.isNewAccount).toBe(false);
    expect(await User.countDocuments({ email: 'sso@example.com' })).toBe(1);
  });

  it('follows the account when Google reports a changed email', async () => {
    mockGoogle(claims());
    await signIn().expect(201);

    // Same subject, different address. Matching on email would strand the
    // original account and silently create a second one.
    mockGoogle(claims({ email: 'renamed@example.com' }));
    await signIn().expect(200);

    expect(await User.countDocuments({})).toBe(1);
  });

  it('links to an existing local account with the same verified email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Local User', email: 'both@example.com', password: VALID_PASSWORD })
      .expect(201);

    mockGoogle(claims({ email: 'both@example.com', sub: 'google-subject-2' }));
    const res = await signIn().expect(200);

    expect(res.body.data.isNewAccount).toBe(false);
    expect(await User.countDocuments({ email: 'both@example.com' })).toBe(1);

    const stored = await User.findOne({ email: 'both@example.com' }).select('+googleId +password');
    expect(stored.googleId).toBe('google-subject-2');
    expect(stored.authProviders).toEqual(['local', 'google']);
    // Linking must not cost the user their password login.
    expect(stored.password).toBeTruthy();
    expect(stored.isAccountVerified).toBe(true);
  });

  it('refuses an unverified Google email', async () => {
    // Anyone can list an address they do not own on a Google profile. Linking
    // on it would hand over any matching local account.
    mockGoogle(claims({ email_verified: false }));

    await signIn().expect(401);
    expect(await User.countDocuments({})).toBe(0);
  });

  it('refuses a token the verifier rejects', async () => {
    vi.spyOn(googleClient, 'verifyGoogleIdToken').mockRejectedValue(
      new Error('Wrong recipient, payload audience != requiredAudience')
    );

    const res = await signIn().expect(401);

    // The real reason names audiences and signatures. Useful in a log,
    // meaningless to a user, and a bad token should look identical to one
    // minted for another site.
    expect(res.body.message).toBe('Google sign-in failed');
  });

  it('rejects a malformed credential before it reaches the verifier', async () => {
    const spy = vi.spyOn(googleClient, 'verifyGoogleIdToken');

    await request(app).post('/api/auth/google').send({ credential: 'not-a-jwt' }).expect(422);

    expect(spy).not.toHaveBeenCalled();
  });

  it('keeps a Google-only account out of password login without a 500', async () => {
    mockGoogle(claims());
    await signIn().expect(201);

    // There is no stored hash. bcrypt.compare(undefined) throws, so without a
    // guard an ordinary typo would surface as a server error.
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sso@example.com', password: VALID_PASSWORD })
      .expect(401);

    // Identical to every other failure: naming the provider would reveal which
    // addresses exist and how they signed up.
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('accepts a display name Google sends outside our length limits', async () => {
    // The schema wants 2-50 characters and Google promises neither, so an
    // otherwise valid login would fail validation after the token was accepted.
    mockGoogle(claims({ name: 'x'.repeat(120) }));
    const res = await signIn().expect(201);

    expect(res.body.data.name).toHaveLength(50);
  });

  it('falls back to a usable name when Google sends none', async () => {
    mockGoogle(claims({ name: undefined, email: 'a@example.com' }));
    const res = await signIn().expect(201);

    // Local part is a single character, below the schema minimum.
    expect(res.body.data.name).toBe('New user');
  });
});
