import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tycoon from './pages/Tycoon.jsx'
import { getToken, clearToken } from './api/client.js'

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()))

  useEffect(() => {
    const onUnauth = () => {
      clearToken()
      setAuthed(false)
    }
    window.addEventListener('bt:unauthorized', onUnauth)
    return () => window.removeEventListener('bt:unauthorized', onUnauth)
  }, [])

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  const logout = () => {
    clearToken()
    setAuthed(false)
  }

  return (
    <Routes>
      <Route element={<AppLayout onLogout={logout} />}>
        <Route index element={<Dashboard />} />
        <Route path="tycoon" element={<Tycoon />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
