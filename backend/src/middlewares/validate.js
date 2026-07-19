import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 400,
            success: false,
            message: errors.array()[0].msg,
            errors: errors.array(),
        });
    }
    next();
};
