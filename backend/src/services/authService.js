import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { sendMail } from '../config/nodemailer.js';
import User from '../models/user.model.js';
import { badRequest, conflict, unauthorized } from '../utils/AppError.js';
import { compareOtp, generateOtp, hashOtp, isExpired, otpExpiry } from '../utils/otp.js';

/**
 * Services return values and throw AppError; they no longer receive `res`.
 *
 * The old contract was broken in both directions: `registerUser(req.body)` was
 * called without the `res` it expected (so every registration threw a
 * TypeError), while services that *did* get `res` sent a response and then let
 * the controller try to send a second one.
 */

const cookieBase = () => ({
  httpOnly: true,
  secure: env.isProduction,
  // Cross-site cookies (Vercel frontend -> Render API) require SameSite=None,
  // which browsers only honour alongside Secure.
  sameSite: env.isProduction ? 'None' : 'Lax',
});

export const accessCookieOptions = () => ({ ...cookieBase(), maxAge: 15 * 60 * 1000 });
export const refreshCookieOptions = () => ({ ...cookieBase(), maxAge: 7 * 24 * 60 * 60 * 1000 });

export const issueTokens = (user) => ({
  // tokenVersion travels in the access token as well as the refresh token.
  // Checking it only on refresh left a window of one access-token lifetime
  // (15 minutes) in which a password reset did not actually end an active
  // session.
  token: jwt.sign(
    { id: user._id, name: user.name, email: user.email, tokenVersion: user.tokenVersion ?? 0 },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  ),
  refreshToken: jwt.sign(
    { id: user._id, tokenVersion: user.tokenVersion ?? 0 },
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

  await sendMail({ to: email, ...otpEmail(name, otp, 'verify') });

  return user;
};

export const loginUser = async ({ email, password }) => {
  // password is `select: false` on the schema, so it must be asked for.
  const user = await User.findOne({ email }).select('+password');

  // One generic message covers both "no such email" and "wrong password" — the
  // previous 'Invalid email' / 'Invalid password' split let anyone enumerate
  // which addresses have accounts.
  if (!user) throw unauthorized('Invalid email or password');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw unauthorized('Invalid email or password');

  return { user, ...issueTokens(user) };
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

  await sendMail({ to: email, ...otpEmail(user.name, otp, 'verify') });
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

  await sendMail({ to: email, ...otpEmail(user.name, otp, 'reset') });
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
