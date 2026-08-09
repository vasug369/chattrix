import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Past this, "Checking your session…" stops being true — the check itself takes
// well under a second warm, so anything longer is the instance booting.
const COLD_START_HINT_MS = 3000;

/**
 * Gate for authenticated pages.
 *
 * Every protected route in App.jsx was commented out, so /dashboard,
 * /profile, /messages and /create-post all rendered for signed-out visitors
 * — as empty, error-filled shells once their API calls 401'd.
 *
 * Auth state comes from AuthContext rather than a per-component fetch, so
 * navigating between protected pages no longer re-probes the session.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!isLoading) return undefined;
    const timer = setTimeout(() => setSlow(true), COLD_START_HINT_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Unlike the login page, this one genuinely has to wait: guessing would
  // either flash private chrome at a signed-out visitor or bounce a signed-in
  // one to login on every reload.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <div className="gl-spinner" style={{ width: 32, height: 32 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {slow ? 'Waking up the server — this can take a moment on the free tier.' : 'Checking your session…'}
          </p>
        </div>
      </div>
    );
  }

  // `state` lets the login page send the user back where they were headed.
  if (!isAuthenticated) return <Navigate to="/" replace state={{ from: location.pathname }} />;

  return children;
}
