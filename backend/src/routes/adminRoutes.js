import express from 'express';
import {
    getReport,
    listAudit,
    listReports,
    listUsers,
    resolveReport,
    suspendUser,
    unsuspendUser,
} from '../controllers/adminController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { writeLimiter } from '../middlewares/rateLimiters.js';
import { validate } from '../middlewares/validate.js';
import {
    listAuditSchema,
    listReportsSchema,
    listUsersSchema,
    reportIdSchema,
    resolveReportSchema,
    suspendUserSchema,
    userIdSchema,
} from '../validation/report.schema.js';

/** Moderation API. Every route is admin-only, checked on the server. */
const adminRouter = express.Router();
adminRouter.use(requireAdmin);

adminRouter.get('/reports', validate(listReportsSchema), listReports);
adminRouter.get('/reports/:id', validate(reportIdSchema), getReport);
adminRouter.post('/reports/:id/resolve', writeLimiter, validate(resolveReportSchema), resolveReport);

adminRouter.get('/users', validate(listUsersSchema), listUsers);
adminRouter.post('/users/:id/suspend', writeLimiter, validate(suspendUserSchema), suspendUser);
adminRouter.post('/users/:id/unsuspend', writeLimiter, validate(userIdSchema), unsuspendUser);

adminRouter.get('/audit', validate(listAuditSchema), listAudit);

export default adminRouter;
