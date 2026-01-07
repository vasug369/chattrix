import jsonwebtoken from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

/**
 * Middleware to authenticate requests using JWT from cookies.
 */
export const authMiddleware = (req, res, next) => {
    const token = req.cookies.token; // ✅ Get token from cookie

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jsonwebtoken.verify(token, jwtSecret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

export default authMiddleware;
