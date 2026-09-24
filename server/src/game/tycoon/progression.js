// Retensi: check-in harian + streak, misi harian (progress), pencapaian permanen.
import { DAILY, QUESTS, ACHIEVEMENTS } from './config.js'
import { HOUR } from './engine.js'

// ---- Daily check-in ----
export function claimDaily(p, now = Date.now()) {
  const sinceH = (now - (p.lastDaily || 0)) / HOUR
  if (p.lastDaily && sinceH < DAILY.cooldownH) {
    const waitH = Math.max(1, Math.ceil(DAILY.cooldownH - sinceH))
    return { ok: false, msg: `Sudah klaim. Coba lagi ~${waitH} jam lagi.` }
  }
  // Streak lanjut kalau klaim dalam 48 jam sejak terakhir; lewat itu reset.
  const within = p.lastDaily && sinceH <= 48
  p.streak = within ? (p.streak || 0) + 1 : 1
  let reward = DAILY.base + (p.streak - 1) * DAILY.streakBonus
  let jackpot = false
  if (p.streak % DAILY.jackpotDay === 0) {
    reward += DAILY.jackpot
    jackpot = true
  }
  p.kas += reward
  p.lastDaily = now
  return { ok: true, reward, streak: p.streak, jackpot }
}

// ---- Misi harian ----
function todayKey(now) {
  return new Date(now).toISOString().slice(0, 10)
}

// Pastikan progres hari ini ada; reset otomatis saat ganti hari.
export function ensureToday(p, now = Date.now()) {
  const date = todayKey(now)
  if (!p.today || p.today.date !== date) {
    p.today = { date, collects: 0, builds: 0, kasEarned: 0, claimed: [] }
  }
  return p.today
}

export function trackQuest(p, metric, amount = 1, now = Date.now()) {
  const t = ensureToday(p, now)
  t[metric] = (t[metric] || 0) + amount
}

export function questStatus(p, now = Date.now()) {
  const t = ensureToday(p, now)
  return QUESTS.map((q) => ({
    id: q.id,
    desc: q.desc,
    reward: q.reward,
    have: t[q.metric] || 0,
    target: q.target,
    done: (t[q.metric] || 0) >= q.target,
    claimed: t.claimed.includes(q.id)
  }))
}

// Klaim semua misi yang siap. Kembalikan total & jumlah.
export function claimQuests(p, now = Date.now()) {
  const t = ensureToday(p, now)
  let total = 0
  let count = 0
  for (const q of QUESTS) {
    if (t.claimed.includes(q.id)) continue
    if ((t[q.metric] || 0) >= q.target) {
      t.claimed.push(q.id)
      p.kas += q.reward
      total += q.reward
      count += 1
    }
  }
  return { total, count }
}

// ---- Pencapaian permanen ----
export function checkAchievements(p) {
  p.achievements = p.achievements || []
  const unlocked = []
  for (const a of ACHIEVEMENTS) {
    if (!p.achievements.includes(a.id) && a.test(p)) {
      p.achievements.push(a.id)
      p.kas += a.reward
      unlocked.push(a)
    }
  }
  return unlocked
}

export function achStatus(p) {
  const owned = p.achievements || []
  return ACHIEVEMENTS.map((a) => ({ id: a.id, desc: a.desc, reward: a.reward, done: owned.includes(a.id) }))
}
