import { describe, expect, it, vi } from 'vitest';
import User from '../src/models/user.model.js';
import * as mailer from '../src/config/nodemailer.js';
import { VALID_PASSWORD, app, createUser, request } from './helpers.js';

/**
 * Codes are stored as bcrypt hashes, so tests cannot read them back out of the
 * database. Instead we intercept the outgoing mail and pull the code from the
 * body — which also asserts the user actually receives it.
 */
const captureOtp = () => {
  const spy = vi.spyOn(mailer, 'sendMail');
  return {
    spy,
    latest() {
      const calls = spy.mock.calls;
      if (!calls.length) return null;
      const match = calls.at(-1)[0].text.match(/\b(\d{6})\b/);
      return match?.[1] ?? null;
    },
  };
};

const registerUnverified = async (email = 'otp@example.com') => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'OTP User', email, password: VALID_PASSWORD })
    .expect(201);
  return email;
};

describe('email verification', () => {
  it('issues a code on registration and verifies with it', async () => {
    const capture = captureOtp();
    const email = await registerUnverified();

    await request(app).post('/api/auth/send-verify-otp').send({ email }).expect(200);
    const otp = capture.latest();
    expect(otp).toMatch(/^\d{6}$/);

    await request(app).post('/api/auth/verify-email').send({ email, otp }).expect(200);
    expect((await User.findOne({ email })).isAccountVerified).toBe(true);
  });

  it('rejects an incorrect code', async () => {
    const capture = captureOtp();
    const email = await registerUnverified('wrong@example.com');
    await request(app).post('/api/auth/send-verify-otp').send({ email }).expect(200);

    const otp = capture.latest();
    const wrong = otp === '000000' ? '111111' : '000000';

    await request(app).post('/api/auth/verify-email').send({ email, otp: wrong }).expect(400);
    expect((await User.findOne({ email })).isAccountVerified).toBe(false);
  });

  it('rejects an expired code', async () => {
    const capture = captureOtp();
    const email = await registerUnverified('expired@example.com');
    await request(app).post('/api/auth/send-verify-otp').send({ email }).expect(200);
    const otp = capture.latest();

    await User.updateOne({ email }, { $set: { verifyOtpExpiry: new Date(Date.now() - 1000) } });

    await request(app).post('/api/auth/verify-email').send({ email, otp }).expect(400);
    expect((await User.findOne({ email })).isAccountVerified).toBe(false);
  });

  it('locks out after too many wrong attempts', async () => {
    const capture = captureOtp();
    const email = await registerUnverified('bruteforce@example.com');
    await request(app).post('/api/auth/send-verify-otp').send({ email }).expect(200);
    const otp = capture.latest();
    const wrong = otp === '000000' ? '111111' : '000000';

    // Without an attempt counter a 6-digit code is brute-forceable, since the
    // endpoint would otherwise answer indefinitely.
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/verify-email').send({ email, otp: wrong }).expect(400);
    }

    // The correct code is now refused too — the account is locked until a new
    // code is requested.
    const res = await request(app).post('/api/auth/verify-email').send({ email, otp }).expect(400);
    expect(res.body.message).toMatch(/too many/i);
  });

  it('resets the attempt counter when a new code is issued', async () => {
    const capture = captureOtp();
    const email = await registerUnverified('reissue@example.com');
    await request(app).post('/api/auth/send-verify-otp').send({ email }).expect(200);
    const wrong = '000000' === capture.latest() ? '111111' : '000000';

    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/verify-email').send({ email, otp: wrong }).expect(400);
    }

    await request(app).post('/api/auth/send-verify-otp').send({ email }).expect(200);
    await request(app)
      .post('/api/auth/verify-email')
      .send({ email, otp: capture.latest() })
      .expect(200);
  });

  it('stores the code hashed, so a database read yields nothing usable', async () => {
    const capture = captureOtp();
    const email = await registerUnverified('hashed@example.com');
    await request(app).post('/api/auth/send-verify-otp').send({ email }).expect(200);

    const user = await User.findOne({ email }).select('+verifyOtp');
    expect(user.verifyOtp).not.toBe(capture.latest());
    expect(user.verifyOtp).toMatch(/^\$2[aby]\$/);
  });

  it('does not reveal whether an address has an account', async () => {
    const known = await registerUnverified('known@example.com');

    const a = await request(app).post('/api/auth/send-verify-otp').send({ email: known }).expect(200);
    const b = await request(app)
      .post('/api/auth/send-verify-otp')
      .send({ email: 'stranger@example.com' })
      .expect(200);

    // Identical responses: otherwise the endpoint is an account-existence oracle.
    expect(a.body).toEqual(b.body);
  });

  it('rejects a non-numeric or wrong-length code with 422', async () => {
    const email = await registerUnverified('format@example.com');
    await request(app).post('/api/auth/verify-email').send({ email, otp: 'abcdef' }).expect(422);
    await request(app).post('/api/auth/verify-email').send({ email, otp: '123' }).expect(422);
  });
});

