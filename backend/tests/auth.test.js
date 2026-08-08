import { describe, expect, it } from 'vitest';
import User from '../src/models/user.model.js';
import { VALID_PASSWORD, app, createUser, request } from './helpers.js';

describe('POST /api/auth/register', () => {
  it('creates an account and returns the public user shape', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email: 'ada@example.com', password: VALID_PASSWORD })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('ada@example.com');
    // Regression: register previously called the service without `res`, so
    // every registration threw a TypeError and returned 500.
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body.data).not.toHaveProperty('verifyOtp');
  });

  it('stores the password hashed, never in plaintext', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Grace Hopper', email: 'grace@example.com', password: VALID_PASSWORD })
      .expect(201);

    const user = await User.findOne({ email: 'grace@example.com' }).select('+password +verifyOtp');
    expect(user.password).not.toBe(VALID_PASSWORD);
    expect(user.password).toMatch(/^\$2[aby]\$/);
    // The OTP is stored as a bcrypt hash too, so a DB read yields no usable code.
    expect(user.verifyOtp).toMatch(/^\$2[aby]\$/);
    expect(user.isAccountVerified).toBe(false);
  });

  it('lowercases and trims the email', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Case Test', email: '  MiXeD@Example.COM  ', password: VALID_PASSWORD })
      .expect(201);

    expect(await User.findOne({ email: 'mixed@example.com' })).not.toBeNull();
  });

  it('rejects a duplicate email with 409', async () => {
    const body = { name: 'First', email: 'dupe@example.com', password: VALID_PASSWORD };
    await request(app).post('/api/auth/register').send(body).expect(201);
    const res = await request(app).post('/api/auth/register').send(body).expect(409);
    expect(res.body.success).toBe(false);
  });

  it.each([
    ['missing name', { email: 'a@b.com', password: VALID_PASSWORD }, 'name'],
    ['short name', { name: 'A', email: 'a@b.com', password: VALID_PASSWORD }, 'name'],
    ['malformed email', { name: 'Ok Name', email: 'not-an-email', password: VALID_PASSWORD }, 'email'],
    ['short password', { name: 'Ok Name', email: 'a@b.com', password: 'Ab1' }, 'password'],
    ['password without uppercase', { name: 'Ok Name', email: 'a@b.com', password: 'lowercase1' }, 'password'],
    ['password without a digit', { name: 'Ok Name', email: 'a@b.com', password: 'NoDigitsHere' }, 'password'],
  ])('rejects %s with 422 naming the field', async (_label, payload, field) => {
    const res = await request(app).post('/api/auth/register').send(payload).expect(422);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.details.fields).toHaveProperty(field);
  });

  it('ignores unexpected fields rather than persisting them', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Sneaky',
        email: 'sneaky@example.com',
        password: VALID_PASSWORD,
        isAccountVerified: true,
        followers: ['deadbeefdeadbeefdeadbeef'],
      })
      .expect(201);

    const user = await User.findOne({ email: 'sneaky@example.com' });
    // Privilege escalation via mass assignment: the request asked to be
    // verified with pre-seeded followers, and got neither.
    expect(user.isAccountVerified).toBe(false);
    expect(user.followers).toHaveLength(0);
  });
});

describe('POST /api/auth/login', () => {
  it('sets httpOnly access and refresh cookies', async () => {
    const { payload } = await createUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: payload.password })
      .expect(200);

    const cookies = res.headers['set-cookie'].join(';');
    expect(cookies).toContain('token=');
    expect(cookies).toContain('refreshToken=');
    // A refresh cookie was previously never issued locally, because
    // JWT_REFRESH_SECRET was absent and jwt.sign threw a 500.
    expect(res.headers['set-cookie'].every((c) => c.includes('HttpOnly'))).toBe(true);
  });

  it('does not return the JWT in the response body', async () => {
    const { loginBody } = await createUser();
    // Returning the token invites clients to copy it into localStorage, where
    // any XSS can read it. The cookie is the only carrier.
    expect(loginBody.data).not.toHaveProperty('token');
    expect(loginBody.data).not.toHaveProperty('password');
  });

  it('gives the same error for an unknown email and a wrong password', async () => {
    const { payload } = await createUser();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: 'WrongPassw0rd' })
      .expect(401);

    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: VALID_PASSWORD })
      .expect(401);

    // Distinct messages ('Invalid email' vs 'Invalid password') let anyone
    // enumerate which addresses have accounts.
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('rejects a login missing a password with 422', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'someone@example.com' })
      .expect(422);
    expect(res.body.details.fields).toHaveProperty('password');
  });
});

describe('session handling', () => {
  it('rejects protected routes without cookies', async () => {
    await request(app).get('/api/user/me').expect(401);
  });

  it('returns 401 rather than hanging on a malformed token', async () => {
    // Regression: the middleware's inner catch handled TokenExpiredError only.
    // Any other JWT error fell through without calling next() or responding,
    // so the request hung until the client timed out.
    const res = await request(app)
      .get('/api/user/me')
      .set('Cookie', ['token=this-is-not-a-jwt'])
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const forged = jwt.sign({ id: '507f1f77bcf86cd799439011' }, 'attacker-chosen-secret');
    await request(app).get('/api/user/me').set('Cookie', [`token=${forged}`]).expect(401);
  });

  it('clears both cookies on logout', async () => {
    const { agent } = await createUser();
    const res = await agent.post('/api/auth/logout').expect(200);
    const cookies = res.headers['set-cookie'].join(';');
    // The refresh cookie used to survive logout, silently minting a new
    // session on the next request.
    expect(cookies).toMatch(/token=;/);
    expect(cookies).toMatch(/refreshToken=;/);
  });

  it('rejects a session whose user has been deleted', async () => {
    const { agent, id } = await createUser();
    await agent.get('/api/user/me').expect(200);
    await User.findByIdAndDelete(id);
    await agent.get('/api/user/me').expect(401);
  });
});
