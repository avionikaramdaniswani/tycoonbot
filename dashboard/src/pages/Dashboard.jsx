import { useBotState } from '../hooks/useBotState.js'
import StatusCard from '../components/StatusCard.jsx'
import ControlButtons from '../components/ControlButtons.jsx'
import ConnectPanel from '../components/ConnectPanel.jsx'
import LogViewer from '../components/LogViewer.jsx'

export default function Dashboard({ onLogout }) {
  const { state, qr, pairingCode, logs, socketReady, actions } = useBotState()

  return (
    <div className="min-h-screen text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <h1 className="font-semibold">Bot Terbaru — Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-5">
          <StatusCard state={state} socketReady={socketReady} />
          <ControlButtons state={state} actions={actions} onLogout={onLogout} />
        </div>

        <div className="lg:col-span-1">
          <ConnectPanel state={state} qr={qr} pairingCode={pairingCode} actions={actions} />
        </div>

        <div className="lg:col-span-1">
          <LogViewer logs={logs} />
        </div>
      </main>
    </div>
  )
}
