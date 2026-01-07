import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import transporter from '../config/nodemailer.js';

export const registerUser = async ({ name, email, password, pic }, res) => {
    if (!name || !email || !password) {
        return res.status(400).json({
            status: 400,
            success: false,
            message: 'Missing details'
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: 'User already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, pic });

        transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Welcome to Our Service',
            text: `Hello ${name},\n\nThank you for registering with us! We're excited to have you on board.\n\nBest regards,\nThe Team`
        }).catch(err => console.error('Error sending welcome email:', err));

        user.verifyOtp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
        user.isAccountVerified = false;
        user.resetOtp = '';
        user.resetOtpExpireAt = 0;
        user.createdAt = Date.now();

        await user.save();

        return res.status(201).json({
            status: 201,
            success: true,
            message: 'User registered successfully'
        });
    } catch (err) {
        return res.status(500).json({
            status: 500,
            success: false,
            message: 'Server error'
        });
    }
};

export const loginUser = async ({ email, password }, res) => {
    if (!email || !password) {
        return res.status(400).json({
            status: 400,
            success: false,
            message: 'Missing details'
        });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: 'Invalid email'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: 'Invalid password'
            });
        }

        const token = jwt.sign({ id: user._id ,name:user.name,email:user.email}, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        }

        )

        return res.status(200).json({
            status: 200,
            success: true,
            message: 'Logged in successfully',
            data: {
                token,
                "name":user.name,
                "email":user.email,
                "id":user._id

            }
        });
    } catch (err) {
        return res.status(500).json({
            status: 500,
            success: false,
            message: 'Server error'
        });
    }
};

export const logoutUser = async (res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
    });

    return res.status(200).json({
        status: 200,
        success: true,
        message: 'Logged out'
    });
};



export const refreshAccessToken = async (req, res) => {
    const token = req.cookies.refreshToken;

    if (!token) {
        return res.status(401).json({
            status: 401,
            success: false,
            message: 'No refresh token'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

        // You may also verify token existence in DB if storing refresh tokens there

        const newAccessToken = jwt.sign(
            { id: decoded.id },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 15 * 60 * 1000
        });

        return res.status(200).json({
            status: 200,
            success: true,
            message: 'Access token refreshed'
        });
    } catch (err) {
        return res.status(403).json({
            status: 403,
            success: false,
            message: 'Invalid refresh token'
        });
    }
};


export const validateToken = async (token, res) => {
    if (!token) {
        return res.status(401).json({
            status: 401,
            success: false,
            message: 'No token'
        });
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET);
        return res.status(200).json({
            status: 200,
            success: true,
            authenticated: true
        });
    } catch {
        return res.status(403).json({
            status: 403,
            success: false,
            message: 'Invalid token'
        });
    }
};
