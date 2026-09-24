import { ECONOMY, BUILDINGS, SERVICES, EDU_PER_CAPITA, STORAGE, TIERS, STARTER_BUILDINGS, LANDMARKS, TIME } from './config.js'

const HOUR = 3600000

// Kompresi waktu: 1 jam nyata = TIME.ECON_SCALE jam-game untuk income & populasi,
// TIME.EVENT_SCALE jam-game untuk event. Check-in harian tetap pakai HOUR (jam nyata).
function econHours(ms) {
  return (ms / HOUR) * TIME.ECON_SCALE
}
function eventHours(ms) {
  return (ms / HOUR) * TIME.EVENT_SCALE
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}

// Level bangunan (semua unit satu jenis berbagi level). Default 1.
function lvl(p, k) {
  return (p.levels && p.levels[k]) || 1
}
function levelMult(level) {
  return 1 + (level - 1) * ECONOMY.LEVEL_BONUS
}

export function newPlayer(jid, number, name) {
  const now = Date.now()
  return {
    _id: jid,
    jid,
    number,
    name: name || number || 'Kota',
    kas: ECONOMY.START_KAS,
    approval: ECONOMY.START_APPROVAL,
    taxRate: ECONOMY.TAX_BASE,
    tier: 'desa',
    population: 0,
    buildings: { ...STARTER_BUILDINGS },
    levels: {}, // jenis -> level (v0.7); kosong = level 1
    landmarks: {}, // id -> { funded, done } (v0.8)
    storageLevel: 0,
    lastCollect: now,
    lastTick: now,
    event: null, // event aktif (crisis/choice) atau null
    lastEventAt: now,
    mood: 0, // penyesuaian approval sementara dari pilihan event (meluruh ke 0)
    lastDaily: 0,
    streak: 0,
    today: null, // progres misi harian { date, collects, builds, kasEarned, claimed }
    achievements: [],
    createdAt: now,
    updatedAt: now
  }
}

// ---- Tier ----
export function tierIndex(id) {
  const i = TIERS.findIndex((t) => t.id === id)
  return i < 0 ? 0 : i
}
export function tierUnlocked(playerTier, buildingTier) {
  return tierIndex(playerTier) >= tierIndex(buildingTier)
}
export function nextTier(p) {
  return TIERS[tierIndex(p.tier) + 1] || null
}

// ---- Landmark (v0.8): bonus global dari megaproyek yang selesai ----
export function landmarkBonus(p, key) {
  let sum = 0
  for (const [id, st] of Object.entries(p.landmarks || {})) {
    if (st?.done && LANDMARKS[id]?.bonus?.[key]) sum += LANDMARKS[id].bonus[key]
  }
  return sum
}

// Faktor kebutuhan layanan: makin tinggi tier, tiap warga makin banyak menuntut.
export function demandFactor(p) {
  return 1 + tierIndex(p.tier) * ECONOMY.DEMAND_PER_TIER
}

// ---- Resource turunan (dihitung dari bangunan, tidak disimpan) ----
export function popCapacity(p) {
  let cap = 0
  for (const [k, n] of Object.entries(p.buildings)) {
    if (BUILDINGS[k]?.popCap) cap += BUILDINGS[k].popCap * n * levelMult(lvl(p, k))
  }
  cap *= 1 + landmarkBonus(p, 'popMult') // mis. pusat riset +10%
  return Math.round(cap)
}

export function powerStatus(p) {
  let capacity = 0
  let use = 0
  for (const [k, n] of Object.entries(p.buildings)) {
    const pw = BUILDINGS[k]?.power
    if (!pw) continue
    const val = pw * n * levelMult(lvl(p, k))
    if (pw > 0) capacity += val
    else use += -val
  }
  return { capacity, use, surplus: capacity - use, deficit: use > capacity }
}

export function pollution(p) {
  let val = 0
  for (const [k, n] of Object.entries(p.buildings)) val += (BUILDINGS[k]?.pollution || 0) * n * levelMult(lvl(p, k))
  return Math.max(0, val)
}

