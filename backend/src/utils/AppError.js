/**
 * Operational error with an HTTP status attached.
 *
 * Services throw these instead of wrapping every failure in a generic
 * `new Error('Error doing X: ' + err.message)`, which previously turned every
 * "not found" and "forbidden" into an indistinguishable 500.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    if (details) this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (msg = 'Bad request', details) => new AppError(msg, 400, details);
export const unauthorized = (msg = 'Unauthorized') => new AppError(msg, 401);
export const forbidden = (msg = 'Forbidden') => new AppError(msg, 403);
export const notFound = (msg = 'Not found') => new AppError(msg, 404);
export const conflict = (msg = 'Conflict') => new AppError(msg, 409);
export const tooManyRequests = (msg = 'Too many requests') => new AppError(msg, 429);

export default AppError;
