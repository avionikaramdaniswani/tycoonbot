import { Router } from 'express'
import { allPlayers, getPlayer, resetAllPlayers } from '../../game/tycoon/store.js'
import { overview, playerDetail } from '../../game/tycoon/stats.js'
import { logger } from '../../lib/logger.js'

const router = Router()

// Ringkasan dunia game + leaderboard.
router.get('/overview', async (req, res) => {
  try {
    const players = await allPlayers()
    res.json(overview(players))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Detail satu pemain berdasarkan JID.
router.get('/players/:jid', async (req, res) => {
  try {
    const p = await getPlayer(req.params.jid)
    if (!p) return res.status(404).json({ error: 'Pemain tidak ditemukan' })
    res.json(playerDetail(p))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DESTRUCTIF: hapus semua data pemain Tycoon. Wajib kirim { confirm: 'RESET' }.
router.post('/reset', async (req, res) => {
  if ((req.body || {}).confirm !== 'RESET') {
    return res.status(400).json({ error: "Konfirmasi tidak valid (butuh confirm: 'RESET')." })
  }
  try {
    const deleted = await resetAllPlayers()
    logger.warn(`Reset Tycoon: ${deleted} pemain dihapus via dashboard oleh ${req.user?.username || 'admin'}`)
    res.json({ ok: true, deleted })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
