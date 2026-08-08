import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';

/**
 * Six-digit code from a CSPRNG.
 *
 * Math.random() (used previously) is predictable enough that an attacker who
 * observes a few codes can narrow the next one — unacceptable for a code that
 * grants a password reset.
 */
export const generateOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

export const hashOtp = (otp) => bcrypt.hash(otp, env.BCRYPT_ROUNDS);

export const compareOtp = (otp, hash) => {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(otp, hash);
};

export const otpExpiry = () => new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

export const isExpired = (expiry) => !expiry || expiry.getTime() < Date.now();
