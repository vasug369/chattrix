import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

/**
 * Rate limits are disabled under test so suites can hammer an endpoint without
 * tripping a 429 — except where a test opts in explicitly.
 */
const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { success: false, message: 'Too many requests, please try again later' },
};

/** Broad ceiling applied to the whole API. */
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 600,
});

/** Login/register: the endpoints worth brute-forcing. */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes',
  },
});

/**
 * OTP issuance is the expensive one — each call sends an email, and an
 * unthrottled endpoint is both a mail-cost problem and a way to spam a
 * third party's inbox.
 */
export const otpLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message: 'Too many verification codes requested, please try again in an hour',
  },
});

export const writeLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 30,
});
