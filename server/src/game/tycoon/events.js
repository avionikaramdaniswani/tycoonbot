// Sistem event: krisis pasif (perlu .ty repair) + choice A/B (efek sekali jalan).
// RNG hanya dipakai di sini; kurva populasi/income tetap deterministik.
import { EVENTS_CFG, CRISES, CHOICES } from './config.js'
import { HOUR, clamp } from './engine.js'

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Terapkan satu opsi choice (kas + mood approval sementara).
function applyChoice(p, choice) {
  const kas = choice.kas || 0
  p.kas = Math.max(0, p.kas + kas)
  if (choice.approval) p.mood = clamp((p.mood || 0) + choice.approval, -30, 30)
  return { optLabel: choice.label, kas, approval: choice.approval || 0 }
}

function spawnCrisis(p, now) {
  const c = pick(CRISES)
  p.event = {
    type: 'crisis',
    id: c.id,
    label: c.label,
    desc: c.desc,
    incomeMult: c.incomeMult,
    approvalDelta: c.approvalDelta,
    repair: c.repair,
    at: now
  }
  p.lastEventAt = now
  return p.event
}

function spawnChoice(p, now) {
  const c = pick(CHOICES)
  p.event = {
    type: 'choice',
    id: c.id,
    label: c.label,
    desc: c.desc,
    a: c.a,
    b: c.b,
    at: now
  }
  p.lastEventAt = now
  return p.event
}

// Coba munculkan event. Dipanggil tiap interaksi (dashboard/collect/build).
// Kembalikan event baru bila muncul, atau null.
export function maybeSpawnEvent(p, now = Date.now()) {
  // Ada event aktif: cek kedaluwarsa choice, jangan tumpuk.
  if (p.event) {
    if (p.event.type === 'choice' && (now - p.event.at) / HOUR >= EVENTS_CFG.choiceExpiryH) {
      applyChoice(p, p.event.b) // default aman
      p.event = null
      p.lastEventAt = now
    }
    return null
  }
  const sinceH = (now - (p.lastEventAt || 0)) / HOUR
  if (sinceH < EVENTS_CFG.cooldownH) return null
  // Peluang kumulatif: makin lama sejak boleh muncul, makin besar.
  const eligibleH = sinceH - EVENTS_CFG.cooldownH
  const chance = 1 - Math.pow(1 - EVENTS_CFG.ratePerH, eligibleH)
  if (Math.random() > chance) return null
  return Math.random() < 0.5 ? spawnCrisis(p, now) : spawnChoice(p, now)
}

// Bereskan krisis aktif.
export function repair(p) {
  if (!p.event || p.event.type !== 'crisis') return { ok: false, msg: 'Tidak ada krisis yang perlu dibereskan.' }
  const cost = p.event.repair
  if (p.kas < cost) return { ok: false, msg: `Kas kurang. Perbaikan butuh ${cost}, kamu punya ${p.kas}.` }
  p.kas -= cost
  const label = p.event.label
  p.event = null
  return { ok: true, cost, label }
}

// Pilih opsi choice (a/b).
export function resolveChoice(p, opt, now = Date.now()) {
  if (!p.event || p.event.type !== 'choice') return { ok: false, msg: 'Tidak ada pilihan yang menunggu keputusan.' }
  const k = String(opt || '').toLowerCase()
  if (k !== 'a' && k !== 'b') return { ok: false, msg: 'Pilih a atau b. Contoh: .ty event a' }
  const eventLabel = p.event.label
  const res = applyChoice(p, p.event[k])
  p.event = null
  p.lastEventAt = now
  return { ok: true, eventLabel, ...res }
}
