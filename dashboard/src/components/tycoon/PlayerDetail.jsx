import { useEffect, useState } from 'react'
import { tycoonApi } from '../../api/client.js'
import { fmt, fmtShort, fmtPct, fmtDate } from '../../lib/format.js'
import Bar, { coverageColor, approvalColor } from './Bar.jsx'

export default function PlayerDetail({ jid, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    tycoonApi
      .player(jid)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.response?.data?.error || 'Gagal memuat data'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [jid])

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-slate-950 border-l border-slate-800 overflow-y-auto thin-scroll">
        <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-100">Detail Kota</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-800"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-5">
          {loading && <p className="text-slate-400 text-sm">Memuat…</p>}
          {error && <p className="text-rose-300 text-sm">{error}</p>}
          {data && !loading && <Body d={data} />}
        </div>
      </aside>
    </>
  )
}
function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, value, valueClass = 'text-slate-100' }) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2">
      <div className={`text-sm font-semibold ${valueClass}`}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

function Body({ d }) {
  return (
    <>
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-semibold text-slate-100">{d.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-600/20 text-sky-300">
            {d.tierLabel}
          </span>
          {d.legend && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              Legendaris
            </span>
          )}
        </div>
        {d.number && <div className="text-xs text-slate-500 mt-1">{d.number}</div>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Kas" value={fmt(d.kas)} valueClass="text-emerald-300" />
        <Field label="Kekayaan (netWorth)" value={fmt(d.netWorth)} />
        <Field label="Populasi" value={`${fmt(d.population)} / ${fmt(d.popCapacity)}`} />
        <Field label="Pajak" value={`${d.taxRate}%`} />
      </div>

      <Section title="Approval">
        <div className="flex items-center gap-3">
          <Bar ratio={d.approval / 100} colorClass={approvalColor(d.approval)} />
          <span className="text-sm text-slate-200 w-10 text-right">{d.approval}%</span>
        </div>
      </Section>

      <Section title="Income / jam-game">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Kotor" value={fmt(d.income.gross)} />
          <Field label="Upkeep" value={`-${fmt(d.income.upkeep)}`} valueClass="text-rose-300" />
          <Field
            label="Bersih"
            value={fmt(d.income.net)}
            valueClass={d.income.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}
          />
        </div>
        <div className="text-[11px] text-slate-500 mt-1.5">
          Gudang menampung income hingga {d.storageHours} jam-game (~
          {Math.round(d.storageHours * (d.realMinPerHour || 2))} menit nyata). 1 jam game ≈{' '}
          {Number((d.realMinPerHour || 2).toFixed(1))} menit nyata.
        </div>
      </Section>
      <Section title="Infrastruktur">
        <div className="grid grid-cols-3 gap-2">
          <Field
            label="Listrik"
            value={d.power.deficit ? 'Defisit' : `+${fmt(d.power.surplus)}`}
            valueClass={d.power.deficit ? 'text-rose-300' : 'text-emerald-300'}
          />
          <Field label="Polusi" value={fmt(d.pollution)} />
          <Field
            label="Kemacetan"
            value={d.traffic.over > 0 ? `-${fmtPct(d.traffic.incomePenalty)}` : 'Lancar'}
            valueClass={d.traffic.over > 0 ? 'text-amber-300' : 'text-emerald-300'}
          />
        </div>
      </Section>

      <Section title="Cakupan Layanan">
        <div className="space-y-2">
          {d.services.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-24 shrink-0">{s.label}</span>
              <Bar ratio={s.coverage} colorClass={coverageColor(s.coverage)} />
              <span className="text-xs text-slate-300 w-10 text-right">{fmtPct(s.coverage)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Bangunan (${fmt(d.totalBuildings)} unit)`}>
        {d.buildings.length ? (
          <div className="grid grid-cols-2 gap-2">
            {d.buildings.map((b) => (
              <div
                key={b.key}
                className="flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-lg px-3 py-1.5"
              >
                <span className="text-xs text-slate-300 truncate">{b.label}</span>
                <span className="text-xs text-slate-400 shrink-0 ml-2">
                  ×{b.count}
                  {b.level > 1 && <span className="text-emerald-400"> Lv{b.level}</span>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Belum ada bangunan.</p>
        )}
      </Section>

      <Section title={`Megaproyek (${d.landmarksDone}/${d.landmarks.length} selesai)`}>
        <div className="space-y-2">
          {d.landmarks.map((lm) => (
            <div key={lm.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">{lm.label}</span>
                <span className={lm.done ? 'text-emerald-400' : 'text-slate-500'}>
                  {lm.done ? 'Selesai' : `${fmtShort(lm.funded)}/${fmtShort(lm.cost)}`}
                </span>
              </div>
              <Bar ratio={lm.progress} colorClass={lm.done ? 'bg-emerald-500' : 'bg-sky-500'} height="h-1.5" />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Naik Tier">
        {d.nextTier ? (
          <div className="text-sm text-slate-300">
            <div className="mb-1">
              Menuju <span className="text-sky-300 font-medium">{d.nextTier.label}</span>
            </div>
            {d.nextTier.missing.length ? (
              <ul className="text-xs text-slate-400 list-disc list-inside space-y-0.5">
                {d.nextTier.missing.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-400">Semua syarat terpenuhi.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-emerald-400">Sudah di tier tertinggi.</p>
        )}
      </Section>

      {d.event && (
        <Section title="Event Aktif">
          <div className="bg-amber-950/40 border border-amber-900/50 rounded-xl px-3 py-2">
            <div className="text-sm text-amber-200">{d.event.label}</div>
            {d.event.desc && <div className="text-xs text-amber-300/70 mt-0.5">{d.event.desc}</div>}
          </div>
        </Section>
      )}

      <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-800">
        Streak {d.streak} hari · {d.achievements} pencapaian · update {fmtDate(d.updatedAt)}
      </div>
    </>
  )
}
