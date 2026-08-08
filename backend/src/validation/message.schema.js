import { z } from 'zod';
import { objectId, paginationQuery } from './common.js';

export const sendMessageSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    message: z
      .string()
      .trim()
      .min(1, 'Message cannot be empty')
      .max(2000, 'Message must be at most 2000 characters'),
  }),
};

export const getMessagesSchema = {
  params: z.object({ id: objectId }),
  query: paginationQuery,
};

export const notificationListSchema = {
  query: paginationQuery.extend({
    unreadOnly: z
      .union([z.literal('true'), z.literal('false')])
      .default('false')
      .transform((v) => v === 'true'),
  }),
};

export const notificationIdSchema = {
  params: z.object({ id: objectId }),
};
