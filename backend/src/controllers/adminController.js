import {
    getReportService,
    listAuditService,
    listReportsService,
    listUsersService,
    resolveReportService,
    suspendUserService,
    unsuspendUserService,
} from '../services/moderationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listReports = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, ...(await listReportsService(req.validatedQuery)) });
});

export const getReport = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await getReportService(req.params.id) });
});

export const resolveReport = asyncHandler(async (req, res) => {
    const data = await resolveReportService(req.user._id, req.params.id, req.body);
    res.status(200).json({ success: true, data });
});

export const listUsers = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, ...(await listUsersService(req.validatedQuery)) });
});

export const suspendUser = asyncHandler(async (req, res) => {
    const data = await suspendUserService(req.user._id, req.params.id, req.body);
    res.status(200).json({ success: true, data });
});

export const unsuspendUser = asyncHandler(async (req, res) => {
    const data = await unsuspendUserService(req.user._id, req.params.id);
    res.status(200).json({ success: true, data });
});

export const listAudit = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, ...(await listAuditService(req.validatedQuery)) });
});
