import http from 'node:http'
import config from './config/index.js'
import { createApp } from './web/app.js'
import { initSocket } from './web/socket.js'
import { bot } from './bot/BotManager.js'
import { logger } from './lib/logger.js'
import { ensureDir } from './lib/utils.js'
import { connectDb, isMongoEnabled } from './lib/db.js'

async function main() {
  // Siapkan folder runtime.
  ensureDir(config.paths.sessions)
  ensureDir(config.paths.data)
  ensureDir(config.paths.logs)

  // Sambungkan MongoDB kalau dikonfigurasi (sesi WA disimpan di sana).
  if (isMongoEnabled()) {
    try {
      await connectDb()
    } catch (e) {
      logger.error(`Gagal konek MongoDB: ${e.message}`)
      logger.warn('Server tetap jalan, tapi bot tidak bisa start sampai DB tersambung.')
    }
  } else {
    logger.info('MongoDB nonaktif — memakai penyimpanan file lokal (sessions/).')
  }

  // Muat command lebih awal supaya jumlahnya tampil di dashboard.
  await bot.loadPlugins()

  const app = createApp()
  const server = http.createServer(app)
  initSocket(server)

  server.listen(config.port, () => {
    logger.success(`Server & API jalan di http://localhost:${config.port}`)
    logger.info(`Dashboard (dev) diharapkan di ${config.corsOrigin}`)
    logger.info('Buka dashboard lalu tekan START untuk menyalakan bot.')
  })
}

// Jangan biarkan error tak tertangani mematikan proses diam-diam.
process.on('unhandledRejection', (e) => logger.error(`unhandledRejection: ${e?.message || e}`))
process.on('uncaughtException', (e) => logger.error(`uncaughtException: ${e?.message || e}`))

main().catch((e) => {
  logger.error(`Fatal saat start: ${e.stack || e.message}`)
  process.exit(1)
})