// ---- Kemacetan (v0.6): beban lalu lintas vs kapasitas jalan ----
export function trafficStatus(p) {
  let load = p.population * ECONOMY.TRAFFIC_PER_POP
  let capacity = 0
  for (const [k, n] of Object.entries(p.buildings)) {
    const b = BUILDINGS[k]
    if (!b) continue
    const m = levelMult(lvl(p, k))
    if (b.traffic) load += b.traffic * n * m
    if (b.roadCap) capacity += b.roadCap * n * m
  }
  const ratio = load / Math.max(1, capacity)
  const over = Math.max(0, ratio - 1) // 0 = lancar; >0 = melebihi kapasitas
  const incomePenalty = Math.min(ECONOMY.TRAFFIC_MAX_PENALTY, over * ECONOMY.TRAFFIC_SLOPE)
  return { load: Math.round(load), capacity: Math.round(capacity), ratio, over, incomePenalty }
}

function serviceSupply(p, key) {
  let s = 0
  for (const [k, n] of Object.entries(p.buildings)) {
    const v = BUILDINGS[k]?.service?.[key]
    if (v) s += v * n * levelMult(lvl(p, k))
  }
  return s
}

// Rasio ketersediaan layanan (1 = tercukupi). Tanpa populasi = 1 (belum ada beban).
export function serviceCoverage(p, key, perCapita = 1) {
  const demand = p.population * perCapita * demandFactor(p)
  if (demand <= 0) return 1
  return serviceSupply(p, key) / demand
}

// Total biaya operasional semua bangunan (kas/jam).
export function totalUpkeep(p) {
  let sum = 0
  for (const [k, n] of Object.entries(p.buildings)) {
    if (BUILDINGS[k]?.upkeep) sum += BUILDINGS[k].upkeep * n * levelMult(lvl(p, k))
  }
  return sum
}

function tamanApproval(p) {
  let bonus = 0
  for (const [k, n] of Object.entries(p.buildings)) {
    if (BUILDINGS[k]?.approval) bonus += BUILDINGS[k].approval * n * levelMult(lvl(p, k))
  }
  return Math.min(20, bonus)
}
export function computeApproval(p) {
  let a = ECONOMY.START_APPROVAL
  a -= (p.taxRate - ECONOMY.TAX_BASE) * 2
  a -= Math.min(40, Math.round(pollution(p) * ECONOMY.POLLUTION_WEIGHT))
  for (const [key, cfg] of Object.entries(SERVICES)) {
    const shortfall = Math.max(0, 1 - serviceCoverage(p, key, cfg.perCapita))
    a -= Math.round(shortfall * cfg.weight)
  }
  // Kemacetan: warga kesal kalau jalan kelebihan beban.
  a -= Math.round(trafficStatus(p).incomePenalty / ECONOMY.TRAFFIC_MAX_PENALTY * ECONOMY.TRAFFIC_APPROVAL)
  a += tamanApproval(p)
  a += landmarkBonus(p, 'approval') // mis. monumen +8
  a += p.mood || 0
  if (p.event?.approvalDelta) a += p.event.approvalDelta
  return clamp(Math.round(a), 0, 100)
}

// ---- Income ----
function multiplier(count) {
  return 1 + Math.floor(count / ECONOMY.MILESTONE_EVERY)
}

export function educationCoverage(p) {
  return Math.min(1, serviceCoverage(p, 'pendidikan', EDU_PER_CAPITA))
}

// Rincian income/jam: kotor (produksi+pajak, semua pengali) lalu dikurangi upkeep = bersih.
export function incomeBreakdown(p) {
  const approval = computeApproval(p)
  let base = 0
  for (const [k, n] of Object.entries(p.buildings)) {
    const b = BUILDINGS[k]
    if (b?.income && n > 0) base += n * b.income * multiplier(n) * levelMult(lvl(p, k))
  }
  const tax = p.population * ECONOMY.TAX_PER_CITIZEN * (p.taxRate / ECONOMY.TAX_BASE) * (approval / 100)
  let gross = (base + tax) * (1 + educationCoverage(p) * ECONOMY.EDU_INCOME_BONUS)
  gross *= 1 + landmarkBonus(p, 'incomeMult') // pelabuhan/bandara
  gross *= 1 - trafficStatus(p).incomePenalty // macet menekan perdagangan
  if (powerStatus(p).deficit) gross *= ECONOMY.BLACKOUT_FACTOR
  if (p.event?.type === 'crisis') gross *= p.event.incomeMult
  const upkeep = totalUpkeep(p)
  return { gross: Math.round(gross), upkeep: Math.round(upkeep), net: Math.round(gross - upkeep) }
}

