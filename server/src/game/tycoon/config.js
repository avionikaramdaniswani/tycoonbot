// Konstanta ekonomi, katalog bangunan, landmark, event, dan retensi Tycoon Kota.
// Semua tuning ada di sini — jangan sebar angka ke file lain.

// Skala biaya kemajuan (bangun/upgrade/gudang/landmark + kas awal). Dinaikkan untuk
// mengimbangi income yang kini mengalir jauh lebih cepat — lihat TIME. Income & reward
// TIDAK ikut diskalakan; rebalance murni dari sisi biaya.
export const COST_SCALE = 6

// Kompresi waktu nyata -> waktu game.
//  ECON_SCALE : income & populasi. 30 = 2 menit nyata per 1 jam game.
//  EVENT_SCALE: event. 6 = 10 menit nyata per 1 jam game (lebih pelan dari ekonomi).
//  Check-in harian sengaja tetap jam nyata (pakai HOUR di engine).
export const TIME = {
  ECON_SCALE: 30,
  EVENT_SCALE: 6
}

export const ECONOMY = {
  START_KAS: 500 * COST_SCALE,
  START_APPROVAL: 70,
  COST_GROWTH: 1.15, // tuas pacing utama (naikin unit makin mahal)
  POP_GROWTH: 0.05, // proporsi jarak ke target yang ditempuh tiap jam (naik/turun)
  APPROVAL_FULL: 60, // approval >= nilai ini = hunian terisi penuh; di bawahnya menyusut
  BLACKOUT_POP_FACTOR: 0.7, // target populasi saat listrik defisit
  TAX_BASE: 10, // persen pajak netral
  TAX_MIN: 0,
  TAX_MAX: 50,
  TAX_PER_CITIZEN: 0.5, // kas/orang/jam saat pajak 10%
  BLACKOUT_FACTOR: 0.5, // pengali income saat listrik defisit
  MILESTONE_EVERY: 10, // tiap N unit, income jenis itu +1x
  EDU_INCOME_BONUS: 0.5, // maks +50% income saat pendidikan tercukupi penuh
  POLLUTION_WEIGHT: 0.2, // konversi polusi -> penalti approval (maks 40)
  MOOD_DECAY: 0.08, // peluruhan mood/jam (efek pilihan event pudar pelan menuju 0)
  // v0.6 ekonomi susah
  DEMAND_PER_TIER: 0.25, // kebutuhan layanan per warga naik tiap naik tier (desa 1x .. megapolitan 2x)
  TRAFFIC_PER_POP: 0.02, // beban kemacetan per warga
  TRAFFIC_SLOPE: 0.4, // seberapa cepat penalti naik saat beban > kapasitas jalan
  TRAFFIC_MAX_PENALTY: 0.4, // potongan income maksimum akibat macet
  TRAFFIC_APPROVAL: 20, // penalti approval maksimum akibat macet
  // v0.7 upgrade level bangunan
  LEVEL_BONUS: 0.5, // tiap level di atas 1 menambah efek & upkeep +50%
  UPGRADE_COST_MULT: 4, // biaya upgrade = baseCost * mult * levelSekarang
  NETWORTH_POP: 10 // nilai 1 warga untuk hitung kekayaan (leaderboard)
}

// Layanan berbasis populasi: kebutuhan per warga + bobot penalti approval saat kurang.
export const SERVICES = {
  air: { perCapita: 1, weight: 15, label: 'Air' },
  kesehatan: { perCapita: 1, weight: 12, label: 'Kesehatan' },
  keamanan: { perCapita: 1, weight: 10, label: 'Keamanan' },
  transportasi: { perCapita: 1, weight: 10, label: 'Transportasi' }
}
export const EDU_PER_CAPITA = 1 // kebutuhan pendidikan per warga (bonus income, bukan penalti)

