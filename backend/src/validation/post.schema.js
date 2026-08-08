import { z } from 'zod';
import { objectId, paginationQuery } from './common.js';

const title = z.string().trim().min(3, 'Title must be at least 3 characters').max(120, 'Title must be at most 120 characters');
const content = z.string().trim().min(1, 'Content is required').max(5000, 'Content must be at most 5000 characters');

export const createPostSchema = {
  // `author` and `pic` are set server-side from the session and the upload —
  // accepting them from the body would let a caller post as somebody else.
  body: z.object({
    title,
    content,
  }),
};

export const updatePostSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      title: title.optional(),
      content: content.optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: 'Provide at least one field to update',
    }),
};

export const postIdParamSchema = {
  params: z.object({ id: objectId }),
};

export const postIdBodyParamSchema = {
  params: z.object({ postId: objectId }),
};

export const commentSchema = {
  params: z.object({ postId: objectId }),
  body: z.object({
    content: z.string().trim().min(1, 'Comment cannot be empty').max(1000, 'Comment must be at most 1000 characters'),
  }),
};

export const searchPostsSchema = {
  query: paginationQuery.extend({
    q: z.string().trim().min(1, 'Search query is required').max(100, 'Search query is too long'),
  }),
};

export const listPostsSchema = {
  query: paginationQuery,
};

export const userPostsSchema = {
  params: z.object({ userId: objectId }),
  query: paginationQuery,
};
