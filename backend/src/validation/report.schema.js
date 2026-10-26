import { z } from 'zod';
import { REPORT_REASONS, REPORT_STATUSES, REPORT_TARGETS } from '../models/report.model.js';
import { idParam, objectId, paginationQuery } from './common.js';

export const createReportSchema = {
  body: z
    .object({
      targetType: z.enum(REPORT_TARGETS),
      targetId: objectId,
      // Required for comments, which live inside a post.
      postId: objectId.optional(),
      reason: z.enum(REPORT_REASONS),
      details: z.string().trim().max(1000, 'Details must be at most 1000 characters').optional().default(''),
      alsoBlock: z.boolean().optional().default(false),
    })
    .strict('Unknown field in report')
    .refine((v) => v.targetType !== 'comment' || Boolean(v.postId), {
      message: 'postId is required when reporting a comment',
      path: ['postId'],
    }),
};

export const listReportsSchema = {
  query: paginationQuery.extend({
    status: z.enum(REPORT_STATUSES).default('open'),
  }),
};

export const reportIdSchema = { params: idParam };

export const resolveReportSchema = {
  params: idParam,
  body: z
    .object({
      action: z.enum(['remove', 'dismiss']),
      note: z.string().trim().min(3, 'Add a short note (3+ characters)').max(500, 'Note must be at most 500 characters'),
    })
    .strict('Unknown field'),
};

export const suspendUserSchema = {
  params: idParam,
  body: z
    .object({
      // Days of suspension; null means permanent.
      days: z.union([z.literal(1), z.literal(7), z.literal(30), z.null()]),
      reason: z.string().trim().min(3, 'Give a reason (3+ characters)').max(500, 'Reason must be at most 500 characters'),
    })
    .strict('Unknown field'),
};

export const userIdSchema = { params: idParam };

export const listUsersSchema = {
  query: paginationQuery.extend({
    q: z.string().trim().max(100, 'Search query is too long').optional(),
    status: z.enum(['all', 'suspended']).default('all'),
  }),
};

export const listAuditSchema = { query: paginationQuery };
