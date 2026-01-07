import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import transporter from '../config/nodemailer.js';

export const registerUser = async ({ name, email, password }) => {
    if (!name || !email || !password)
        return { status: 400, success: false, message: 'Missing details' };

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser)
            return { status: 400, success: false, message: 'User already exists' };

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });

        transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Welcome to Our Service',
            text: `Hello ${name},\n\nThank you for registering with us! We're excited to have you on board.\n\nBest regards,\nThe Team`
        })
            .catch(err => console.error('Error sending welcome email:', err));

        User.verifyOtp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
        User.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
        User.isAccountVerified = false; // Initially set to false
        User.resetOtp = '';
        User.resetOtpExpireAt = 0; // Initially set to 0
        User.createdAt = Date.now(); // Set createdAt to current time

        await user.save();

        return { status: 201, success: true, message: 'User registered' };
    } catch (err) {
        return { status: 500, success: false, message: 'Server error' };
    }
};

export const loginUser = async ({ email, password }, res) => {

    if (!email || !password) {
        return { status: 400, success: false, message: 'Missing details' };
    }

    try {

        const user = await User.findOne({ email });
        if (!user)
            return { status: 400, success: false, message: 'Invalid email' };
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return { status: 400, success: false, message: 'Invalid password' };

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        return { status: 200, success: true, message: 'Logged in successfully' };
    } catch (err) {
        return { status: 500, success: false, message: 'Server error' };
    }
};

export const logoutUser = async (res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });

    return { status: 200, success: true, message: 'Logged out' };
};

export const validateToken = async (token) => {
    if (!token)
        return { status: 401, success: false, message: 'No token' };

    try {
        jwt.verify(token, process.env.JWT_SECRET);
        return { status: 200, authenticated: true };
    } catch {
        return { status: 403, success: false, message: 'Invalid token' };
    }
};

// export const initializeFields = async () => {
//     try {
//         const result = await User.updateMany(
//             {},
//             {
//                 $set: {
//                     verifyOtp: '',
//                     verifyOtpExpireAt: 0,
//                     isAccountVerified: false,
//                     resetOtp: '',
//                     resetOtpExpireAt: 0
//                 }
//             }
//         );
//         return {
//             status: 200,
//             success: true,
//             message: `Fields initialized for ${result.modifiedCount} users`
//         };
//     } catch (err) {
//         return { status: 500, success: false, message: err.message };
//     }
// };
