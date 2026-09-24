import { NavLink } from 'react-router-dom'

const NAV = [
  {
    to: '/',
    label: 'Dashboard',
    end: true,
    icon: (
      <path d="M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h8v8H3v-8zm10 3h8v5h-8v-5z" />
    )
  },
  {
    to: '/tycoon',
    label: 'Tycoon',
    icon: (
      <path d="M3 21h18M5 21V7l6-4 6 4v14M9 9h2m-2 4h2m4-4h2m-2 4h2M9 21v-4h6v4" />
    )
  }
]

const STATUS_META = {
  connected: { dot: 'bg-emerald-500', text: 'Terhubung' },
  connecting: { dot: 'bg-amber-500 animate-pulse', text: 'Menghubungkan' },
  reconnecting: { dot: 'bg-amber-500 animate-pulse', text: 'Reconnect' },
  qr: { dot: 'bg-sky-500 animate-pulse', text: 'Menunggu QR' },
  pairing: { dot: 'bg-sky-500 animate-pulse', text: 'Pairing' },
  logged_out: { dot: 'bg-rose-500', text: 'Logout' },
  stopped: { dot: 'bg-slate-500', text: 'Mati' }
}

export default function Sidebar({ open, onClose, status, socketReady, onLogout }) {
  const meta = STATUS_META[status] || STATUS_META.stopped

  return (
    <>
      {/* Overlay untuk mobile */}
      <div
        className={`fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 grid place-items-center font-bold text-white">
            BT
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-slate-100">Bot Terbaru</div>
            <div className="text-xs text-slate-500">Panel Kontrol</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-600/15 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`
              }
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon}
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2 px-2 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
            <span>Bot: {meta.text}</span>
            {!socketReady && <span className="text-slate-600">· offline</span>}
          </div>
          <button
            onClick={onLogout}
            className="w-full py-2 rounded-lg text-sm text-slate-300 border border-slate-700 hover:bg-slate-800 transition"
          >
            Keluar
          </button>
        </div>
      </aside>
    </>
  )
}
