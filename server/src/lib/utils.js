import fs from 'node:fs'
import path from 'node:path'

/** Pastikan sebuah folder ada (buat rekursif kalau belum). */
export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** Hapus isi folder tapi biarkan foldernya tetap ada. */
export function clearDir(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true })
  }
}

/** Format durasi milidetik jadi string manusiawi (mis. "1h 5m 12s"). */
export function formatUptime(ms) {
  if (!ms || ms < 0) return '0s'
  const s = Math.floor(ms / 1000) % 60
  const m = Math.floor(ms / (1000 * 60)) % 60
  const h = Math.floor(ms / (1000 * 60 * 60)) % 24
  const d = Math.floor(ms / (1000 * 60 * 60 * 24))
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`]
    .filter(Boolean)
    .join(' ')
}

/** Bersihkan input nomor telepon jadi hanya digit (untuk pairing code). */
export function normalizePhone(input = '') {
  return String(input).replace(/[^0-9]/g, '')
}

/** Delay sederhana berbasis Promise. */
export const delay = (ms) => new Promise((r) => setTimeout(r, ms))
