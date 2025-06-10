import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Login from './components/Login'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoutes'

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

        </Routes>
      </Router>


    </>
  )
}

export default App
