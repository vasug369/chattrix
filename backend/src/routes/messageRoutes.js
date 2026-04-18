import express from 'express';
import { getMessages, sendMessage, getUsersForSidebar } from '../controllers/messageController.js';

const messageRouter = express.Router();

messageRouter.get('/users', getUsersForSidebar);
messageRouter.get('/:id', getMessages);
messageRouter.post('/send/:id', sendMessage);

export default messageRouter;
