import { useEffect, useState, useCallback } from 'react'
import { tycoonApi } from '../api/client.js'
import { fmt, fmtShort } from '../lib/format.js'
import StatTiles from '../components/tycoon/StatTiles.jsx'
import PlayerDetail from '../components/tycoon/PlayerDetail.jsx'
import ResetDialog from '../components/tycoon/ResetDialog.jsx'
import Bar, { approvalColor } from '../components/tycoon/Bar.jsx'

export default function Tycoon() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showReset, setShowReset] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    tycoonApi
      .overview()
      .then(setData)
      .catch((e) => setError(e.response?.data?.error || 'Gagal memuat data Tycoon'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleReset() {
    await tycoonApi.reset()
    setShowReset(false)
    setSelected(null)
    load()
  }

  const maxTier = data ? Math.max(1, ...data.tierDist.map((t) => t.count)) : 1

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">Data pemain game City Tycoon (read-only).</p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Memuat…' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowReset(true)}
            disabled={!data}
            className="text-sm px-3 py-1.5 rounded-lg border border-rose-800 text-rose-300 hover:bg-rose-950/50 disabled:opacity-50"
          >
            Reset semua
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-rose-300 bg-rose-950/40 border border-rose-900 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {data && (
        <>
          <StatTiles overview={data} />

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Sebaran Tier</h3>
            <div className="space-y-2">
              {data.tierDist.map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-28 shrink-0">{t.label}</span>
                  <Bar ratio={t.count / maxTier} colorClass="bg-sky-500" />
                  <span className="text-xs text-slate-300 w-8 text-right">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
          {/* PLACEHOLDER_TABLE */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden">
            <h3 className="text-sm font-semibold text-slate-300 px-5 pt-5 pb-3">
              Leaderboard ({fmt(data.totalPlayers)} kota)
            </h3>
            {data.leaderboard.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-y border-slate-800">
                      <th className="px-4 py-2 font-medium">#</th>
                      <th className="px-4 py-2 font-medium">Kota</th>
                      <th className="px-4 py-2 font-medium">Tier</th>
                      <th className="px-4 py-2 font-medium text-right">Populasi</th>
                      <th className="px-4 py-2 font-medium text-right">Kas</th>
                      <th className="px-4 py-2 font-medium text-right">Income/j</th>
                      <th className="px-4 py-2 font-medium text-right">Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.map((p, i) => (
                      <tr
                        key={p.jid}
                        onClick={() => setSelected(p.jid)}
                        className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer"
                      >
                        <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-slate-100">{p.name}</span>
                          {p.legend && <span className="ml-1.5 text-xs text-amber-400">★</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">{p.tierLabel}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300">{fmt(p.population)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-300">{fmtShort(p.kas)}</td>
                        <td
                          className={`px-4 py-2.5 text-right ${
                            p.incomeNet >= 0 ? 'text-slate-300' : 'text-rose-300'
                          }`}
                        >
                          {fmtShort(p.incomeNet)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16">
                              <Bar
                                ratio={p.approval / 100}
                                colorClass={approvalColor(p.approval)}
                                height="h-1.5"
                              />
                            </div>
                            <span className="text-slate-400 w-9 text-right">{p.approval}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 pb-5 text-sm text-slate-500">
                Belum ada pemain. Data muncul setelah ada yang memulai game lewat perintah{' '}
                <code className="text-slate-400">.ty</code> di WhatsApp.
              </p>
            )}
          </div>
        </>
      )}

      {selected && <PlayerDetail jid={selected} onClose={() => setSelected(null)} />}

      {showReset && (
        <ResetDialog
          totalPlayers={data?.totalPlayers || 0}
          onCancel={() => setShowReset(false)}
          onConfirm={handleReset}
        />
      )}
    </div>
  )
}
