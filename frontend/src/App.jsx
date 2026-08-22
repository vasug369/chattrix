import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import Aurora from './components/ui/Aurora';
import NavBar from './components/NavBar';
import Footer from './components/ui/Footer';
import ProtectedRoute from './components/ProtectedRoutes';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CreatePost from './components/CreatePost';
import Profile from './components/Profile';
import Messages from './components/Messages';
import VerifyEmail from './components/VerifyEmail';
import ForgotPassword from './components/ForgotPassword';
import Sessions from './components/Sessions';
import SearchPeople from './components/SearchPeople';

/** Protected pages share the nav bar; the auth pages deliberately do not. */
const Shell = ({ children }) => (
  <ProtectedRoute>
    {/* A column with a growing middle: on a short page the footer is pushed
        to the bottom of the viewport, on a long one it is pushed below the
        fold. Fixed positioning would have covered content on every scroll. */}
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <Footer />
    </div>
  </ProtectedRoute>
);

function App() {
  return (
    <Router>
      {/* Rendered once outside <Routes> so the drift animation survives
          navigation instead of restarting on every page change. */}
      <Aurora />

      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/dashboard" element={<Shell><Dashboard /></Shell>} />
            <Route path="/search" element={<Shell><SearchPeople /></Shell>} />
            <Route path="/create-post" element={<Shell><CreatePost /></Shell>} />
            <Route path="/profile" element={<Shell><Profile /></Shell>} />
            <Route path="/profile/:userId" element={<Shell><Profile /></Shell>} />
            <Route path="/messages" element={<Shell><Messages /></Shell>} />
            <Route path="/sessions" element={<Shell><Sessions /></Shell>} />

            <Route
              path="*"
              element={
                <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
                  <h1 className="text-6xl font-bold gl-gradient-text">404</h1>
                  <p style={{ color: 'var(--text-dim)' }}>This page doesn&apos;t exist.</p>
                  <a href="/dashboard" className="gl-btn mt-2">Back to the feed</a>
                </div>
              }
            />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
