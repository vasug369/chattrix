import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { queueMail } from '../config/mailer.js';
import User from '../models/user.model.js';
import { badRequest, conflict, unauthorized } from '../utils/AppError.js';
import { compareOtp, generateOtp, hashOtp, isExpired, otpExpiry } from '../utils/otp.js';
import { createSession, revokeAllSessionsService } from './sessionService.js';

/**
 * Services return values and throw AppError; they no longer receive `res`.
 *
 * The old contract was broken in both directions: `registerUser(req.body)` was
 * called without the `res` it expected (so every registration threw a
 * TypeError), while services that *did* get `res` sent a response and then let
 * the controller try to send a second one.
 */

export const cookieBase = () => ({
  httpOnly: true,
  secure: env.isProduction,
  // Cross-site cookies (Vercel frontend -> Render API) require SameSite=None,
  // which browsers only honour alongside Secure.
  sameSite: env.isProduction ? 'None' : 'Lax',
  // Shares the cookie with every subdomain of the parent, so the socket
  // handshake against api.<domain> carries it. Omitted entirely when unset —
  // passing `domain: undefined` is fine, but an empty string is not.
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});

export const accessCookieOptions = () => ({ ...cookieBase(), maxAge: 15 * 60 * 1000 });
export const refreshCookieOptions = () => ({ ...cookieBase(), maxAge: 7 * 24 * 60 * 60 * 1000 });

/**
 * Mint the token pair for a session.
 *
 * Both tokens carry the same `jti`, which names a row in the Session
 * collection. That is what makes per-device sign-out possible: `tokenVersion`
 * alone can only revoke everything at once.
 */
export const issueTokens = (user, jti) => ({
  // tokenVersion travels in the access token as well as the refresh token.
  // Checking it only on refresh left a window of one access-token lifetime
  // (15 minutes) in which a password reset did not actually end an active
  // session.
  token: jwt.sign(
    { id: user._id, name: user.name, email: user.email, jti, tokenVersion: user.tokenVersion ?? 0 },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  ),
  refreshToken: jwt.sign(
    { id: user._id, jti, tokenVersion: user.tokenVersion ?? 0 },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_TTL }
  ),
});

const otpEmail = (name, otp, purpose) => ({
  subject: purpose === 'verify' ? 'Verify your Chattrix account' : 'Reset your Chattrix password',
  text:
    purpose === 'verify'
      ? `Hi ${name},\n\nYour Chattrix verification code is ${otp}. It expires in ${env.OTP_TTL_MINUTES} minutes.\n\nIf you didn't create this account, you can ignore this email.`
      : `Hi ${name},\n\nYour Chattrix password reset code is ${otp}. It expires in ${env.OTP_TTL_MINUTES} minutes.\n\nIf you didn't request a reset, your account is still safe — just ignore this email.`,
});

/**
 * `name` is user-controlled and goes into an HTML body, so it has to be
 * escaped. Mail clients render HTML: a display name of `<img onerror=...>`
 * would otherwise be injected into every welcome message we send.
 */
const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Sent once, at registration rather than after verification.
 *
 * Verification is not currently enforced anywhere (requireVerifiedEmail exists
 * but is not wired to a route), so welcoming people at verification time would
 * mean most accounts never receive one.
 */
export const welcomeEmail = (name) => {
  const safeName = escapeHtml(name);
  return {
    subject: 'Welcome to Chattrix 👋',
    text: [
      `Hi ${name},`,
      '',
      "Welcome to Chattrix — your account is ready.",
      '',
      'A few things you can do now:',
      '  • Share your first post',
      '  • Follow people and build your feed',
      '  • Message anyone in real time',
      '  • Review your signed-in devices under Settings → Sessions',
      '',
      `Jump in: ${env.APP_URL}`,
      '',
      "If you didn't create this account, you can safely ignore this email.",
      '',
      '— The Chattrix team',
    ].join('\n'),
    html: `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2430">
  <h1 style="font-size:22px;margin:0 0 4px">Welcome to Chattrix 👋</h1>
  <p style="margin:0 0 20px;color:#6b7280">Hi ${safeName}, your account is ready.</p>
  <ul style="padding-left:20px;margin:0 0 24px;line-height:1.7">
    <li>Share your first post</li>
    <li>Follow people and build your feed</li>
    <li>Message anyone in real time</li>
    <li>Review your signed-in devices under <strong>Settings → Sessions</strong></li>
  </ul>
  <p style="margin:0 0 24px">
    <a href="${env.APP_URL}" style="background:#6d5efc;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;display:inline-block">Open Chattrix</a>
  </p>
  <p style="font-size:12px;color:#9ca3af;margin:0">
    If you didn't create this account, you can safely ignore this email.
  </p>
</div>`.trim(),
  };
};

