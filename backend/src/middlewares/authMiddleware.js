// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const authMiddleware = async (req, res, next) => {
  console.log(req); // Debugging line to check if middleware is called
  console.log(req.cookies); // Debugging line to check cookies
  try {
    console.log(req.cookies);
    
    const token = req.cookies.token;
    // console.log("Token from cookies:", token);
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('Decoded JWT:', decoded);

    req.user = await User.findById(decoded.id).select('-password');
    // console.log('User from DB:', req.user);

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
