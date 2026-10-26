import express from 'express';
import { getMessages, sendMessage, getUsersForSidebar } from '../controllers/messageController.js';
import { writeLimiter } from '../middlewares/rateLimiters.js';
import { validate } from '../middlewares/validate.js';
import { getMessagesSchema, sendMessageSchema } from '../validation/message.schema.js';

const messageRouter = express.Router();

messageRouter.get('/users', getUsersForSidebar);
messageRouter.get('/:id', validate(getMessagesSchema), getMessages);
messageRouter.post('/send/:id', writeLimiter, validate(sendMessageSchema), sendMessage);

export default messageRouter;
