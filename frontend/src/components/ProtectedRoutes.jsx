import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoadingScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="glass px-6 py-4 text-sm animate-fade-in" style={{ color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    </div>
  );
}

const ProtectedRoute = ({ children }) => {
  const { status } = useAuth();

  if (status === 'loading') return <LoadingScreen />;

  return status === 'authenticated' ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
