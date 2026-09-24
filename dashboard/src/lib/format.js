// Util format angka ala Indonesia untuk tampilan dashboard.
const idn = new Intl.NumberFormat('id-ID')

export function fmt(n) {
  return idn.format(Math.round(Number(n) || 0))
}

// Ringkas angka besar: 12.5rb, 3.4jt, 1.2M (miliar).
export function fmtShort(n) {
  const v = Number(n) || 0
  const abs = Math.abs(v)
  if (abs >= 1e9) return (v / 1e9).toFixed(1).replace('.0', '') + 'M'
  if (abs >= 1e6) return (v / 1e6).toFixed(1).replace('.0', '') + 'jt'
  if (abs >= 1e3) return (v / 1e3).toFixed(1).replace('.0', '') + 'rb'
  return fmt(v)
}

export function fmtPct(ratio) {
  return Math.round((Number(ratio) || 0) * 100) + '%'
}

export function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
