import { fmt, fmtShort } from '../../lib/format.js'

const TILES = [
  { key: 'totalPlayers', label: 'Total Kota', fmt: fmt },
  { key: 'totalPopulation', label: 'Total Populasi', fmt: fmt },
  { key: 'totalKas', label: 'Total Kas', fmt: fmtShort },
  { key: 'totalNetWorth', label: 'Total Kekayaan', fmt: fmtShort },
  { key: 'legends', label: 'Kota Legendaris', fmt: fmt }
]

export default function StatTiles({ overview }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {TILES.map((t) => (
        <div key={t.key} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-semibold text-slate-100">
            {t.fmt(overview[t.key] || 0)}
          </div>
          <div className="text-xs text-slate-400 mt-1">{t.label}</div>
        </div>
      ))}
    </div>
  )
}
