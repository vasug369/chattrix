import { createReportService } from '../services/reportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createReport = asyncHandler(async (req, res) => {
    const report = await createReportService(req.user._id, req.body);
    res.status(201).json({
        success: true,
        message: 'Thanks. Our moderators review reports within 24 hours.',
        data: { _id: report._id, status: report.status },
    });
});
