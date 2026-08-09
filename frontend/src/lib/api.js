import axios from 'axios';

/**
 * The single axios instance for the whole app.
 *
 * Components previously each declared their own `baseURL` constant — some
 * pointing at localhost, some hardcoding the Render production URL — so a
 * local build silently talked to production. The base URL now comes from
 * VITE_API_BASE_URL with a localhost default.
 */
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

/**
 * Empty means "same origin": requests go to /api on whatever host is serving
 * the page, and vercel.json forwards them to the API.
 *
 * That indirection exists to keep the auth cookie first-party. Pointing the
 * browser straight at chattrix-2.onrender.com made it a *third-party* cookie —
 * structurally identical to an ad tracker's, and blocked on exactly the same
 * rules. Incognito windows, Safari and every browser on iOS discard it, so
 * POST /auth/login returned 200, the browser silently dropped the Set-Cookie,
 * and the very next /user/me was a 401. Nothing errored anywhere; the
 * credential just never survived the trip.
 */
const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  // Auth is cookie-based, so every request must carry credentials. Still
  // required same-origin: axios omits cookies without it.
  withCredentials: true,
  timeout: 20000,
});

/**
 * Realtime cannot use the proxy: Vercel's rewrites do not carry WebSocket
 * upgrades, so socket.io has to reach the API host directly. Its handshake
 * therefore remains cross-site, and realtime stays unavailable wherever
 * third-party cookies are blocked — see the note in the PR about moving
 * socket auth to a short-lived ticket fetched over HTTP.
 */
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? (BASE_URL || 'http://localhost:3000');

/** Where to send the user when their session turns out to be dead. */
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

/**
 * Normalise error shapes so callers never have to dig through
 * `err.response.data.message` themselves — and never render `[object Object]`
 * because the server replied with a bare string.
 */
export const errorMessage = (err, fallback = 'Something went wrong') => {
  const data = err?.response?.data;
  if (!data) {
    if (err?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
    if (err?.message === 'Network Error') return 'Cannot reach the server. Is it running?';
    return err?.message || fallback;
  }
  if (typeof data === 'string') return data;

  // Validation failures carry per-field messages; surface the first one, since
  // it is far more useful than a generic "Validation failed".
  const fields = data.details?.fields;
  if (fields && typeof fields === 'object') {
    const first = Object.values(fields)[0];
    if (first) return first;
  }
  return data.message || fallback;
};

/** Field-level errors for form rendering, or null. */
export const fieldErrors = (err) => err?.response?.data?.details?.fields ?? null;

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url ?? '';

    // A 401 from the session-check endpoints is expected (it is how we learn
    // the user is logged out) — only redirect on unexpected ones.
    const isAuthProbe = url.includes('/auth/validate') || url.includes('/auth/login');
    if (status === 401 && !isAuthProbe) onUnauthorized();

    return Promise.reject(err);
  }
);

export default api;
