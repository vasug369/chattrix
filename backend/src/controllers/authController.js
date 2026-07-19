import {
    registerUser,
    loginUser,
    logoutUser,
    validateToken,
    sendVerifyOtp,
    verifyEmail,
    sendResetOtp,
    resetPassword,
} from '../services/authService.js';

const applyResult = (res, result) => {
    const { cookies, clearCookies, ...body } = result;
    (cookies || []).forEach(({ name, value, options }) => res.cookie(name, value, options));
    (clearCookies || []).forEach((name) => res.clearCookie(name));
    res.status(body.status).json(body);
};

export const register = async (req, res) => {
    const result = await registerUser(req.body);
    applyResult(res, result);
};

export const login = async (req, res) => {
    const result = await loginUser(req.body);
    applyResult(res, result);
};

export const logout = async (req, res) => {
    const result = await logoutUser();
    applyResult(res, result);
};

export const validate = async (req, res) => {
    const result = await validateToken(req.cookies.token);
    res.status(result.status).json(result);
};

export const sendVerifyOtpHandler = async (req, res) => {
    const result = await sendVerifyOtp(req.user._id);
    res.status(result.status).json(result);
};

export const verifyEmailHandler = async (req, res) => {
    const result = await verifyEmail(req.user._id, req.body.otp);
    res.status(result.status).json(result);
};

export const sendResetOtpHandler = async (req, res) => {
    const result = await sendResetOtp(req.body.email);
    res.status(result.status).json(result);
};

export const resetPasswordHandler = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const result = await resetPassword(email, otp, newPassword);
    res.status(result.status).json(result);
};