describe('password reset', () => {
  it('resets the password with a valid code and lets the user log in again', async () => {
    const capture = captureOtp();
    const { payload } = await createUser();
    const newPassword = 'BrandNewPass1';

    await request(app).post('/api/auth/forgot-password').send({ email: payload.email }).expect(200);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: payload.email, otp: capture.latest(), newPassword })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: newPassword })
      .expect(200);

    // The old password must stop working.
    await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: payload.password })
      .expect(401);
  });

  it('revokes existing sessions on reset', async () => {
    const capture = captureOtp();
    const { agent, payload } = await createUser();

    await agent.get('/api/user/me').expect(200);

    await request(app).post('/api/auth/forgot-password').send({ email: payload.email }).expect(200);
    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: payload.email, otp: capture.latest(), newPassword: 'BrandNewPass1' })
      .expect(200);

    // tokenVersion was bumped, so the refresh token this agent still holds no
    // longer validates — whoever triggered the reset does not keep a session.
    await agent.get('/api/user/me').expect(401);
  });

  it('rejects a wrong reset code', async () => {
    const capture = captureOtp();
    const { payload } = await createUser();
    await request(app).post('/api/auth/forgot-password').send({ email: payload.email }).expect(200);
    const wrong = capture.latest() === '000000' ? '111111' : '000000';

    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: payload.email, otp: wrong, newPassword: 'BrandNewPass1' })
      .expect(400);

    await request(app)
      .post('/api/auth/login')
      .send({ email: payload.email, password: payload.password })
      .expect(200);
  });

  it('rejects an expired reset code', async () => {
    const capture = captureOtp();
    const { payload } = await createUser();
    await request(app).post('/api/auth/forgot-password').send({ email: payload.email }).expect(200);
    const otp = capture.latest();

    await User.updateOne(
      { email: payload.email },
      { $set: { resetOtpExpiry: new Date(Date.now() - 1000) } }
    );

    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: payload.email, otp, newPassword: 'BrandNewPass1' })
      .expect(400);
  });

  it('enforces password strength on the new password', async () => {
    const capture = captureOtp();
    const { payload } = await createUser();
    await request(app).post('/api/auth/forgot-password').send({ email: payload.email }).expect(200);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: payload.email, otp: capture.latest(), newPassword: 'weak' })
      .expect(422);
    expect(res.body.details.fields).toHaveProperty('newPassword');
  });

  it('does not reveal whether an address has an account', async () => {
    const { payload } = await createUser();
    const a = await request(app).post('/api/auth/forgot-password').send({ email: payload.email }).expect(200);
    const b = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody-here@example.com' })
      .expect(200);
    expect(a.body).toEqual(b.body);
  });

  it('cannot reuse a reset code', async () => {
    const capture = captureOtp();
    const { payload } = await createUser();
    await request(app).post('/api/auth/forgot-password').send({ email: payload.email }).expect(200);
    const otp = capture.latest();

    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: payload.email, otp, newPassword: 'FirstNewPass1' })
      .expect(200);

    // The code is cleared on success, so a replay finds nothing to match.
    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: payload.email, otp, newPassword: 'SecondNewPass1' })
      .expect(400);
  });
});
