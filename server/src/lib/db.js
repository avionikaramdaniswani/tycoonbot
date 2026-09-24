import { MongoClient } from 'mongodb'
import config from '../config/index.js'
import { logger } from './logger.js'

let client = null
let db = null

/** True kalau MONGODB_URI diisi (mode DB), false kalau pakai file lokal. */
export function isMongoEnabled() {
  return Boolean(config.mongodb.uri)
}

/** Sambung ke MongoDB (idempoten). Return instance db, atau null bila nonaktif. */
export async function connectDb() {
  if (!isMongoEnabled()) return null
  if (db) return db

  client = new MongoClient(config.mongodb.uri, { serverSelectionTimeoutMS: 15000 })
  await client.connect()
  db = client.db(config.mongodb.db)
  await db.command({ ping: 1 })
  logger.success(`MongoDB tersambung (db: ${config.mongodb.db})`)
  return db
}

export function getDb() {
  if (!db) throw new Error('MongoDB belum tersambung. Panggil connectDb() dulu.')
  return db
}

export async function closeDb() {
  if (client) await client.close()
  client = null
  db = null
}