// Level gudang: jam penyimpanan income offline + biaya upgrade.
export const STORAGE = [
  { hours: 4, cost: 0 },
  { hours: 8, cost: 3000 },
  { hours: 12, cost: 12000 },
  { hours: 24, cost: 50000 }
]
// Urutan tier: minPop + syarat majemuk (req) yang harus dipenuhi untuk naik.
// req.buildings {jenis:jumlah}, req.approval, req.landmarks [id...]
export const TIERS = [
  { id: 'desa', label: 'Desa', minPop: 0, req: {} },
  { id: 'kota_kecil', label: 'Kota Kecil', minPop: 500, req: { buildings: { pdam: 1 } } },
  { id: 'kota_besar', label: 'Kota Besar', minPop: 5000, req: { buildings: { rs: 1 }, approval: 60 } },
  {
    id: 'metropolitan',
    label: 'Metropolitan',
    minPop: 25000,
    req: { buildings: { universitas: 1 }, approval: 65, landmarks: ['monumen'] }
  },
  {
    id: 'megapolitan',
    label: 'Megapolitan',
    minPop: 100000,
    req: { approval: 70, landmarks: ['bandara'] }
  }
]
// Field bangunan:
//  income    kas/jam per unit
//  upkeep    biaya operasional kas/jam per unit (dipotong dari income saat panen)
//  popCap    kapasitas populasi per unit
//  power     + suplai / - pemakaian listrik
//  pollution polusi (negatif = mengurangi)
//  traffic   beban kemacetan (+) yang ditimbulkan
//  roadCap   kapasitas jalan (-) untuk meredam kemacetan
//  service   { air|kesehatan|keamanan|transportasi|pendidikan: nilai suplai }
//  approval  bonus approval flat per unit
export const BUILDINGS = {
  warung: { label: 'Warung', baseCost: 200, income: 60, upkeep: 5, tier: 'desa' },
  rumah: { label: 'Rumah', baseCost: 150, popCap: 40, upkeep: 2, tier: 'desa' },
  genset: { label: 'Genset', baseCost: 800, power: 150, pollution: 2, upkeep: 15, tier: 'desa' },
  pdam: { label: 'PDAM', baseCost: 600, service: { air: 400 }, upkeep: 10, tier: 'desa' },
  pabrik: { label: 'Pabrik', baseCost: 2500, income: 400, power: -100, pollution: 8, traffic: 15, upkeep: 40, tier: 'kota_kecil' },
  apartemen: { label: 'Apartemen', baseCost: 3000, popCap: 200, upkeep: 8, tier: 'kota_kecil' },
  sekolah: { label: 'Sekolah', baseCost: 2000, service: { pendidikan: 500 }, upkeep: 20, tier: 'kota_kecil' },
  rs: { label: 'Rumah Sakit', baseCost: 2500, service: { kesehatan: 500 }, upkeep: 25, tier: 'kota_kecil' },
  polisi: { label: 'Kantor Polisi', baseCost: 1800, service: { keamanan: 500 }, upkeep: 18, tier: 'kota_kecil' },
  jalan: { label: 'Jalan Raya', baseCost: 1500, service: { transportasi: 800 }, roadCap: 400, upkeep: 8, tier: 'kota_kecil' },
  taman: { label: 'Taman', baseCost: 1200, approval: 3, pollution: -5, upkeep: 6, tier: 'kota_kecil' },
  // kota_besar
  mall: { label: 'Mall', baseCost: 8000, income: 1500, power: -150, pollution: 4, traffic: 25, upkeep: 120, tier: 'kota_besar' },
  mrt: { label: 'MRT', baseCost: 15000, service: { transportasi: 2500 }, roadCap: 1800, power: -120, upkeep: 150, tier: 'kota_besar' },
  pltu: { label: 'PLTU', baseCost: 12000, power: 1500, pollution: 25, upkeep: 200, tier: 'kota_besar' },
  // metropolitan
  universitas: { label: 'Universitas', baseCost: 18000, service: { pendidikan: 3000 }, upkeep: 180, tier: 'metropolitan' },
  plta: { label: 'PLTA', baseCost: 22000, power: 1400, upkeep: 130, tier: 'metropolitan' },
  kondominium: { label: 'Kondominium', baseCost: 25000, popCap: 1200, upkeep: 60, tier: 'metropolitan' },
  // megapolitan
  superblok: { label: 'Superblok', baseCost: 80000, popCap: 5000, income: 2000, power: -400, traffic: 60, upkeep: 400, tier: 'megapolitan' },
  kawasan_industri: { label: 'Kawasan Industri', baseCost: 100000, income: 8000, power: -600, pollution: 40, traffic: 80, upkeep: 800, tier: 'megapolitan' }
}

export const STARTER_BUILDINGS = { warung: 1, rumah: 1 }

// Megaproyek/landmark: dibangun sekali, didanai bertahap. Selesai -> bonus global.
// bonus.incomeMult (mis. 0.15 = +15% income), bonus.approval (flat), bonus.popMult (mis. 0.10 = +10% kapasitas).
export const LANDMARKS = {
  monumen: { label: 'Monumen Kota', cost: 150000, tier: 'kota_besar', bonus: { approval: 8 }, desc: 'Ikon kebanggaan warga.' },
  pelabuhan: { label: 'Pelabuhan', cost: 400000, tier: 'kota_besar', bonus: { incomeMult: 0.1 }, desc: 'Buka jalur dagang, income +10%.' },
  pusat_riset: { label: 'Pusat Riset', cost: 600000, tier: 'metropolitan', bonus: { popMult: 0.1 }, desc: 'Tarik talenta, kapasitas warga +10%.' },
  bandara: { label: 'Bandara Internasional', cost: 900000, tier: 'metropolitan', bonus: { incomeMult: 0.15 }, desc: 'Gerbang dunia, income +15%.' }
}

