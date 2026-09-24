import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverDir = path.resolve(__dirname, '..', '..') // .../server
const projectRoot = path.resolve(serverDir, '..') // .../Bot Terbaru

// Muat .env dari root proyek (server dijalankan dari folder server/).
dotenv.config({ path: path.join(projectRoot, '.env') })

const rootDir = serverDir

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  auth: {
    user: process.env.DASHBOARD_USER || 'admin',
    password: process.env.DASHBOARD_PASSWORD || 'admin123',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    tokenExpiry: '12h'
  },

  bot: {
    name: process.env.BOT_NAME || 'Bot Terbaru',
    prefix: process.env.BOT_PREFIX || '.',
    owner: process.env.OWNER_NUMBER || ''
  },

  mongodb: {
    uri: process.env.MONGODB_URI || '',
    db: process.env.MONGODB_DB || 'piobot'
  },

  paths: {
    root: rootDir,
    sessions: path.join(rootDir, 'sessions'),
    data: path.join(rootDir, 'data'),
    logs: path.join(rootDir, 'logs'),
    commands: path.join(__dirname, '..', 'commands')
  }
}

export default config
