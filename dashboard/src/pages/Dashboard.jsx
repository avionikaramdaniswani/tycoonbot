import { useOutletContext } from 'react-router-dom'
import StatusCard from '../components/StatusCard.jsx'
import ControlButtons from '../components/ControlButtons.jsx'
import ConnectPanel from '../components/ConnectPanel.jsx'
import LogViewer from '../components/LogViewer.jsx'

export default function Dashboard() {
  const { state, qr, pairingCode, logs, socketReady, actions } = useOutletContext()

  return (
    <div className="max-w-6xl mx-auto grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-5">
        <StatusCard state={state} socketReady={socketReady} />
        <ControlButtons state={state} actions={actions} />
      </div>

      <div className="lg:col-span-1">
        <ConnectPanel state={state} qr={qr} pairingCode={pairingCode} actions={actions} />
      </div>

      <div className="lg:col-span-1">
        <LogViewer logs={logs} />
      </div>
    </div>
  )
}
