import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import { useBotState } from '../hooks/useBotState.js'

const TITLES = { '/': 'Dashboard', '/tycoon': 'Tycoon' }

export default function AppLayout({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const bot = useBotState()
  const { pathname } = useLocation()
  const title = TITLES[pathname] || 'Dashboard'

  return (
    <div className="min-h-screen flex text-slate-100 bg-[#0b0f17]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        status={bot.state.status}
        socketReady={bot.socketReady}
        onLogout={onLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 flex items-center gap-3 px-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
          <button
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-800"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <h1 className="font-semibold text-lg">{title}</h1>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <Outlet context={bot} />
        </main>
      </div>
    </div>
  )
}
