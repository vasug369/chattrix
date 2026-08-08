import mongoose from 'mongoose';
import { ZodError } from 'zod';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Single place that turns a thrown error into an HTTP response.
 *
 * Handlers no longer echo `error.message` back to the client, which used to
 * leak Mongoose internals ("Error fetching user: Cast to ObjectId failed for
 * value ... at path _id") straight into the API surface.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err instanceof ZodError) {
    statusCode = 422;
    message = 'Validation failed';
    details = {
      fields: Object.fromEntries(err.issues.map((i) => [i.path.join('.') || '_', i.message])),
    };
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    message = 'Validation failed';
    details = {
      fields: Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message])),
    };
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = 'Malformed identifier';
    details = undefined;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'field';
    message = `That ${field} is already in use`;
    details = undefined;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 5MB)' : 'File upload failed';
  }

  // Unexpected failures get logged in full but reported generically.
  if (!(err instanceof AppError) && statusCode >= 500) {
    if (!env.isTest) console.error('[unhandled]', err);
    message = 'Internal server error';
    details = undefined;
  }

  const body = { success: false, message };
  if (details) body.details = details;
  if (!env.isProduction && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
};

export default errorHandler;
