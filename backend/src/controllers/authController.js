import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();


export const register = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.json({ success: false, message: 'missing Details' })
    }
    try {
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.json({ success: false, message: 'user already exist' });
        }
        const hashedPass = await bcrypt.hash(password, 10);
        const user = new User({ name, email, Password: hashedPass });

        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(201).json({ success: 'true', message: 'user registered succesfully' });



    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export const login = async (req, res) => {

    const { email, password } = req.body;
    if (!email || !password) {
        return res.json({ status: false, message: 'missing details' });
    }
    try {
        // console.log("Request received at login route");


        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: 'invalid email' });
        }
        const isMatched = await bcrypt.compare(password,user.Password);
        if (isMatched) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            return res.json({ success: 'true', message: 'user logged in succesfully' });
        }
        else {


            return res.json({ success: 'false', message: 'Invalid password' });
        }

    }
    catch (err) {
        return res.json({ success: false, message: err.message });
    }

}

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',

        })

        return res.json({success:true,message:"logged out"})
    }
    catch (err) {
        return res.json({ success: false, message: err.message });
    }


}


export const validate=(req,res)=>{
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: 'No token' });
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return res.status(200).json({ authenticated: true });
    } catch {
      return res.status(403).json({ message: 'Invalid token' });
    }

}

export const initMissingFields = async (req, res) => {
    try {
        const result = await User.updateMany(
            {},
            {
                $set: {
                    verifyOtp: '',
                    verifyOtpExpireAt: 0,
                    isAccountVerified: false,
                    resetOtp: '',
                    resetOtpExpireAt: 0
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: `Fields initialized for ${result.modifiedCount} users.`
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
