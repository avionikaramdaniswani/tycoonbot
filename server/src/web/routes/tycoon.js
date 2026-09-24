import { Router } from 'express'
import { allPlayers, getPlayer } from '../../game/tycoon/store.js'
import { overview, playerDetail } from '../../game/tycoon/stats.js'

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

export default router
