import express from 'express';
import { createReport } from '../controllers/reportController.js';
import { writeLimiter } from '../middlewares/rateLimiters.js';
import { validate } from '../middlewares/validate.js';
import { createReportSchema } from '../validation/report.schema.js';

const reportRouter = express.Router();

// No verified-email requirement: anyone signed in must be able to report abuse.
reportRouter.post('/', writeLimiter, validate(createReportSchema), createReport);

export default reportRouter;
