import { z } from 'zod';
import { name, objectId, paginationQuery } from './common.js';

export const userIdParamSchema = {
  params: z.object({ id: objectId }),
};

export const followParamSchema = {
  params: z.object({ followUserId: objectId }),
};

export const unfollowParamSchema = {
  params: z.object({ unfollowUserId: objectId }),
};

/**
 * Deliberately narrow. The previous handler passed `req.body` straight into
 * findByIdAndUpdate, so a caller could set `password`, `followers`, or
 * `isAccountVerified` on any account. Only these three fields are editable.
 */
export const updateProfileSchema = {
  body: z
    .object({
      name: name.optional(),
      bio: z.string().trim().max(160, 'Bio must be at most 160 characters').optional(),
      // `pic` is deliberately absent. It used to be a free-text URL, which let
      // anyone point their avatar at an arbitrary host — a tracking pixel, or
      // an image that could be swapped for something else after the fact.
      // Photos now arrive only through POST /user/me/avatar, so every uploaded
      // avatar is a file we hold. (Google sign-in still sets it once, to
      // Google's own CDN, at account creation.)
    })
    .strict('Unknown field in profile update')
    .refine((v) => Object.keys(v).length > 0, {
      message: 'Provide at least one field to update',
    }),
};

export const searchUsersSchema = {
  query: paginationQuery.extend({
    q: z.string().trim().min(1, 'Search query is required').max(100, 'Search query is too long'),
  }),
};

export const listUsersSchema = {
  query: paginationQuery,
};
