import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Login from './components/Login'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoutes'
import CreatePost from './components/CreatePost'
import Profile from './components/Profile'
import Messages from './components/Messages'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Router>
        <Routes>
          <Route path='/' element={<Login />} />

          <Route path='/dashboard' element={
            // <ProtectedRoute>
              <Dashboard />
            // </ProtectedRoute>
          } />

          <Route path='/create-post' element={
            // <ProtectedRoute>
              <CreatePost />
            // </ProtectedRoute>
          } />

          <Route path='/profile' element={
            // <ProtectedRoute>
              <Profile />
            // </ProtectedRoute>
          } />

          <Route path='/messages' element={
            // <ProtectedRoute>
              <Messages />
            // </ProtectedRoute>
          } />
        </Routes>
      </Router>


    </>
  )
}

export default App
