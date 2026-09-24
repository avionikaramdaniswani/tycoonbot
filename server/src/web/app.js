import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import config from '../config/index.js'
import { authMiddleware } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import botRoutes from './routes/bot.js'
import tycoonRoutes from './routes/tycoon.js'

export function createApp() {
  const app = express()
  app.use(cors({ origin: config.corsOrigin, credentials: true }))
  app.use(express.json())

  app.get('/api/health', (req, res) => res.json({ ok: true, name: config.bot.name }))
  app.use('/api/auth', authRoutes)
  app.use('/api/bot', authMiddleware, botRoutes) // semua endpoint bot butuh login
  app.use('/api/tycoon', authMiddleware, tycoonRoutes) // data game (read-only)

  // Sajikan hasil build dashboard (mode produksi): `npm run build`.
  const dist = path.resolve(config.paths.root, '..', 'dashboard', 'dist')
  if (fs.existsSync(dist)) {
    app.use(express.static(dist))
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
  }

  return app
}

export default createApp
