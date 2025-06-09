// ProtectedRoute.js
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null means "loading"

  useEffect(() => {
    axios.get(`${baseURL}/api/auth/validate`, { withCredentials: true })
      .then((res) => {
        setIsAuthenticated(res.data.authenticated); // expects `authenticated: true` from backend
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  if (isAuthenticated === null) return <div>Loading...</div>;

  return isAuthenticated ? children : <Navigate to="/" />;
};

export default ProtectedRoute;
