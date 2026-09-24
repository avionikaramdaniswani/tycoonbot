import { useState } from 'react'

export default function ControlButtons({ state, actions, onLogout }) {
  const [busy, setBusy] = useState(null)
  const running = ['connecting', 'qr', 'pairing', 'connected', 'reconnecting'].includes(
    state.status
  )

  async function run(name, fn) {
    setBusy(name)
    try {
      await fn()
    } catch (e) {
      alert(e.response?.data?.error || e.message || 'Aksi gagal')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
      <h2 className="font-semibold text-slate-200 mb-4">Kontrol</h2>
      <div className="grid grid-cols-2 gap-3">
        <Btn
          disabled={running || busy}
          loading={busy === 'start'}
          className="bg-emerald-600 hover:bg-emerald-500"
          onClick={() => run('start', actions.start)}
        >
          ▶ Start
        </Btn>
        <Btn
          disabled={!running || busy}
          loading={busy === 'stop'}
          className="bg-red-600 hover:bg-red-500"
          onClick={() => run('stop', actions.stop)}
        >
          ⏹ Stop
        </Btn>
        <Btn
          disabled={!running || busy}
          loading={busy === 'restart'}
          className="bg-amber-600 hover:bg-amber-500"
          onClick={() => run('restart', actions.restart)}
        >
          🔄 Restart
        </Btn>
        <Btn
          disabled={busy}
          loading={busy === 'logout'}
          className="bg-slate-700 hover:bg-slate-600"
          onClick={() => {
            if (confirm('Logout akan menghapus sesi WhatsApp. Lanjutkan?')) {
              run('logout', actions.logout)
            }
          }}
        >
          🚪 Logout WA
        </Btn>
      </div>

      <button
        onClick={onLogout}
        className="mt-4 w-full text-sm text-slate-400 hover:text-slate-200 transition"
      >
        Keluar dari dashboard
      </button>
    </div>
  )
}

function Btn({ children, className, disabled, loading, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`py-2.5 rounded-lg font-medium text-white transition disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? '…' : children}
    </button>
  )
}
