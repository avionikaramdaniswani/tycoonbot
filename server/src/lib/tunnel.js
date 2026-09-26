import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { spawn } from 'node:child_process'
import config from '../config/index.js'
import { logger } from './logger.js'

/**
 * Auto-jalanin Cloudflare Tunnel (cloudflared) dari DALAM container Pterodactyl.
 *
 * Kenapa: HP tidak bisa akses localhost, dan webview WA (https) tidak boleh
 * buka ws:// (mixed-content). cloudflared bikin koneksi KELUAR ke Cloudflare,
 * lalu kasih URL https/wss publik yang diteruskan ke app kita di localhost.
 * Jadi kita tidak perlu panel buka port atau menyediakan sertifikat TLS.
 *
 * URL yang didapat otomatis di-set ke `config.publicUrl`, dipakai render papan
 * (lihat commands/tictactoe/ttt.js -> deriveWsUrl -> wss://.../ttt).
 *
 * Aktif hanya kalau env USE_CLOUDFLARED=1. Kalau gagal, mode Online nonaktif
 * tanpa mematikan bot.
 */

const BIN_DIR = path.join(config.paths.root, 'bin')
const BIN_PATH = path.join(BIN_DIR, 'cloudflared')

function assetName() {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64'
  return `cloudflared-linux-${arch}`
}

// Unduh file sambil mengikuti redirect (GitHub release -> CDN).
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const req = https.get(url, { headers: { 'User-Agent': 'seana-bot' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        res.resume()
        return resolve(download(res.headers.location, dest))
      }
      if (res.statusCode !== 200) {
        file.close()
        return reject(new Error('HTTP ' + res.statusCode))
      }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
    })
    req.on('error', (e) => {
      file.close()
      reject(e)
    })
  })
}

async function ensureBinary() {
  if (fs.existsSync(BIN_PATH) && fs.statSync(BIN_PATH).size > 0) return
  fs.mkdirSync(BIN_DIR, { recursive: true })
  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/${assetName()}`
  logger.info(`Mengunduh cloudflared (${assetName()})…`)
  await download(url, BIN_PATH)
  fs.chmodSync(BIN_PATH, 0o755)
  logger.success('cloudflared terunduh.')
}

export async function startTunnel() {
  if (process.env.USE_CLOUDFLARED !== '1') return

  // Selama tunnel belum siap, kosongkan publicUrl supaya mode Online nggak
  // sempat memakai URL http:// lama (yang bikin ws:// diblokir webview).
  config.publicUrl = ''

  try {
    await ensureBinary()
  } catch (e) {
    logger.error(`Gagal siapkan cloudflared: ${e.message}`)
    logger.warn('Mode Online tetap nonaktif.')
    return
  }

  const target = `http://localhost:${config.port}`
  const child = spawn(
    BIN_PATH,
    ['tunnel', '--no-autoupdate', '--url', target],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )

  let found = false
  const scan = (buf) => {
    const m = buf.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
    if (m && !found) {
      found = true
      config.publicUrl = m[0]
      logger.success(`Cloudflare Tunnel aktif: ${m[0]}`)
      logger.info('Mode Online (multiplayer) AKTIF. Buka .ttt lalu tekan Online.')
    }
  }
  child.stdout.on('data', scan)
  child.stderr.on('data', scan)

  child.on('exit', (code) => {
    config.publicUrl = ''
    logger.warn(`cloudflared berhenti (code ${code}). Mode Online nonaktif.`)
  })
  child.on('error', (e) => {
    logger.error(`cloudflared error: ${e.message}`)
  })

  // Jangan tinggalkan proses zombie kalau bot dimatikan.
  process.on('exit', () => {
    try { child.kill() } catch { /* ignore */ }
  })
}

export default startTunnel
