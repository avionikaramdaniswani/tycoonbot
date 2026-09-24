import { BUILDINGS, TIERS, SERVICES, LANDMARKS, ECONOMY, isLegend, TIME } from './config.js'
import {
  incomePerHour,
  incomeBreakdown,
  pendingIncome,
  popCapacity,
  powerStatus,
  computeApproval,
  storageHours,
  buildCost,
  upgradeCost,
  nextTier,
  tierIndex,
  serviceCoverage,
  educationCoverage,
  trafficStatus,
  landmarkState,
  missingReq
} from './engine.js'
import { questStatus, achStatus, dailyAvailable, questsReady } from './progression.js'
import appConfig from '../../config/index.js'

const nf = new Intl.NumberFormat('id-ID')
export const fmt = (n) => nf.format(Math.round(n || 0))

// Waktu game dipercepat: 1 "jam" game = sekian menit nyata (lihat TIME.ECON_SCALE).
export const REAL_MIN_PER_JAM = 60 / TIME.ECON_SCALE
export const JAM_LEGEND = `1 jam game = ${Number(REAL_MIN_PER_JAM.toFixed(1))} menit nyata`

// Ubah durasi dalam jam-game jadi perkiraan waktu nyata yang mudah dibaca.
export function realTime(gameHours) {
  const mins = gameHours * REAL_MIN_PER_JAM
  if (mins < 60) return `${Math.round(mins)} menit`
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return m ? `${h} jam ${m} mnt` : `${h} jam`
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v))
}

function bar(pct, size = 10) {
  const filled = Math.round((clamp(pct, 0, 100) / 100) * size)
  return '▓'.repeat(filled) + '░'.repeat(size - filled)
}

function lvlOf(p, k) {
  return (p.levels && p.levels[k]) || 1
}

function tierLabel(id) {
  return TIERS[tierIndex(id)]?.label || id
}

// Ringkas status kemacetan atau null kalau belum ada beban.
function trafficLine(p) {
  const t = trafficStatus(p)
  if (t.load <= 0) return null
  if (t.over <= 0) return 'Kemacetan : lancar'
  const pct = Math.round(t.incomePenalty * 100)
  return `Kemacetan : padat (income -${pct}%)`
}

// Ringkas status layanan: sebut hanya yang masih kurang.
function serviceLine(p) {
  if (p.population <= 0) return 'Layanan   : - (belum ada warga)'
  const short = []
  for (const [key, cfg] of Object.entries(SERVICES)) {
    const cov = Math.round(serviceCoverage(p, key, cfg.perCapita) * 100)
    if (cov < 100) short.push(`${cfg.label} ${cov}%`)
  }
  return short.length ? `Layanan   : kurang (${short.join(', ')})` : 'Layanan   : aman'
}

// Banner event aktif (crisis/choice) atau null.
export function eventBanner(p) {
  const e = p.event
  if (!e) return null
  if (e.type === 'crisis') {
    return ['--------------------', `KRISIS: ${e.label}`, e.desc, `Perbaikan ${fmt(e.repair)} APBN -> .ty repair`].join('\n')
  }
  return [
    '--------------------',
    `PILIHAN: ${e.label}`,
    e.desc,
    `a) ${e.a.label}`,
    `b) ${e.b.label}`,
    'Putuskan: .ty event a  /  .ty event b'
  ].join('\n')
}

export function dashboard(p) {
  const cap = popCapacity(p)
  const power = powerStatus(p)
  const approval = computeApproval(p)
  const pending = pendingIncome(p)
  const inc = incomeBreakdown(p)
  const eduPct = Math.round(educationCoverage(p) * 100)
  const nt = nextTier(p)
  const legend = isLegend(p)

  const head = `KOTA ${String(p.name).toUpperCase()} - ${tierLabel(p.tier)}${legend ? ' [LEGENDARIS]' : ''}`
  const lines = [
    head,
    '--------------------',
    `Populasi  : ${fmt(p.population)} / ${fmt(cap)}`,
    `Approval  : ${bar(approval)} ${approval}%`,
    `APBN      : ${fmt(p.kas)}`,
    `Pajak     : ${p.taxRate}%`,
    `Listrik   : ${power.deficit ? 'DEFISIT' : 'aman'} (${fmt(power.surplus)})`,
    serviceLine(p),
    `Pendidikan: ${eduPct}% (bonus income)`
  ]
  const tl = trafficLine(p)
  if (tl) lines.push(tl)
  lines.push(
    `Income    : ${fmt(inc.net)}/jam (kotor ${fmt(inc.gross)} - upkeep ${fmt(inc.upkeep)})`,
    `Siap panen: ${fmt(pending)} (gudang penuh dlm ${realTime(storageHours(p))})`
  )
  if (nt) {
    const miss = missingReq(p, nt)
    lines.push('', `Naik ${nt.label}: ${miss.length ? 'butuh ' + miss.join(', ') : 'syarat lengkap, lanjut!'}`)
  } else if (!legend) {
    lines.push('', 'Tier maksimum. Selesaikan semua megaproyek (.ty proyek) untuk status Legendaris.')
  }
  const ev = eventBanner(p)
  if (ev) lines.push(ev)
  lines.push('--------------------', JAM_LEGEND, 'Panen: .ty collect  |  Bantuan: .ty help')
  return lines.join('\n')
}

