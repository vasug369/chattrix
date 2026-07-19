export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
