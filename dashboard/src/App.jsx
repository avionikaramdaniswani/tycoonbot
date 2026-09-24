import { useState, useEffect } from 'react'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
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
  return (
    <Dashboard
      onLogout={() => {
        clearToken()
        setAuthed(false)
      }}
    />
  )
}
