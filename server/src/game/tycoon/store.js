import fs from 'node:fs'
import path from 'node:path'
import config from '../../config/index.js'
import { isMongoEnabled, getDb } from '../../lib/db.js'
import { ensureDir } from '../../lib/utils.js'

const COLLECTION = 'ty_players'
let backend = null

function netWorth(p) {
  return (p?.kas || 0) + (p?.population || 0) * 10
}

function fileBackend() {
  ensureDir(config.paths.data)
  const file = path.join(config.paths.data, 'ty_players.json')
  const readAll = () => {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {
      return {}
    }
  }
  const writeAll = (obj) => fs.writeFileSync(file, JSON.stringify(obj, null, 2))
  return {
    async get(jid) {
      return readAll()[jid] || null
    },
    async save(p) {
      const all = readAll()
      all[p.jid] = p
      writeAll(all)
      return p
    },
    async top(limit) {
      return Object.values(readAll())
        .sort((a, b) => netWorth(b) - netWorth(a))
        .slice(0, limit)
    },
    async all() {
      return Object.values(readAll())
    }
  }
}

function mongoBackend() {
  const col = getDb().collection(COLLECTION)
  return {
    async get(jid) {
      return col.findOne({ _id: jid })
    },
    async save(p) {
      await col.replaceOne({ _id: p.jid }, p, { upsert: true })
      return p
    },
    async top(limit) {
      const all = await col.find({}).toArray()
      return all.sort((a, b) => netWorth(b) - netWorth(a)).slice(0, limit)
    },
    async all() {
      return col.find({}).toArray()
    }
  }
}

// Pilih backend sekali: MongoDB kalau aktif, kalau tidak file JSON lokal.
function getBackend() {
  if (backend) return backend
  if (isMongoEnabled()) {
    try {
      backend = mongoBackend()
      return backend
    } catch {
      /* fallback ke file */
    }
  }
  backend = fileBackend()
  return backend
}

export async function getPlayer(jid) {
  return getBackend().get(jid)
}

export async function savePlayer(p) {
  p.updatedAt = Date.now()
  return getBackend().save(p)
}

export async function topPlayers(limit = 10) {
  return getBackend().top(limit)
}

export async function allPlayers() {
  return getBackend().all()
}
