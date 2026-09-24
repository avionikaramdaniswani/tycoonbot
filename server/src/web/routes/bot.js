import { Router } from 'express'
import { bot } from '../../bot/BotManager.js'

const router = Router()

router.get('/status', (req, res) => res.json(bot.getState()))

router.post('/start', async (req, res) => {
  const { usePairing = false, number = null } = req.body || {}
  const state = await bot.start({ usePairing, phoneNumber: number })
  res.json(state)
})

router.post('/stop', async (req, res) => res.json(await bot.stop()))

router.post('/restart', async (req, res) => res.json(await bot.restart()))

router.post('/logout', async (req, res) => res.json(await bot.logout()))

router.post('/pairing', async (req, res) => {
  try {
    const { number } = req.body || {}
    const state = await bot.requestPairing(number)
    res.json(state)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

export default router