// Terapkan COST_SCALE sekali di sini (sumber tunggal) supaya engine & dashboard konsisten.
const scaleCost = (n) => Math.round(n * COST_SCALE)
for (const b of Object.values(BUILDINGS)) b.baseCost = scaleCost(b.baseCost)
for (const l of Object.values(LANDMARKS)) l.cost = scaleCost(l.cost)
for (const s of STORAGE) s.cost = scaleCost(s.cost)

// Event: peluang & jeda kemunculan.
export const EVENTS_CFG = {
  cooldownH: 6, // jeda minimum antar event
  ratePerH: 0.15, // peluang muncul per jam setelah cooldown
  choiceExpiryH: 12 // choice event kedaluwarsa -> opsi default (b) dijalankan
}

// Krisis pasif: aktif sampai .ty repair. incomeMult<1 & approvalDelta<0 selama aktif.
export const CRISES = [
  { id: 'kebakaran', label: 'Kebakaran', desc: 'Api melalap kawasan usaha. Income turun sampai dibereskan.', incomeMult: 0.6, approvalDelta: -8, repair: 1500 },
  { id: 'banjir', label: 'Banjir', desc: 'Air merendam jalan. Aktivitas warga lumpuh.', incomeMult: 0.65, approvalDelta: -10, repair: 1800 },
  { id: 'wabah', label: 'Wabah Penyakit', desc: 'Warga jatuh sakit, produktivitas anjlok.', incomeMult: 0.7, approvalDelta: -12, repair: 2200 }
]

// Choice event A/B: efek sekali jalan (kas + mood approval). Opsi b = aman/default saat kedaluwarsa.
export const CHOICES = [
  {
    id: 'investor',
    label: 'Tawaran Investor',
    desc: 'Investor mau suntik dana besar tapi minta keringanan aturan.',
    a: { label: 'Terima dana', kas: 5000, approval: -8 },
    b: { label: 'Tolak, main aman', kas: 0, approval: 3 }
  },
  {
    id: 'festival',
    label: 'Usulan Festival Kota',
    desc: 'Panitia minta dana untuk festival rakyat.',
    a: { label: 'Danai festival', kas: -3000, approval: 12 },
    b: { label: 'Batalkan', kas: 0, approval: -5 }
  },
  {
    id: 'demo',
    label: 'Demo Warga',
    desc: 'Warga protes biaya hidup. Beri subsidi?',
    a: { label: 'Beri subsidi', kas: -2000, approval: 10 },
    b: { label: 'Abaikan', kas: 0, approval: -10 }
  }
]

// Check-in harian.
export const DAILY = {
  cooldownH: 20,
  base: 300,
  streakBonus: 100, // tambahan per hari beruntun
  jackpotDay: 7,
  jackpot: 2000
}

// Misi harian (progress di-reset tiap hari).
export const QUESTS = [
  { id: 'panen', desc: 'Panen 3 kali', metric: 'collects', target: 3, reward: 300 },
  { id: 'bangun', desc: 'Bangun 2 bangunan', metric: 'builds', target: 2, reward: 400 },
  { id: 'cuan', desc: 'Kumpulkan 2000 APBN dari panen', metric: 'kasEarned', target: 2000, reward: 500 }
]

// Pencapaian permanen (sekali klaim).
export const ACHIEVEMENTS = [
  { id: 'kota_kecil', desc: 'Capai 500 populasi', test: (p) => p.population >= 500, reward: 500 },
  { id: 'kota_besar', desc: 'Capai 5.000 populasi', test: (p) => p.population >= 5000, reward: 2000 },
  { id: 'metropolitan', desc: 'Capai 25.000 populasi', test: (p) => p.population >= 25000, reward: 8000 },
  { id: 'megapolitan', desc: 'Capai 100.000 populasi', test: (p) => p.population >= 100000, reward: 30000 },
  { id: 'sultan', desc: 'Punya 100.000 APBN', test: (p) => p.kas >= 100000, reward: 3000 },
  { id: 'kontraktor', desc: 'Bangun 50 total bangunan', test: (p) => totalBuildings(p) >= 50, reward: 2000 },
  { id: 'arsitek', desc: 'Selesaikan 1 megaproyek', test: (p) => landmarksDone(p) >= 1, reward: 5000 },
  { id: 'legenda', desc: 'Jadikan kota berstatus Legendaris', test: (p) => isLegend(p), reward: 50000 }
]

export function totalBuildings(p) {
  return Object.values(p.buildings || {}).reduce((a, b) => a + b, 0)
}

export function landmarksDone(p) {
  return Object.values(p.landmarks || {}).filter((l) => l?.done).length
}

// Kota Legendaris: tier tertinggi tercapai + semua landmark selesai. Tanpa reset.
export function isLegend(p) {
  if (p.tier !== TIERS[TIERS.length - 1].id) return false
  return Object.keys(LANDMARKS).every((id) => p.landmarks?.[id]?.done)
}
