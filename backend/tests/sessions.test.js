import { describe, expect, it } from 'vitest';
import Session from '../src/models/session.model.js';
import User from '../src/models/user.model.js';
import { describeDevice } from '../src/services/sessionService.js';
import { authenticateHandshake } from '../src/realtime/socketAuth.js';
import { app, createUser, request } from './helpers.js';

/** Log in again as an existing user and hand back the raw cookie header. */
const loginWith = async (payload, userAgent) => {
  const req = request(app).post('/api/auth/login');
  if (userAgent) req.set('User-Agent', userAgent);

  const res = await req.send({ email: payload.email, password: payload.password }).expect(200);

  const cookies = res.headers['set-cookie'].map((c) => c.split(';')[0]);
  return { cookies, res };
};

describe('session inventory', () => {
  it('opens a session row on login', async () => {
    const { id } = await createUser();
    const sessions = await Session.find({ user: id });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].revokedAt).toBeNull();
    expect(sessions[0].jti).toMatch(/^[0-9a-f]{64}$/);
  });

  it('lists sessions and marks the calling device as current', async () => {
    const { agent } = await createUser();
    const res = await agent.get('/api/auth/sessions').expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].current).toBe(true);
    expect(res.body.data[0]).toHaveProperty('device');
    expect(res.body.data[0]).toHaveProperty('lastSeenAt');
  });

  it('never exposes the jti', async () => {
    const { agent } = await createUser();
    const res = await agent.get('/api/auth/sessions').expect(200);
    // The jti is effectively a session credential. Leaking it in a list
    // endpoint would be the getAllUsers-returning-password-hashes mistake
    // wearing a different hat.
    expect(JSON.stringify(res.body)).not.toMatch(/[0-9a-f]{64}/);
    expect(res.body.data[0]).not.toHaveProperty('jti');
  });

  it('records one row per device, not per request', async () => {
    const { agent, id, payload } = await createUser();
    await loginWith(payload, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1');

    // Several requests from the first device must not create extra rows.
    await agent.get('/api/user/me').expect(200);
    await agent.get('/api/user/me').expect(200);

    const sessions = await Session.find({ user: id, revokedAt: null });
    expect(sessions).toHaveLength(2);
  });

  it('labels the device from the user agent', async () => {
    const { payload } = await createUser();
    await loginWith(
      payload,
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    );

    const session = await Session.findOne({ userAgent: /Windows/ });
    expect(session.device).toBe('Chrome on Windows');
  });
});

