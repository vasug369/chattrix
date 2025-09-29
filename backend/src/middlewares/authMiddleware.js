// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const authMiddleware = async (req, res, next) => {
  console.log(req); // Debugging line to check if middleware is called
  console.log(req.cookies); // Debugging line to check cookies
  try {
    console.log(req.cookies);

    const token = req.cookies.token;
    const refreshToken = req.cookies.refreshToken;

    // console.log("Token from cookies:", token);
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }


    // Verify the token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // console.log('Decoded JWT:', decoded);

      req.user = await User.findById(decoded.id).select('-password');
      // console.log('User from DB:', req.user);

      next();

    }
    catch (err) {
      if (err.name === 'TokenExpiredError' && refreshToken) {
        // If token is expired, try to refresh it
        try {

          const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);


          const newAccessToken = jwt.sign(
            { id: decodedRefresh.id },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
          );

          // Set new access token in cookie
          res.cookie('token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 15 * 60 * 1000,
          });

          // Load user
          req.user = await User.findById(decodedRefresh.id).select('-password');

          return next();
        } catch (refreshErr) {
          return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }



      }
    }

  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