export function incomePerHour(p) {
  return incomeBreakdown(p).net
}

export function storageHours(p) {
  return (STORAGE[p.storageLevel] || STORAGE[0]).hours
}

export function pendingIncome(p, now = Date.now()) {
  const elapsedH = Math.min(econHours(now - p.lastCollect), storageHours(p))
  return Math.max(0, Math.floor(incomePerHour(p) * Math.max(0, elapsedH)))
}
// ---- Populasi (deterministik, bisa naik & turun menuju target) ----
export function applyGrowth(p, now = Date.now()) {
  const cap = popCapacity(p)
  const elapsedH = econHours(now - p.lastTick)
  if (elapsedH > 0) {
    if (p.mood) {
      p.mood *= Math.pow(1 - ECONOMY.MOOD_DECAY, elapsedH)
      if (Math.abs(p.mood) < 0.5) p.mood = 0
    }
    const approval = computeApproval(p)
    const approvalFactor = approval >= ECONOMY.APPROVAL_FULL ? 1 : approval / ECONOMY.APPROVAL_FULL
    const blackoutFactor = powerStatus(p).deficit ? ECONOMY.BLACKOUT_POP_FACTOR : 1
    const target = cap * approvalFactor * blackoutFactor
    const remain = Math.pow(1 - ECONOMY.POP_GROWTH, elapsedH)
    p.population = Math.round(target + (p.population - target) * remain)
  }
  p.population = clamp(p.population, 0, cap)
  p.lastTick = now
  return p
}

export function collect(p, now = Date.now()) {
  applyGrowth(p, now)
  const amount = pendingIncome(p, now)
  p.kas += amount
  p.lastCollect = now
  return amount
}

// ---- Bangun / upgrade ----
export function buildCost(jenis, owned, qty = 1) {
  const b = BUILDINGS[jenis]
  let total = 0
  for (let i = 0; i < qty; i++) total += Math.round(b.baseCost * Math.pow(ECONOMY.COST_GROWTH, owned + i))
  return total
}

export function build(p, jenis, qty = 1) {
  const b = BUILDINGS[jenis]
  if (!b) return { ok: false, msg: `Bangunan "${jenis}" tidak ada.` }
  if (!tierUnlocked(p.tier, b.tier)) return { ok: false, msg: `${b.label} baru terbuka di tier lebih tinggi.` }
  const owned = p.buildings[jenis] || 0
  const cost = buildCost(jenis, owned, qty)
  if (p.kas < cost) return { ok: false, msg: `Kas kurang. Butuh ${cost}, kamu punya ${p.kas}.` }
  p.kas -= cost
  p.buildings[jenis] = owned + qty
  applyGrowth(p)
  return { ok: true, cost, qty, jenis }
}

// Biaya upgrade jenis ke level berikutnya.
export function upgradeCost(jenis, level) {
  return Math.round(BUILDINGS[jenis].baseCost * ECONOMY.UPGRADE_COST_MULT * level)
}

// Naikkan level satu jenis bangunan (semua unit jenis itu jadi lebih kuat).
export function upgradeBuilding(p, jenis) {
  const b = BUILDINGS[jenis]
  if (!b) return { ok: false, msg: `Bangunan "${jenis}" tidak ada.` }
  if ((p.buildings[jenis] || 0) <= 0) return { ok: false, msg: `Kamu belum punya ${b.label}.` }
  const level = lvl(p, jenis)
  const cost = upgradeCost(jenis, level)
  if (p.kas < cost) return { ok: false, msg: `Kas kurang. Upgrade butuh ${cost}, kamu punya ${p.kas}.` }
  p.kas -= cost
  p.levels = p.levels || {}
  p.levels[jenis] = level + 1
  applyGrowth(p)
  return { ok: true, cost, jenis, level: level + 1 }
}

