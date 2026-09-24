import { useState } from 'react'

// Dialog konfirmasi reset — wajib ketik "RESET" biar nggak kepencet nggak sengaja.
export default function ResetDialog({ totalPlayers, onCancel, onConfirm }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const armed = text.trim() === 'RESET'

  async function confirm() {
    if (!armed) return
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Reset gagal')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={busy ? undefined : onCancel} />
      <div className="relative w-full max-w-md bg-slate-900 border border-rose-900/60 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-rose-300">Reset Semua Data Tycoon</h2>
        <p className="text-sm text-slate-400 mt-2">
          Ini akan <span className="text-rose-300 font-medium">menghapus permanen</span> data{' '}
          <span className="text-slate-200">{totalPlayers}</span> pemain (kas, bangunan, tier,
          landmark, semuanya). Tindakan ini <span className="text-rose-300">tidak bisa dibatalkan</span>.
        </p>

        <label className="block text-xs text-slate-400 mt-4 mb-1">
          Ketik <span className="font-mono text-rose-300">RESET</span> untuk mengonfirmasi:
        </label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          autoFocus
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-rose-500 outline-none font-mono"
        />

        {error && <p className="text-sm text-rose-300 mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2 rounded-lg text-sm text-slate-300 border border-slate-700 hover:bg-slate-800 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={confirm}
            disabled={!armed || busy}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Menghapus…' : 'Reset Sekarang'}
          </button>
        </div>
      </div>
    </div>
  )
}
