import express from 'express'; 
import { getProfile } from '../controllers/profileController.js';

const profileRouter = express.Router();

// Controller functions (import your actual controller functions here)

// Route to get user profile
profileRouter.get('/:id', getProfile);

// Route to update user profile
// profileRouter.put('/:userId', updateProfile);

export default profileRouter; 