function buildingEffect(b) {
  const parts = []
  if (b.income) parts.push(`+${b.income}/jam`)
  if (b.popCap) parts.push(`+${b.popCap} warga`)
  if (b.power) parts.push(`${b.power > 0 ? '+' : ''}${b.power} listrik`)
  if (b.service) {
    for (const [key, v] of Object.entries(b.service)) parts.push(`${key} +${v}`)
  }
  if (b.roadCap) parts.push(`jalan +${b.roadCap}`)
  if (b.traffic) parts.push(`macet +${b.traffic}`)
  if (b.approval) parts.push(`approval +${b.approval}`)
  if (b.pollution) parts.push(`polusi ${b.pollution > 0 ? '+' : ''}${b.pollution}`)
  if (b.upkeep) parts.push(`upkeep ${b.upkeep}/jam`)
  return parts.join(', ') || '-'
}

export function shop(p) {
  const lines = ['TOKO BANGUNAN', '--------------------']
  for (const [k, b] of Object.entries(BUILDINGS)) {
    const owned = p.buildings[k] || 0
    const cost = buildCost(k, owned, 1)
    const locked = tierIndex(b.tier) > tierIndex(p.tier)
    const level = lvlOf(p, k)
    const lvlTag = owned > 0 && level > 1 ? ` lv${level}` : ''
    const tag = locked ? ` [terkunci: ${tierLabel(b.tier)}]` : ''
    lines.push(`${k} (punya ${owned}${lvlTag}) - ${fmt(cost)} APBN - ${buildingEffect(b)}${tag}`)
  }
  lines.push('--------------------', JAM_LEGEND, 'Bangun: .ty build <jenis> [jumlah]  |  Upgrade: .ty upgrade <jenis>')
  return lines.join('\n')
}

// ===== Toolkit tombol interaktif (NativeFlow) =====
// Kontrak: fungsi menu mengembalikan { text, footer?, buttons }.
//   buttons[]: { kind:'reply', text, id } (quick_reply, 1 tap = 1 aksi)
//            | { kind:'select', text, sections } (bottom-sheet pilih 1 dari banyak)
// Setiap id adalah perintah lengkap (mis. ".ty build warung") supaya ketukan
// diperlakukan sama seperti user mengetik perintah itu (lihat serialize.js).
const PREFIX = appConfig.bot.prefix
const cmd = (s) => `${PREFIX}ty${s ? ` ${s}` : ''}`
const reply = (text, sub) => ({ kind: 'reply', text, id: cmd(sub) })
const select = (text, sections) => ({ kind: 'select', text, sections })

// Tombol "Menu utama" untuk balik ke dashboard dari layar mana pun.
export function menuButton() {
  return reply('Menu utama', '')
}

// Tombol quick_reply generik ke sub-perintah lain (mis. button('Bangun','build')).
export function button(text, sub) {
  return reply(text, sub)
}

// Data untuk bottom-sheet (single_select) pilihan bangunan saat `.ty build` tanpa argumen.
// Hanya bangunan yang sudah terbuka (sesuai tier) yang ditampilkan.
export function buildMenu(p) {
  const rows = []
  for (const [k, b] of Object.entries(BUILDINGS)) {
    if (tierIndex(b.tier) > tierIndex(p.tier)) continue // sembunyikan yang masih terkunci
    const owned = p.buildings[k] || 0
    const cost = buildCost(k, owned, 1)
    const eff = []
    if (b.income) eff.push(`+${b.income}/jam-game`)
    if (b.popCap) eff.push(`+${fmt(b.popCap)} warga`)
    const suffix = eff.length ? ` · ${eff.join(', ')}` : ''
    rows.push({
      title: `${b.label} — ${fmt(cost)} APBN`,
      description: `punya ${owned}${suffix}`,
      id: cmd(`build ${k}`)
    })
  }
  return {
    text: `Mau bangun apa di ${p.name}?\nAPBN tersedia: ${fmt(p.kas)}.`,
    footer: JAM_LEGEND,
    buttons: [select('Pilih bangunan', [{ title: 'Bangunan tersedia', rows }]), menuButton()]
  }
}

