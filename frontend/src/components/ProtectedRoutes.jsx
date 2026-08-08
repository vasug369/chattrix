import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="gl-spinner" style={{ width: 32, height: 32 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Checking your session…
          </p>
        </div>
      </div>
    );
  }

  // `state` lets the login page send the user back where they were headed.
  if (!isAuthenticated) return <Navigate to="/" replace state={{ from: location.pathname }} />;

  return children;
}
