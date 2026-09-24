import jwt from 'jsonwebtoken'
import config from '../../config/index.js'

/** Middleware Express: wajib membawa Bearer token JWT yang valid. */
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Token tidak ada' })

  try {
    req.user = jwt.verify(token, config.auth.jwtSecret)
    next()
  } catch {
    res.status(401).json({ error: 'Token tidak valid atau kadaluarsa' })
  }
}

export default authMiddleware
