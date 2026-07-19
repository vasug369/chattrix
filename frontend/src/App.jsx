import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import VerifyEmail from './components/VerifyEmail';
import Dashboard from './components/Dashboard';
import CreatePost from './components/CreatePost';
import Profile from './components/Profile';
import Messages from './components/Messages';
import Search from './components/Search';
import Notifications from './components/Notifications';
import Settings from './components/Settings';
import NotFound from './components/NotFound';
import ProtectedRoute from './components/ProtectedRoutes';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path='/' element={<Login />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />

            <Route path='/verify-email' element={<ProtectedRoute><VerifyEmail /></ProtectedRoute>} />
            <Route path='/dashboard' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path='/create-post' element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
            <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path='/profile/:userId' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path='/messages' element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path='/search' element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path='/notifications' element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path='/settings' element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            <Route path='*' element={<NotFound />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
