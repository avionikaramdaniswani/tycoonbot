// Bar progres/cakupan sederhana. ratio 0..1.
export default function Bar({ ratio, colorClass = 'bg-emerald-500', height = 'h-2' }) {
  const pct = Math.max(0, Math.min(1, Number(ratio) || 0)) * 100
  return (
    <div className={`w-full ${height} rounded-full bg-slate-800 overflow-hidden`}>
      <div
        className={`h-full ${colorClass} rounded-full transition-all`}
        style={{ width: pct + '%' }}
      />
    </div>
  )
}

// Warna berdasarkan cakupan layanan (1 = tercukupi).
export function coverageColor(ratio) {
  if (ratio >= 1) return 'bg-emerald-500'
  if (ratio >= 0.6) return 'bg-amber-500'
  return 'bg-rose-500'
}

// Warna approval (0..100).
export function approvalColor(v) {
  if (v >= 60) return 'bg-emerald-500'
  if (v >= 40) return 'bg-amber-500'
  return 'bg-rose-500'
}
