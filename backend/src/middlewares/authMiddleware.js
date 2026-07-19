import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { accessTokenCookieOptions } from '../utils/cookieOptions.js';

export const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token;
    const refreshToken = req.cookies.refreshToken;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized: User not found' });
        }

        return next();
    } catch (err) {
        if (err.name !== 'TokenExpiredError' || !refreshToken) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        try {
            const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            const newAccessToken = jwt.sign(
                { id: decodedRefresh.id },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            res.cookie('token', newAccessToken, accessTokenCookieOptions());

            req.user = await User.findById(decodedRefresh.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized: User not found' });
            }

            return next();
        } catch {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }
    }
};
