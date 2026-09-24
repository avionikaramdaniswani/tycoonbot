import { useEffect, useRef } from 'react'

const LEVEL_COLOR = {
  info: 'text-slate-300',
  success: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
  debug: 'text-slate-500'
}

function time(ts) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour12: false })
}

export default function LogViewer({ logs }) {
  const boxRef = useRef(null)
  const bottomRef = useRef(true)

  // Auto-scroll ke bawah kecuali user sedang men-scroll ke atas.
  useEffect(() => {
    const el = boxRef.current
    if (el && bottomRef.current) el.scrollTop = el.scrollHeight
  }, [logs])

  function onScroll() {
    const el = boxRef.current
    if (!el) return
    bottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-200">Log Realtime</h2>
        <span className="text-xs text-slate-500">{logs.length} baris</span>
      </div>
      <div
        ref={boxRef}
        onScroll={onScroll}
        className="thin-scroll flex-1 overflow-y-auto font-mono text-xs bg-slate-950/60 rounded-lg p-3 space-y-1 min-h-[200px] max-h-[420px]"
      >
        {logs.length === 0 ? (
          <p className="text-slate-600">Belum ada log…</p>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-slate-600 shrink-0">{time(l.time)}</span>
              <span className={LEVEL_COLOR[l.level] || 'text-slate-300'}>{l.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
