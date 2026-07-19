import rateLimit from 'express-rate-limit';

// Generous enough for real usage/testing, tight enough to blunt credential-stuffing/spam.
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, success: false, message: 'Too many attempts, please try again later.' },
});
