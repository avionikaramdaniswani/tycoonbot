import { useEffect, useState } from 'react'
import { connectSocket } from '../api/socket.js'
import { botApi } from '../api/client.js'

const INITIAL = {
  status: 'stopped',
  connected: false,
  user: null,
  commandCount: 0,
  startTime: null
}

/** Hook pusat: kelola koneksi socket + state bot + daftar aksi. */
export function useBotState() {
  const [state, setState] = useState(INITIAL)
  const [qr, setQr] = useState(null)
  const [pairingCode, setPairingCode] = useState(null)
  const [logs, setLogs] = useState([])
  const [socketReady, setSocketReady] = useState(false)

  useEffect(() => {
    const socket = connectSocket()

    socket.on('connect', () => setSocketReady(true))
    socket.on('disconnect', () => setSocketReady(false))

    socket.on('status', (s) => {
      setState(s)
      if (['connected', 'stopped', 'logged_out'].includes(s.status)) {
        setQr(null)
        setPairingCode(null)
      }
    })
    socket.on('qr', (q) => {
      setQr(q)
      setPairingCode(null)
    })
    socket.on('pairing', (c) => {
      setPairingCode(c)
      setQr(null)
    })
    socket.on('log', (entry) => setLogs((prev) => [...prev.slice(-299), entry]))
    socket.on('log:history', (hist) => setLogs(Array.isArray(hist) ? hist : []))

    botApi.status().then(setState).catch(() => {})

    return () => socket.disconnect()
  }, [])

  const actions = {
    start: () => botApi.start({ usePairing: false }),
    stop: () => botApi.stop(),
    restart: () => botApi.restart(),
    logout: () => botApi.logout(),
    pairing: (number) => botApi.pairing(number)
  }

  return { state, qr, pairingCode, logs, socketReady, actions }
}
