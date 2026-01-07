import { registerUser, loginUser, logoutUser, validateToken } from '../services/auth.service.js';

export const register = async (req, res) => {
    const result = await registerUser(req.body);
    res.status(result.status).json(result);
};

export const login = async (req, res) => {
    console.log(req.headers['content-type']);
    console.log("asdfasdasdasdasdasd");
    const result = await loginUser(req.body, res); // Pass `res` only if cookie needs to be set here
    res.status(result.status).json(result);
};

export const logout = async (req, res) => {
    const result = await logoutUser(res);
    res.status(result.status).json(result);
};

export const validate = async (req, res) => {
    const result = await validateToken(req.cookies.token);
    res.status(result.status).json(result);
};

// export const initMissingFields = async (req, res) => {
//     const result = await initializeFields();
//     res.status(result.status).json(result);
// };
