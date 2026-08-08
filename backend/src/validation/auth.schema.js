import { z } from 'zod';
import { email, name, otpCode, password } from './common.js';

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