export function setTax(p, rate) {
  p.taxRate = clamp(Math.round(rate), ECONOMY.TAX_MIN, ECONOMY.TAX_MAX)
  p.approval = computeApproval(p)
  return p.taxRate
}

export function upgradeStorage(p) {
  const next = STORAGE[p.storageLevel + 1]
  if (!next) return { ok: false, msg: 'Gudang sudah level maksimum.' }
  if (p.kas < next.cost) return { ok: false, msg: `Kas kurang. Butuh ${next.cost}.` }
  p.kas -= next.cost
  p.storageLevel += 1
  return { ok: true, hours: next.hours, cost: next.cost }
}

// ---- Megaproyek/landmark (v0.8): danai bertahap sampai selesai ----
export function landmarkState(p, id) {
  return (p.landmarks && p.landmarks[id]) || { funded: 0, done: false }
}

export function fundLandmark(p, id, amount) {
  const lm = LANDMARKS[id]
  if (!lm) return { ok: false, msg: `Proyek "${id}" tidak ada.` }
  if (!tierUnlocked(p.tier, lm.tier)) return { ok: false, msg: `${lm.label} baru bisa dimulai di tier lebih tinggi.` }
  const st = landmarkState(p, id)
  if (st.done) return { ok: false, msg: `${lm.label} sudah selesai.` }
  const remaining = lm.cost - st.funded
  let pay = amount === 'max' || amount == null ? Math.min(p.kas, remaining) : Math.min(Math.round(amount), remaining)
  if (pay <= 0) return { ok: false, msg: 'Nominal dana tidak valid.' }
  if (p.kas < pay) return { ok: false, msg: `Kas kurang. Kamu punya ${p.kas}.` }
  p.kas -= pay
  p.landmarks = p.landmarks || {}
  const funded = st.funded + pay
  const done = funded >= lm.cost
  p.landmarks[id] = { funded, done }
  if (done) applyGrowth(p) // bonus popMult langsung berlaku
  return { ok: true, paid: pay, funded, cost: lm.cost, done, label: lm.label }
}
// ---- Naik tier (syarat majemuk: minPop + req.buildings + req.approval + req.landmarks) ----
function meetsReq(p, tier) {
  const req = tier.req || {}
  if (req.approval && computeApproval(p) < req.approval) return false
  if (req.buildings) {
    for (const [k, n] of Object.entries(req.buildings)) {
      if ((p.buildings[k] || 0) < n) return false
    }
  }
  if (req.landmarks) {
    for (const id of req.landmarks) {
      if (!landmarkState(p, id).done) return false
    }
  }
  return true
}

// Daftar syarat yang belum terpenuhi untuk naik ke `tier` (buat ditampilkan).
export function missingReq(p, tier) {
  const out = []
  if (p.population < tier.minPop) out.push(`populasi ${p.population}/${tier.minPop}`)
  const req = tier.req || {}
  if (req.buildings) {
    for (const [k, n] of Object.entries(req.buildings)) {
      const owned = p.buildings[k] || 0
      if (owned < n) out.push(`${BUILDINGS[k]?.label || k} ${owned}/${n}`)
    }
  }
  if (req.landmarks) {
    for (const id of req.landmarks) {
      if (!landmarkState(p, id).done) out.push(`proyek ${LANDMARKS[id]?.label || id}`)
    }
  }
  if (req.approval) {
    const a = computeApproval(p)
    if (a < req.approval) out.push(`approval ${a}/${req.approval}%`)
  }
  return out
}

// Promosikan ke tier tertinggi yang syaratnya terpenuhi (hanya naik, tak turun).
// Kembalikan tier baru bila naik, atau null.
export function evalTier(p) {
  const cur = tierIndex(p.tier)
  let best = cur
  for (let i = cur + 1; i < TIERS.length; i++) {
    const t = TIERS[i]
    if (p.population >= t.minPop && meetsReq(p, t)) best = i
    else break
  }
  if (best > cur) {
    p.tier = TIERS[best].id
    return TIERS[best]
  }
  return null
}

export { clamp, HOUR, econHours, eventHours }