// Bottom-sheet upgrade: hanya bangunan yang sudah dimiliki (owned > 0).
export function upgradeMenu(p) {
  const rows = []
  for (const [k, b] of Object.entries(BUILDINGS)) {
    const owned = p.buildings[k] || 0
    if (owned <= 0) continue
    const level = (p.levels && p.levels[k]) || 1
    const cost = upgradeCost(k, level)
    rows.push({
      title: `${b.label} — ${fmt(cost)} APBN`,
      description: `lv${level} -> lv${level + 1} · punya ${owned} unit`,
      id: cmd(`upgrade ${k}`)
    })
  }
  if (!rows.length) {
    return { text: 'Belum ada bangunan yang bisa di-upgrade. Bangun dulu lewat .ty build.', buttons: [menuButton()] }
  }
  return {
    text: `Upgrade bangunan apa? Semua unit jenis itu jadi lebih kuat (+${Math.round(ECONOMY.LEVEL_BONUS * 100)}% efek/level).\nAPBN: ${fmt(p.kas)}.`,
    footer: JAM_LEGEND,
    buttons: [select('Pilih bangunan', [{ title: 'Bangunan dimiliki', rows }]), menuButton()]
  }
}

// Bottom-sheet danai megaproyek: hanya proyek yang terbuka & belum selesai.
export function proyekMenu(p) {
  const rows = []
  for (const [id, lm] of Object.entries(LANDMARKS)) {
    if (tierIndex(lm.tier) > tierIndex(p.tier)) continue
    const st = landmarkState(p, id)
    if (st.done) continue
    const remaining = lm.cost - (st.funded || 0)
    rows.push({
      title: `${lm.label} — sisa ${fmt(remaining)} APBN`,
      description: `terkumpul ${fmt(st.funded || 0)}/${fmt(lm.cost)}`,
      id: cmd(`proyek fund ${id} max`)
    })
  }
  const buttons = rows.length
    ? [select('Danai proyek (maks APBN)', [{ title: 'Proyek tersedia', rows }]), menuButton()]
    : [menuButton()]
  return { text: proyekView(p), buttons }
}

// Bottom-sheet pilih tarif pajak dari preset.
export function taxMenu(p) {
  const presets = [0, 5, 10, 15, 20, 25, 30].filter((r) => r >= ECONOMY.TAX_MIN && r <= ECONOMY.TAX_MAX)
  const rows = presets.map((r) => ({
    title: `Pajak ${r}%`,
    description: r === ECONOMY.TAX_BASE ? 'netral' : r < ECONOMY.TAX_BASE ? 'approval naik, income turun' : 'income naik, approval turun',
    id: cmd(`tax ${r}`)
  }))
  return {
    text: `Pajak sekarang ${p.taxRate}%. Approval ${computeApproval(p)}%.\nPilih tarif baru:`,
    buttons: [select('Pilih tarif pajak', [{ title: 'Tarif pajak', rows }]), menuButton()]
  }
}

// Prompt keputusan event choice: 2 tombol A/B. Null kalau tidak ada choice aktif.
export function eventPrompt(p) {
  const e = p.event
  if (!e || e.type !== 'choice') return null
  return {
    text: [`PILIHAN: ${e.label}`, e.desc, '', `a) ${e.a.label}`, `b) ${e.b.label}`].join('\n'),
    buttons: [reply(`A) ${e.a.label}`, 'event a'), reply(`B) ${e.b.label}`, 'event b')]
  }
}

