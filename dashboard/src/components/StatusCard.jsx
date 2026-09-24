import { useEffect, useState } from 'react'

const STATUS_META = {
  stopped: { label: 'Berhenti', color: 'bg-slate-500', text: 'text-slate-300' },
  connecting: { label: 'Menyambung…', color: 'bg-amber-500', text: 'text-amber-300' },
  qr: { label: 'Menunggu Scan QR', color: 'bg-sky-500', text: 'text-sky-300' },
  pairing: { label: 'Menunggu Pairing', color: 'bg-sky-500', text: 'text-sky-300' },
  connected: { label: 'Terhubung', color: 'bg-emerald-500', text: 'text-emerald-300' },
  reconnecting: { label: 'Menyambung ulang…', color: 'bg-amber-500', text: 'text-amber-300' },
  logged_out: { label: 'Logout', color: 'bg-red-500', text: 'text-red-300' }
}

function useUptime(startTime) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!startTime) return
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [startTime])
  if (!startTime) return '—'
  const s = Math.floor((Date.now() - startTime) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m ${s % 60}s`
}

export default function StatusCard({ state, socketReady }) {
  const meta = STATUS_META[state.status] || STATUS_META.stopped
  const uptime = useUptime(state.connected ? state.startTime : null)

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-200">Status Bot</h2>
        <span className={`text-xs ${socketReady ? 'text-emerald-400' : 'text-slate-500'}`}>
          ● {socketReady ? 'realtime aktif' : 'offline'}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <span className={`relative flex h-3 w-3`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${meta.color} opacity-60`} />
          <span className={`relative inline-flex rounded-full h-3 w-3 ${meta.color}`} />
        </span>
        <span className={`text-lg font-medium ${meta.text}`}>{meta.label}</span>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Akun" value={state.user?.name || state.user?.id?.split(':')[0] || '—'} />
        <Stat label="Uptime" value={uptime} />
        <Stat label="Command" value={state.commandCount ?? 0} />
      </dl>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-800/50 rounded-xl py-3 px-2">
      <div className="text-sm font-semibold text-slate-100 truncate">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}
