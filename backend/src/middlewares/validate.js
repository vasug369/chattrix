import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Validate `body` / `params` / `query` against a Zod schema bundle and replace
 * each section with the parsed result.
 *
 * Replacing (not merely checking) is the point: downstream handlers then work
 * with coerced, trimmed, whitelisted data, so an unexpected extra field cannot
 * reach a Mongoose update.
 *
 * @param {{body?: import('zod').ZodTypeAny, params?: ..., query?: ...}} schema
 */
export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) req.body = schema.body.parse(req.body ?? {});
    if (schema.params) req.params = schema.params.parse(req.params ?? {});
    if (schema.query) {
      // Express 5 exposes req.query via a getter with no setter, so assigning
      // to it throws. Parsed values go on req.validatedQuery instead.
      req.validatedQuery = schema.query.parse(req.query ?? {});
    }
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      const fields = {};
      for (const issue of err.issues) {
        const key = issue.path.join('.') || '_';
        if (!fields[key]) fields[key] = issue.message;
      }
      return next(new AppError('Validation failed', 422, { fields }));
    }
    return next(err);
  }
};

export default validate;
