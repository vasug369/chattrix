import express from 'express';
import { getProfile } from '../controllers/profileController.js';
import { validate } from '../middlewares/validate.js';
import { userIdParamSchema } from '../validation/user.schema.js';

const profileRouter = express.Router();

profileRouter.get('/:id', validate(userIdParamSchema), getProfile);

export default profileRouter;