export const registerUser = async ({ name, email, password, pic }) => {
  const existing = await User.findOne({ email });
  if (existing) throw conflict('An account with that email already exists');

  const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const otp = generateOtp();

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    ...(pic ? { pic } : {}),
    verifyOtp: await hashOtp(otp),
    verifyOtpExpiry: otpExpiry(),
    isAccountVerified: false,
  });

  // Fire-and-forget: the account exists either way, and awaiting the
  // provider previously added its full timeout to every registration.
  //
  // The verification code goes first deliberately — it is the one the user is
  // waiting on, and both land in the same inbox seconds apart.
  queueMail({ to: email, ...otpEmail(name, otp, 'verify') });
  queueMail({ to: email, ...welcomeEmail(name) });

  return user;
};

export const loginUser = async ({ email, password }, req) => {
  // password is `select: false` on the schema, so it must be asked for.
  const user = await User.findOne({ email }).select('+password');

  // One generic message covers both "no such email" and "wrong password" — the
  // previous 'Invalid email' / 'Invalid password' split let anyone enumerate
  // which addresses have accounts.
  if (!user) throw unauthorized('Invalid email or password');

  // A Google-only account has no stored hash. bcrypt.compare() rejects when
  // given undefined, which would surface as a 500 on an ordinary typo. The
  // message stays identical to the others on purpose: saying "this account
  // uses Google" would turn login into an oracle for which addresses exist and
  // how they signed up.
  if (!user.password) throw unauthorized('Invalid email or password');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw unauthorized('Invalid email or password');

  // A successful login opens a session row; the tokens point at it by jti.
  const session = await createSession(user._id, req);

  return { user, session, ...issueTokens(user, session.jti) };
};

/** Issue (or re-issue) an email-verification code. */
export const sendVerificationOtp = async (email) => {
  const user = await User.findOne({ email }).select('+verifyOtp +verifyOtpExpiry +otpAttempts');

  // Always report success to the caller: a different response for unknown
  // addresses would turn this endpoint into an account-existence oracle.
  if (!user || user.isAccountVerified) return { sent: false };

  const otp = generateOtp();
  user.verifyOtp = await hashOtp(otp);
  user.verifyOtpExpiry = otpExpiry();
  user.otpAttempts = 0;
  await user.save();

  queueMail({ to: email, ...otpEmail(user.name, otp, 'verify') });
  return { sent: true };
};

export const verifyEmailOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email }).select('+verifyOtp +verifyOtpExpiry +otpAttempts');
  if (!user) throw badRequest('Invalid or expired verification code');
  if (user.isAccountVerified) return { alreadyVerified: true, user };

  if (user.otpAttempts >= env.OTP_MAX_ATTEMPTS) {
    throw badRequest('Too many incorrect attempts. Request a new code.');
  }
  if (isExpired(user.verifyOtpExpiry)) throw badRequest('Invalid or expired verification code');

  const matches = await compareOtp(otp, user.verifyOtp);
  if (!matches) {
    // Counting failures stops a 6-digit code from being brute-forced in ~10^6
    // requests against an endpoint that would otherwise never say no.
    user.otpAttempts += 1;
    await user.save();
    throw badRequest('Invalid or expired verification code');
  }

  user.isAccountVerified = true;
  user.verifyOtp = '';
  user.verifyOtpExpiry = null;
  user.otpAttempts = 0;
  await user.save();

  return { alreadyVerified: false, user };
};

export const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email }).select('+resetOtp +resetOtpExpiry +otpAttempts');
  if (!user) return { sent: false };

  const otp = generateOtp();
  user.resetOtp = await hashOtp(otp);
  user.resetOtpExpiry = otpExpiry();
  user.otpAttempts = 0;
  await user.save();

  queueMail({ to: email, ...otpEmail(user.name, otp, 'reset') });
  return { sent: true };
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ email }).select(
    '+resetOtp +resetOtpExpiry +otpAttempts +password'
  );
  if (!user) throw badRequest('Invalid or expired reset code');

  if (user.otpAttempts >= env.OTP_MAX_ATTEMPTS) {
    throw badRequest('Too many incorrect attempts. Request a new code.');
  }
  if (isExpired(user.resetOtpExpiry)) throw badRequest('Invalid or expired reset code');

  const matches = await compareOtp(otp, user.resetOtp);
  if (!matches) {
    user.otpAttempts += 1;
    await user.save();
    throw badRequest('Invalid or expired reset code');
  }

  user.password = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  user.resetOtp = '';
  user.resetOtpExpiry = null;
  user.otpAttempts = 0;
  // Retire every refresh token issued before the reset — otherwise whoever
  // prompted the reset keeps their existing session.
  user.tokenVersion += 1;
  await user.save();

  // tokenVersion alone already invalidates the tokens. Marking the session
  // rows revoked as well keeps the "where you're logged in" list honest —
  // otherwise it would keep listing devices that can no longer authenticate.
  await revokeAllSessionsService(user._id);

  return user;
};

export const validateAccessToken = (token) => {
  if (!token) throw unauthorized('No token provided');
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw unauthorized('Invalid or expired token');
  }
};
