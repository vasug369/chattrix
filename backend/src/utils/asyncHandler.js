/**
 * Wraps an async route handler so rejected promises reach the error middleware
 * instead of being swallowed (or, worse, leaving the request hanging).
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
