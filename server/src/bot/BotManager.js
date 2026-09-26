import { EventEmitter } from 'node:events'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers
} from '@vanzxy/baileys'

import config from '../config/index.js'
import { logger, waLogger } from '../lib/logger.js'
import { ensureDir, clearDir, normalizePhone, delay } from '../lib/utils.js'
import { isMongoEnabled, getDb } from '../lib/db.js'
import { serializeMessage } from './serialize.js'
import { rememberName } from './nameCache.js'
import { useMongoAuthState } from './authState.js'
import { loadCommands } from '../commands/loader.js'
import { createMessageHandler } from '../handlers/messageHandler.js'

const MAX_RECONNECT = 10

/**
 * Inti kontrol bot. Memegang socket Baileys & siklus hidupnya.
 * Emit event: 'status', 'qr', 'pairing', 'ready'. Log lewat logBus.
 * Status: stopped | connecting | qr | pairing | connected | reconnecting | logged_out
 */
export class BotManager extends EventEmitter {
  constructor() {
    super()
    this.sock = null
    this.status = 'stopped'
    this.qr = null
    this.pairingCode = null
    this.user = null
    this.startTime = null
    this.manualStop = false
    this.usePairing = false
    this.phoneNumber = null
    this.commands = new Map()
    this.reconnectAttempts = 0
    this.handleMessage = null
    this._clearAuth = null
  }

  get commandCount() {
    return new Set([...this.commands.values()]).size
  }

  getState() {
    return {
      status: this.status,
      connected: this.status === 'connected',
      user: this.user
        ? { id: this.user.id, name: this.user.name || this.user.verifiedName || '' }
        : null,
      qr: this.qr,
      pairingCode: this.pairingCode,
      startTime: this.startTime,
      commandCount: this.commandCount
    }
  }

  setStatus(status) {
    this.status = status
    this.emit('status', this.getState())
  }

  async loadPlugins() {
    this.commands = await loadCommands(config.paths.commands)
    this.handleMessage = createMessageHandler(() => this.commands)
    logger.success(`${this.commandCount} command dimuat`)
    return this.commandCount
  }
  async start({ usePairing = false, phoneNumber = null } = {}) {
    if (this.status === 'connecting' || this.status === 'connected') {
      logger.warn('Bot sudah berjalan.')
      return this.getState()
    }
    this.manualStop = false
    this.usePairing = usePairing
    this.phoneNumber = phoneNumber ? normalizePhone(phoneNumber) : this.phoneNumber
    this.qr = null
    this.pairingCode = null

    if (!this.handleMessage) await this.loadPlugins()
    this.setStatus('connecting')

    const { state, saveCreds } = await this._getAuthState()
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
      version,
      logger: waLogger,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, waLogger)
      }
    })
    this.sock = sock
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', (u) => this._onConnectionUpdate(u))
    sock.ev.on('messages.upsert', (u) => this._onMessages(u))

    if (usePairing && this.phoneNumber && !sock.authState.creds.registered) {
      await delay(2500)
      try {
        const raw = await sock.requestPairingCode(this.phoneNumber)
        this.pairingCode = raw?.match(/.{1,4}/g)?.join('-') || raw
        this.setStatus('pairing')
        this.emit('pairing', this.pairingCode)
        logger.success(`Pairing code: ${this.pairingCode}`)
      } catch (e) {
        logger.error(`Gagal minta pairing code: ${e.message}`)
      }
    }
    return this.getState()
  }
  async _onConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update

    if (qr && !this.usePairing) {
      this.qr = await QRCode.toDataURL(qr)
      this.setStatus('qr')
      this.emit('qr', this.qr)
      logger.info('QR diperbarui — silakan scan.')
    }

    if (connection === 'open') {
      this.reconnectAttempts = 0
      this.qr = null
      this.pairingCode = null
      this.user = this.sock?.user || null
      this.startTime = Date.now()
      this.setStatus('connected')
      this.emit('ready', this.user)
      logger.success(`Tersambung sebagai ${this.user?.name || this.user?.id}`)
    } else if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (statusCode === DisconnectReason.loggedOut) {
        logger.warn('Sesi logout / tidak valid — membersihkan sesi.')
        await this._clearSession()
        this.sock = null
        this.setStatus('logged_out')
      } else if (this.manualStop) {
        this.setStatus('stopped')
      } else if (++this.reconnectAttempts > MAX_RECONNECT) {
        logger.error('Terlalu banyak percobaan reconnect — berhenti.')
        this.setStatus('stopped')
      } else {
        this.setStatus('reconnecting')
        logger.warn(`Koneksi tertutup (code ${statusCode}). Reconnect #${this.reconnectAttempts}...`)
        await delay(2000)
        this.sock = null
        this.start({ usePairing: this.usePairing, phoneNumber: this.phoneNumber })
      }
    }
  }

  async _onMessages({ messages, type }) {
    if (type !== 'notify') return
    for (const m of messages) {
      const msg = serializeMessage(this.sock, m)
      if (!msg) continue
      // Simpan nama pengirim buat dipakai lobby game (lihat nameCache).
      if (msg.sender && msg.pushName) rememberName(msg.sender, msg.pushName)
      if (msg.fromMe) continue
      if (this.handleMessage) await this.handleMessage({ sock: this.sock, msg })
    }
  }
  async stop() {
    this.manualStop = true
    if (this.sock) {
      try { this.sock.end(new Error('Manual stop')) } catch { /* ignore */ }
    }
    this.sock = null
    this.qr = null
    this.pairingCode = null
    this.user = null
    this.startTime = null
    this.setStatus('stopped')
    logger.info('Bot dihentikan.')
    return this.getState()
  }

  async restart() {
    logger.info('Merestart bot...')
    const opts = { usePairing: this.usePairing, phoneNumber: this.phoneNumber }
    await this.stop()
    await delay(1500)
    return this.start(opts)
  }

  async logout() {
    this.manualStop = true
    if (this.sock) {
      try { await this.sock.logout() } catch (e) { logger.warn(`logout: ${e.message}`) }
    }
    this.sock = null
    await this._clearSession()
    this.qr = null
    this.pairingCode = null
    this.user = null
    this.startTime = null
    this.setStatus('logged_out')
    logger.info('Berhasil logout & sesi dibersihkan.')
    return this.getState()
  }

  /** Mulai ulang dalam mode pairing dengan nomor tertentu. */
  async requestPairing(phoneNumber) {
    const number = normalizePhone(phoneNumber)
    if (!number || number.length < 8) throw new Error('Nomor tidak valid')
    await this.stop()
    await delay(1000)
    return this.start({ usePairing: true, phoneNumber: number })
  }

  /** Pilih penyimpanan auth: MongoDB kalau aktif, kalau tidak file lokal. */
  async _getAuthState() {
    if (isMongoEnabled()) {
      const collection = getDb().collection('wa_auth')
      const { state, saveCreds, clearAuth } = await useMongoAuthState(collection)
      this._clearAuth = clearAuth
      logger.info('Auth WhatsApp: MongoDB')
      return { state, saveCreds }
    }
    ensureDir(config.paths.sessions)
    const { state, saveCreds } = await useMultiFileAuthState(config.paths.sessions)
    this._clearAuth = async () => clearDir(config.paths.sessions)
    logger.info('Auth WhatsApp: file lokal')
    return { state, saveCreds }
  }

  async _clearSession() {
    if (this._clearAuth) await this._clearAuth()
    else clearDir(config.paths.sessions)
  }
}

export const bot = new BotManager()
export default bot
