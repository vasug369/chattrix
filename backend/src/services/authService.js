import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import transporter from '../config/nodemailer.js';
import { generateOtp, OTP_EXPIRY_MS } from '../utils/otp.js';
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '../utils/cookieOptions.js';

const sendMail = (options) => {
    transporter.sendMail(options).catch((err) => console.error('Error sending email:', err.message));
};

export const registerUser = async ({ name, email, password, pic }) => {
    if (!name || !email || !password) {
        return { status: 400, success: false, message: 'Missing details' };
    }
    if (password.length < 6) {
        return { status: 400, success: false, message: 'Password must be at least 6 characters' };
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        return { status: 400, success: false, message: 'User already exists' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, pic });

    user.verifyOtp = generateOtp();
    user.verifyOtpExpireAt = Date.now() + OTP_EXPIRY_MS;
    user.isAccountVerified = false;

    await user.save();

    sendMail({
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: 'Welcome to Chattrix',
        text: `Hello ${name},\n\nThank you for registering with Chattrix! We're excited to have you on board.\n\nYour verification code is: ${user.verifyOtp} (valid for 10 minutes).\n\nBest,\nThe Chattrix Team`,
    });

    return { status: 201, success: true, message: 'User registered successfully' };
};

export const loginUser = async ({ email, password }) => {
    if (!email || !password) {
        return { status: 400, success: false, message: 'Missing details' };
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        return { status: 400, success: false, message: 'Invalid email or password' };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return { status: 400, success: false, message: 'Invalid email or password' };
    }

    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return {
        status: 200,
        success: true,
        message: 'Logged in successfully',
        data: {
            token,
            name: user.name,
            email: user.email,
            id: user._id,
            pic: user.pic,
            isAccountVerified: user.isAccountVerified,
        },
        cookies: [
            { name: 'token', value: token, options: accessTokenCookieOptions() },
            { name: 'refreshToken', value: refreshToken, options: refreshTokenCookieOptions() },
        ],
    };
};

export const logoutUser = async () => {
    return {
        status: 200,
        success: true,
        message: 'Logged out',
        clearCookies: ['token', 'refreshToken'],
    };
};

export const validateToken = async (token) => {
    if (!token) {
        return { status: 401, success: false, authenticated: false, message: 'No token' };
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return { status: 401, success: false, authenticated: false, message: 'User not found' };
        }
        return {
            status: 200,
            success: true,
            authenticated: true,
            data: { id: user._id, name: user.name, email: user.email, pic: user.pic, isAccountVerified: user.isAccountVerified },
        };
    } catch {
        return { status: 403, success: false, authenticated: false, message: 'Invalid token' };
    }
};

export const sendVerifyOtp = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        return { status: 404, success: false, message: 'User not found' };
    }
    if (user.isAccountVerified) {
        return { status: 400, success: false, message: 'Account already verified' };
    }

    user.verifyOtp = generateOtp();
    user.verifyOtpExpireAt = Date.now() + OTP_EXPIRY_MS;
    await user.save();

    sendMail({
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: 'Chattrix — Verify your email',
        text: `Your verification code is: ${user.verifyOtp} (valid for 10 minutes).`,
    });

    return { status: 200, success: true, message: 'Verification OTP sent to email' };
};

export const verifyEmail = async (userId, otp) => {
    const user = await User.findById(userId);
    if (!user) {
        return { status: 404, success: false, message: 'User not found' };
    }
    if (user.isAccountVerified) {
        return { status: 400, success: false, message: 'Account already verified' };
    }
    if (!otp || user.verifyOtp !== otp) {
        return { status: 400, success: false, message: 'Invalid OTP' };
    }
    if (user.verifyOtpExpireAt < Date.now()) {
        return { status: 400, success: false, message: 'OTP has expired' };
    }

    user.isAccountVerified = true;
    user.verifyOtp = '';
    user.verifyOtpExpireAt = 0;
    await user.save();

    return { status: 200, success: true, message: 'Email verified successfully' };
};

export const sendResetOtp = async (email) => {
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
        // Do not leak whether an email is registered.
        return { status: 200, success: true, message: 'If that email is registered, a reset code has been sent' };
    }

    user.resetOtp = generateOtp();
    user.resetOtpExpireAt = Date.now() + OTP_EXPIRY_MS;
    await user.save();

    sendMail({
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: 'Chattrix — Password reset code',
        text: `Your password reset code is: ${user.resetOtp} (valid for 10 minutes). If you didn't request this, ignore this email.`,
    });

    return { status: 200, success: true, message: 'If that email is registered, a reset code has been sent' };
};

export const resetPassword = async (email, otp, newPassword) => {
    if (!email || !otp || !newPassword) {
        return { status: 400, success: false, message: 'Missing details' };
    }
    if (newPassword.length < 6) {
        return { status: 400, success: false, message: 'Password must be at least 6 characters' };
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.resetOtp !== otp) {
        return { status: 400, success: false, message: 'Invalid OTP' };
    }
    if (user.resetOtpExpireAt < Date.now()) {
        return { status: 400, success: false, message: 'OTP has expired' };
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = '';
    user.resetOtpExpireAt = 0;
    await user.save();

    return { status: 200, success: true, message: 'Password reset successfully' };
};