// Menu lengkap semua sub-perintah (single_select), dipakai di hub dashboard.
function fullMenuSelect() {
  const rows = [
    { title: 'Panen income', id: cmd('collect') },
    { title: 'Bangun', id: cmd('build') },
    { title: 'Upgrade bangunan', id: cmd('upgrade') },
    { title: 'Toko & harga', id: cmd('shop') },
    { title: 'Megaproyek', id: cmd('proyek') },
    { title: 'Atur pajak', id: cmd('tax') },
    { title: 'Upgrade gudang', id: cmd('gudang') },
    { title: 'Naik tier', id: cmd('tier') },
    { title: 'Misi harian', id: cmd('quest') },
    { title: 'Check-in harian', id: cmd('daily') },
    { title: 'Pencapaian', id: cmd('ach') },
    { title: 'Peringkat', id: cmd('top') },
    { title: 'Bantuan', id: cmd('help') }
  ]
  return select('Menu lengkap', [{ title: 'Semua perintah', rows }])
}

// Tombol hub untuk dashboard: quick_reply prioritas (maks 3) + menu lengkap.
// Kondisional: hanya aksi yang relevan sekarang yang muncul sebagai tombol cepat.
export function hubButtons(p) {
  const candidates = []
  if (p.event?.type === 'crisis') candidates.push(reply(`Perbaiki (${fmt(p.event.repair)} APBN)`, 'repair'))
  if (p.event?.type === 'choice') candidates.push(reply('Putuskan event', 'event'))
  if (pendingIncome(p) > 0) candidates.push(reply('Panen', 'collect'))
  candidates.push(reply('Bangun', 'build'))
  if (dailyAvailable(p)) candidates.push(reply('Check-in', 'daily'))
  if (questsReady(p)) candidates.push(reply('Klaim misi', 'quest claim'))
  candidates.push(reply('Toko', 'shop'))
  // Ambil 3 tombol cepat teratas, sisanya tetap terjangkau via menu lengkap.
  return [...candidates.slice(0, 3), fullMenuSelect()]
}

// Daftar megaproyek + progres pendanaan.
export function proyekView(p) {
  const lines = ['MEGAPROYEK', '--------------------']
  for (const [id, lm] of Object.entries(LANDMARKS)) {
    const st = landmarkState(p, id)
    const locked = tierIndex(lm.tier) > tierIndex(p.tier)
    let status
    if (st.done) status = 'SELESAI'
    else if (locked) status = `terkunci (${tierLabel(lm.tier)})`
    else status = `${fmt(st.funded)}/${fmt(lm.cost)} APBN`
    lines.push(`${id} - ${lm.label}`, `  ${lm.desc} [${status}]`)
  }
  lines.push('--------------------', 'Danai: .ty proyek fund <id> [nominal|max]')
  return lines.join('\n')
}

export function tierInfo(p) {
  const nt = nextTier(p)
  if (!nt) return `Tier: ${tierLabel(p.tier)} (maksimum).`
  return [
    `Tier sekarang : ${tierLabel(p.tier)}`,
    `Berikutnya    : ${nt.label}`,
    `Syarat        : populasi ${fmt(p.population)} / ${fmt(nt.minPop)}`
  ].join('\n')
}

export function questView(p) {
  const list = questStatus(p)
  const lines = ['MISI HARIAN', '--------------------']
  for (const q of list) {
    const status = q.claimed ? 'sudah diklaim' : q.done ? 'siap klaim' : `${q.have}/${q.target}`
    lines.push(`- ${q.desc} (${status}) +${fmt(q.reward)}`)
  }
  lines.push('--------------------', 'Klaim yang siap: .ty quest claim')
  return lines.join('\n')
}

export function achView(p) {
  const list = achStatus(p)
  const lines = ['PENCAPAIAN', '--------------------']
  for (const a of list) {
    lines.push(`[${a.done ? 'v' : ' '}] ${a.desc} +${fmt(a.reward)}`)
  }
  return lines.join('\n')
}

export function help() {
  return [
    'TYCOON KOTA - daftar perintah',
    '--------------------',
    '.ty                 lihat kota',
    '.ty start           mulai / daftar',
    '.ty collect         panen income',
    '.ty build <j> [n]   bangun bangunan',
    '.ty upgrade <j>     naikkan level bangunan',
    '.ty shop            daftar harga',
    '.ty tax <persen>    atur pajak',
    '.ty gudang          upgrade kapasitas simpan',
    '.ty proyek          megaproyek kota',
    '.ty tier            syarat naik tier',
    '.ty repair          bereskan krisis',
    '.ty event <a|b>     putuskan pilihan event',
    '.ty daily           check-in harian + streak',
    '.ty quest [claim]   misi harian',
    '.ty ach             pencapaian',
    '.ty top             peringkat terkaya'
  ].join('\n')
}
