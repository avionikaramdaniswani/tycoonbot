import { Router } from 'express'
import jwt from 'jsonwebtoken'
import config from '../../config/index.js'
import { logger } from '../../lib/logger.js'

const router = Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  if (username === config.auth.user && password === config.auth.password) {
    const token = jwt.sign({ username }, config.auth.jwtSecret, {
      expiresIn: config.auth.tokenExpiry
    })
    logger.info(`Login dashboard berhasil: ${username}`)
    return res.json({ token, user: { username } })
  }
  logger.warn(`Login dashboard gagal untuk user: ${username}`)
  res.status(401).json({ error: 'Username atau password salah' })
})

export default router
