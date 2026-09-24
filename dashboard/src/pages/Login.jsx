import { useState } from 'react'
import { authApi, setToken } from '../api/client.js'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await authApi.login(username, password)
      setToken(token)
      onLogin()
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-slate-100">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-slate-900/70 border border-slate-800 rounded-2xl p-8 shadow-xl backdrop-blur"
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🤖</div>
          <h1 className="text-xl font-semibold">Bot Terbaru</h1>
          <p className="text-sm text-slate-400">Masuk untuk mengontrol bot</p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-300 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm mb-1 text-slate-300">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none"
          autoFocus
        />

        <label className="block text-sm mb-1 text-slate-300">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-medium transition"
        >
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}
