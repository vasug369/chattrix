import { z } from 'zod';
import { email, idParam, name, otpCode, password } from './common.js';

export const registerSchema = {
  body: z.object({
    name,
    email,
    password,
    pic: z.string().url('Profile picture must be a valid URL').optional(),
  }),
};

export const loginSchema = {
  // Login only checks that a password was supplied — applying the strength
  // rules here would leak which accounts predate the rules, and would lock out
  // existing users whose passwords are still valid.
  body: z.object({
    email,
    password: z.string().min(1, 'Password is required'),
  }),
};

export const sendVerifyOtpSchema = {
  body: z.object({ email }),
};

export const verifyEmailSchema = {
  body: z.object({ email, otp: otpCode }),
};

export const forgotPasswordSchema = {
  body: z.object({ email }),
};

export const resetPasswordSchema = {
  body: z.object({
    email,
    otp: otpCode,
    newPassword: password,
  }),
};

/**
 * Revoking a session takes its public _id (never the jti, which does not leave
 * the server). Validating the shape here means a malformed id is a 422 rather
 * than a Mongoose CastError further in.
 */
export const sessionIdSchema = {
  params: idParam,
};

/**
 * Google hands the browser a compact JWS — three base64url segments separated
 * by dots. Checking the shape here keeps obviously-malformed input from
 * reaching the verifier, and bounds the length so an oversized body cannot be
 * pushed through the signature check.
 */
export const googleSignInSchema = {
  body: z.object({
    credential: z
      .string()
      .min(20, 'Missing Google credential')
      .max(4096, 'Google credential is implausibly large')
      .regex(/^[\w-]+\.[\w-]+\.[\w-]+$/, 'Malformed Google credential'),
  }),
};
