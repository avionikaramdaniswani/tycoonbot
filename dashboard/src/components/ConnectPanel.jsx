import { useState } from 'react'

export default function ConnectPanel({ state, qr, pairingCode, actions }) {
  const [tab, setTab] = useState('qr')
  const [number, setNumber] = useState('')
  const [busy, setBusy] = useState(false)

  if (state.connected) {
    return (
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[280px] text-center">
        <div className="text-5xl mb-3">✅</div>
        <p className="text-emerald-300 font-medium">WhatsApp terhubung</p>
        <p className="text-sm text-slate-400 mt-1">
          {state.user?.name || state.user?.id?.split(':')[0]}
        </p>
      </div>
    )
  }

  async function requestPairing() {
    if (number.replace(/\D/g, '').length < 8) return alert('Masukkan nomor yang valid (mis. 628xxx)')
    setBusy(true)
    try {
      await actions.pairing(number)
    } catch (e) {
      alert(e.response?.data?.error || e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
      <div className="flex gap-2 mb-4">
        <Tab active={tab === 'qr'} onClick={() => setTab('qr')}>QR Code</Tab>
        <Tab active={tab === 'pairing'} onClick={() => setTab('pairing')}>Pairing Code</Tab>
      </div>

      {tab === 'qr' ? (
        <div className="flex flex-col items-center justify-center min-h-[240px]">
          {qr ? (
            <>
              <img src={qr} alt="QR" className="w-56 h-56 rounded-lg bg-white p-2" />
              <p className="text-sm text-slate-400 mt-3 text-center">
                WhatsApp → Perangkat Tertaut → Tautkan perangkat
              </p>
            </>
          ) : (
            <p className="text-slate-400 text-sm text-center px-4">
              Tekan <b className="text-emerald-400">▶ Start</b> untuk memunculkan QR di sini.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[240px] gap-3">
          {pairingCode ? (
            <>
              <p className="text-sm text-slate-400">Masukkan kode ini di WhatsApp:</p>
              <div className="text-3xl font-mono font-bold tracking-widest text-emerald-300 bg-slate-800 px-5 py-3 rounded-xl">
                {pairingCode}
              </div>
              <p className="text-xs text-slate-500 text-center">
                WhatsApp → Perangkat Tertaut → Tautkan dengan nomor telepon
              </p>
            </>
          ) : (
            <div className="w-full max-w-xs">
              <label className="block text-sm text-slate-300 mb-1">Nomor WhatsApp</label>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="628123456789"
                inputMode="numeric"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 outline-none mb-3"
              />
              <button
                onClick={requestPairing}
                disabled={busy}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-medium"
              >
                {busy ? 'Meminta kode…' : 'Minta Pairing Code'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
        active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}