describe('remote sign-out', () => {
  it('kills the revoked device and leaves the others working', async () => {
    const { agent, payload } = await createUser();
    const other = await loginWith(payload, 'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0');

    // Both devices work to begin with.
    await agent.get('/api/user/me').expect(200);
    await request(app).get('/api/user/me').set('Cookie', other.cookies).expect(200);

    const list = await agent.get('/api/auth/sessions').expect(200);
    const target = list.body.data.find((s) => !s.current);

    await agent.delete(`/api/auth/sessions/${target.id}`).expect(200);

    // The revoked device still holds syntactically valid tokens. They must
    // stop working anyway, or the button is decorative.
    await request(app).get('/api/user/me').set('Cookie', other.cookies).expect(401);
    await agent.get('/api/user/me').expect(200);
  });

  it('signs out every other device at once', async () => {
    const { agent, payload } = await createUser();
    const a = await loginWith(payload, 'Mozilla/5.0 (Linux; Android 14) Chrome/120.0');
    const b = await loginWith(payload, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1');

    const res = await agent.delete('/api/auth/sessions').expect(200);
    expect(res.body.data.revoked).toBe(2);

    await request(app).get('/api/user/me').set('Cookie', a.cookies).expect(401);
    await request(app).get('/api/user/me').set('Cookie', b.cookies).expect(401);
    // The device that pressed the button keeps its own session.
    await agent.get('/api/user/me').expect(200);
  });

  it('refuses to revoke another account\'s session', async () => {
    const attacker = await createUser();
    const victim = await createUser();

    const victimSession = await Session.findOne({ user: victim.id });

    // Broken access control, the same shape as the post-ownership bug: the id
    // comes from the URL, so the query must be scoped to the caller.
    await attacker.agent.delete(`/api/auth/sessions/${victimSession._id}`).expect(404);

    const stillLive = await Session.findById(victimSession._id);
    expect(stillLive.revokedAt).toBeNull();
    await victim.agent.get('/api/user/me').expect(200);
  });

  it('rejects a malformed session id with 422 rather than a cast error', async () => {
    const { agent } = await createUser();
    await agent.delete('/api/auth/sessions/not-an-id').expect(422);
  });
});

describe('session lifecycle', () => {
  it('revokes the session on logout so captured cookies cannot be replayed', async () => {
    const { payload } = await createUser();
    const { cookies } = await loginWith(payload);

    await request(app).get('/api/user/me').set('Cookie', cookies).expect(200);
    await request(app).post('/api/auth/logout').set('Cookie', cookies).expect(200);

    // Clearing cookies only disarms the browser that asked. A copy taken
    // beforehand must be dead too.
    await request(app).get('/api/user/me').set('Cookie', cookies).expect(401);
  });

  it('revokes every session on password reset', async () => {
    const { id, payload } = await createUser();
    await loginWith(payload, 'Mozilla/5.0 (Linux; Android 14) Chrome/120.0');

    await User.updateOne({ _id: id }, { $set: { resetOtp: '', otpAttempts: 0 } });
    expect(await Session.countDocuments({ user: id, revokedAt: null })).toBe(2);

    const { resetPassword } = await import('../src/services/authService.js');
    const { hashOtp, otpExpiry } = await import('../src/utils/otp.js');
    await User.updateOne(
      { _id: id },
      { $set: { resetOtp: await hashOtp('123456'), resetOtpExpiry: otpExpiry() } }
    );
    await resetPassword({ email: payload.email, otp: '123456', newPassword: 'BrandNewPass1' });

    expect(await Session.countDocuments({ user: id, revokedAt: null })).toBe(0);
  });

  it('reuses the session row when tokens are refreshed', async () => {
    const { agent, id } = await createUser();
    await agent.post('/api/auth/refresh').expect(200);
    await agent.post('/api/auth/refresh').expect(200);

    // Rotating tokens must not spawn a new "device" every fifteen minutes.
    expect(await Session.countDocuments({ user: id, revokedAt: null })).toBe(1);
    await agent.get('/api/user/me').expect(200);
  });

  it('rejects a token whose session row is gone entirely', async () => {
    const { agent, id } = await createUser();
    await Session.deleteMany({ user: id });
    await agent.get('/api/user/me').expect(401);
  });
});

describe('socket handshake authentication', () => {
  const handshakeWith = (cookies) => ({ headers: { cookie: cookies.join('; ') } });

  it('resolves the user id from the session cookie', async () => {
    const { payload, id } = await createUser();
    const { cookies } = await loginWith(payload);

    await expect(authenticateHandshake(handshakeWith(cookies))).resolves.toBe(id);
  });

  it('ignores a client-supplied userId in the query', async () => {
    const victim = await createUser();
    const attacker = await createUser();
    const { cookies } = await loginWith(attacker.payload);

    // The vulnerability this replaced: the server read handshake.query.userId
    // and trusted it, so connecting as somebody else was a matter of editing
    // a query string. Identity now comes from the cookie and the query is
    // never consulted.
    const handshake = { headers: { cookie: cookies.join('; ') }, query: { userId: victim.id } };

    await expect(authenticateHandshake(handshake)).resolves.toBe(attacker.id);
  });

  it('rejects a handshake with no cookie', async () => {
    await expect(authenticateHandshake({ headers: {} })).resolves.toBeNull();
    await expect(authenticateHandshake({})).resolves.toBeNull();
  });

  it('rejects a forged token', async () => {
    await expect(
      authenticateHandshake(handshakeWith(['token=not.a.jwt']))
    ).resolves.toBeNull();
  });

  it('rejects a token whose session was signed out', async () => {
    const { payload, id } = await createUser();
    const { cookies } = await loginWith(payload);

    await Session.updateMany({ user: id }, { $set: { revokedAt: new Date() } });

    // A remote sign-out has to close the websocket path too, not just HTTP —
    // otherwise the device keeps streaming notifications after being kicked.
    await expect(authenticateHandshake(handshakeWith(cookies))).resolves.toBeNull();
  });

  it('rejects a refresh token used in place of an access token', async () => {
    const { payload } = await createUser();
    const { cookies } = await loginWith(payload);
    const refreshOnly = cookies.filter((c) => c.startsWith('refreshToken='));

    // The refresh token is signed with a different secret and is not accepted
    // here: there is no way to set a replacement cookie on an open socket.
    await expect(authenticateHandshake(handshakeWith(refreshOnly))).resolves.toBeNull();
  });
});

describe('describeDevice', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36', 'Chrome on Windows'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/17.0 Safari/605.1', 'Safari on macOS'],
    ['Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/121.0', 'Firefox on Linux'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Safari/604.1', 'Safari on iOS'],
    ['Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36 Edg/120.0', 'Edge on Windows'],
    ['', 'Unknown device'],
    ['curl/8.5.0', 'Unknown device'],
  ])('labels %s', (ua, expected) => {
    expect(describeDevice(ua)).toBe(expected);
  });

  it('does not mistake Edge or Opera for Chrome', () => {
    // Both send a Chrome token in their UA, so ordering in the check matters.
    expect(describeDevice('Windows NT 10.0 Chrome/120 Safari/537 OPR/106.0')).toBe('Opera on Windows');
    expect(describeDevice('Windows NT 10.0 Chrome/120 Safari/537 Edg/120')).toBe('Edge on Windows');
  });
});
