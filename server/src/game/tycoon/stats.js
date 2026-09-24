// Read-model untuk dashboard web: ubah dokumen pemain mentah jadi data siap tampil.
// Semua fungsi di sini MURNI membaca (tidak memodifikasi/menyimpan state pemain).
import {
  BUILDINGS,
  SERVICES,
  TIERS,
  LANDMARKS,
  EDU_PER_CAPITA,
  ECONOMY,
  TIME,
  totalBuildings,
  landmarksDone,
  isLegend
} from './config.js'
import {
  computeApproval,
  incomeBreakdown,
  popCapacity,
  powerStatus,
  pollution,
  trafficStatus,
  serviceCoverage,
  educationCoverage,
  storageHours,
  landmarkState,
  nextTier,
  missingReq
} from './engine.js'

function netWorth(p) {
  return (p?.kas || 0) + (p?.population || 0) * ECONOMY.NETWORTH_POP
}

function tierLabel(id) {
  return TIERS.find((t) => t.id === id)?.label || id
}

// Baris ringkas untuk tabel leaderboard.
export function playerRow(p) {
  return {
    jid: p.jid || p._id,
    name: p.name || p.number || '—',
    number: p.number || null,
    tier: p.tier,
    tierLabel: tierLabel(p.tier),
    population: p.population || 0,
    kas: Math.round(p.kas || 0),
    netWorth: Math.round(netWorth(p)),
    incomeNet: incomeBreakdown(p).net,
    approval: computeApproval(p),
    legend: isLegend(p),
    updatedAt: p.updatedAt || null
  }
}

// Ringkasan seluruh dunia game + leaderboard.
export function overview(players) {
  const rows = players.map(playerRow).sort((a, b) => b.netWorth - a.netWorth)
  const tierDist = TIERS.map((t) => ({
    id: t.id,
    label: t.label,
    count: rows.filter((r) => r.tier === t.id).length
  }))
  return {
    totalPlayers: rows.length,
    totalPopulation: rows.reduce((a, r) => a + r.population, 0),
    totalKas: rows.reduce((a, r) => a + r.kas, 0),
    totalNetWorth: rows.reduce((a, r) => a + r.netWorth, 0),
    legends: rows.filter((r) => r.legend).length,
    tierDist,
    leaderboard: rows,
    // Waktu game dipercepat: 1 jam-game = realMinPerHour menit nyata (buat legenda UI).
    econScale: TIME.ECON_SCALE,
    realMinPerHour: 60 / TIME.ECON_SCALE
  }
}

// Detail lengkap satu pemain (semua metrik turunan).
export function playerDetail(p) {
  const income = incomeBreakdown(p)
  const power = powerStatus(p)
  const traffic = trafficStatus(p)
  const cap = popCapacity(p)
  const nt = nextTier(p)

  const services = Object.entries(SERVICES).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    coverage: serviceCoverage(p, key, cfg.perCapita)
  }))
  services.push({ key: 'pendidikan', label: 'Pendidikan', coverage: educationCoverage(p) })

  const buildings = Object.entries(p.buildings || {})
    .filter(([, n]) => n > 0)
    .map(([key, count]) => ({
      key,
      label: BUILDINGS[key]?.label || key,
      tier: BUILDINGS[key]?.tier || null,
      count,
      level: (p.levels && p.levels[key]) || 1
    }))
    .sort((a, b) => b.count - a.count)

  const landmarks = Object.entries(LANDMARKS).map(([id, lm]) => {
    const st = landmarkState(p, id)
    return {
      id,
      label: lm.label,
      cost: lm.cost,
      funded: st.funded || 0,
      done: !!st.done,
      progress: Math.min(1, (st.funded || 0) / lm.cost),
      desc: lm.desc
    }
  })

  return {
    jid: p.jid || p._id,
    name: p.name || p.number || '—',
    number: p.number || null,
    tier: p.tier,
    tierLabel: tierLabel(p.tier),
    legend: isLegend(p),
    kas: Math.round(p.kas || 0),
    netWorth: Math.round(netWorth(p)),
    approval: computeApproval(p),
    taxRate: p.taxRate,
    population: p.population || 0,
    popCapacity: cap,
    income,
    storageHours: storageHours(p),
    econScale: TIME.ECON_SCALE,
    realMinPerHour: 60 / TIME.ECON_SCALE,
    power,
    pollution: Math.round(pollution(p)),
    traffic,
    services,
    buildings,
    totalBuildings: totalBuildings(p),
    landmarks,
    landmarksDone: landmarksDone(p),
    streak: p.streak || 0,
    achievements: (p.achievements || []).length,
    event: p.event
      ? { type: p.event.type, label: p.event.label, desc: p.event.desc }
      : null,
    nextTier: nt ? { id: nt.id, label: nt.label, missing: missingReq(p, nt) } : null,
    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null
  }
}
