import env, { normalizeOrigin } from '../config/env.js';
import { forbidden } from '../utils/AppError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Reject state-changing requests sent by a browser from a page that is not ours.
 *
 * CORS alone does not stop CSRF: a plain HTML form (urlencoded or multipart)
 * posts cross-site without a preflight, the browser attaches the session
 * cookie, and the server acts before CORS hides the response. Browsers always
 * send `Origin` on such requests, so an origin outside the allow-list is
 * refused here. Requests without `Origin` come from non-browser clients, which
 * carry no ambient cookies to abuse, and pass through.
 *
 * Works alongside SameSite=Lax session cookies, which stop cross-site
 * requests from carrying the session in the first place.
 */
export const originCheck = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (!origin) return next();

  if (!env.corsOrigins.includes(normalizeOrigin(origin))) {
    return next(forbidden('Request origin not allowed'));
  }
  return next();
};

export default originCheck;
