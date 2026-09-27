import { WebSocketServer } from 'ws'
import { logger } from '../lib/logger.js'
import config from '../config/index.js'

/**
 * Server WebSocket untuk fitur Pinterest (galeri di dalam bubble WA).
 *
 * UI (HTML rich-response) jalan client-side & connect ke sini lewat native
 * WebSocket (CSP webview WA memblokir fetch/script eksternal, jadi API key
 * TIDAK boleh nempel di client — server ini yang nembak API pihak ketiga).
 *
 * Protokol pesan (JSON):
 *   client -> server : { type:'search', query, reqId }
 *   server -> client : { type:'results', reqId, query, items:[{img,link}] }
 *                      { type:'error', reqId, message }
 *
 * Sumber data: BetaBotz (GET /api/search/pinterest?apikey=..&text1=query).
 * IP server HARUS di-whitelist di https://api.betabotz.eu.org/profile.
 */

const MAX_ITEMS = 40

// Ambil URL gambar dari satu entri hasil API — tahan banting terhadap
// beberapa kemungkinan bentuk respons (string langsung / objek berlabel).
function pickImage(entry) {
  if (!entry) return null
  if (typeof entry === 'string') return entry
  if (typeof entry === 'object') {
    const cand =
      entry.image_url || entry.images_url || entry.imageUrl ||
      entry.image || entry.thumbnail || entry.url || entry.src ||
      entry.media || entry.original ||
      (entry.images && (entry.images.orig?.url || entry.images.originals?.url))
    if (typeof cand === 'string') return cand
  }
  return null
}

function pickLink(entry) {
  if (entry && typeof entry === 'object') {
    const l = entry.link || entry.pin || entry.source_url || entry.pin_url
    if (typeof l === 'string') return l
  }
  return null
}

// Normalisasi respons API jadi daftar { img, link } yang siap dirender.
function extractItems(json) {
  if (!json) return []
  const arr =
    (Array.isArray(json.result) && json.result) ||
    (Array.isArray(json.results) && json.results) ||
    (Array.isArray(json.data) && json.data) ||
    (Array.isArray(json) && json) ||
    []
  const items = []
  for (const entry of arr) {
    const img = pickImage(entry)
    if (!img || !/^https?:\/\//i.test(img)) continue
    items.push({ img, link: pickLink(entry) || img })
    if (items.length >= MAX_ITEMS) break
  }
  return items
}

async function searchPinterest(query) {
  const { apiBase, apiKey } = config.pinterest
  const url =
    apiBase.replace(/\/+$/, '') +
    '/api/search/pinterest?apikey=' + encodeURIComponent(apiKey) +
    '&text1=' + encodeURIComponent(query)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  let json
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    const text = await res.text()
    try { json = JSON.parse(text) } catch { json = null }
    if (!res.ok) {
      const msg = (json && json.message) || `HTTP ${res.status}`
      throw new Error(msg)
    }
  } finally {
    clearTimeout(timer)
  }
  // BetaBotz pakai flag `status:false` + `message` saat gagal (mis. IP belum
  // di-whitelist). Teruskan pesannya biar kelihatan di UI.
  if (json && json.status === false) {
    throw new Error(json.message || 'API menolak request')
  }
  return extractItems(json)
}

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) {
    try { ws.send(JSON.stringify(obj)) } catch { /* ignore */ }
  }
}

async function handleSearch(ws, msg) {
  const reqId = msg.reqId || 0
  const query = String(msg.query || '').trim().slice(0, 80)
  if (!query) { send(ws, { type: 'error', reqId, message: 'Kata kunci kosong' }); return }

  try {
    const items = await searchPinterest(query)
    // Buang request usang: kalau client sudah mengirim pencarian baru,
    // reqId tidak lagi cocok dengan yang ditunggu (dicek di sisi client).
    send(ws, { type: 'results', reqId, query, items })
    logger.info(`Pinterest "${query}" -> ${items.length} hasil.`)
  } catch (e) {
    send(ws, { type: 'error', reqId, message: e.message || 'Gagal mengambil data' })
    logger.warn(`Pinterest "${query}" gagal: ${e.message}`)
  }
}

export function initPinSocket() {
  // noServer: routing upgrade dipusatkan di index.js (hindari bentrok dengan
  // socket.io & WSS /ttt yang bikin handshake /pin ditolak 400).
  const wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws) => {
    logger.info('Pinterest /pin: client terhubung.')
    ws.on('message', (raw) => {
      let msg
      try { msg = JSON.parse(raw.toString()) } catch { return }
      if (msg.type === 'search') handleSearch(ws, msg)
    })
    ws.on('close', (code) => logger.info(`Pinterest /pin: client putus (code ${code}).`))
    ws.on('error', (e) => logger.warn(`Pinterest /pin: error socket — ${e.message}`))
  })

  logger.success('WebSocket Pinterest (/pin) siap.')
  return wss
}

export default initPinSocket
