/**
 * Tic Tac Toe — penyimpanan in-memory untuk game aktif.
 *
 * Key = groupJid (satu game aktif per grup).
 * Juga ada pending challenges (tantangan belum diterima).
 */

/** Game aktif: groupJid -> gameState */
const activeGames = new Map()

/** Tantangan pending: groupJid -> { challenger, target, createdAt } */
const pendingChallenges = new Map()

// ── Game aktif ──────────────────────────────────────────────

export function getGame(groupJid) {
  return activeGames.get(groupJid) || null
}

export function setGame(groupJid, game) {
  activeGames.set(groupJid, game)
}

export function deleteGame(groupJid) {
  activeGames.delete(groupJid)
}

// ── Tantangan ───────────────────────────────────────────────

export function getChallenge(groupJid) {
  return pendingChallenges.get(groupJid) || null
}

export function setChallenge(groupJid, challenge) {
  pendingChallenges.set(groupJid, challenge)
}

export function deleteChallenge(groupJid) {
  pendingChallenges.delete(groupJid)
}

// ── Cleanup ─────────────────────────────────────────────────

/** Bersihkan game yang sudah tidak aktif lebih dari `maxAge` ms (default 30 menit). */
export function cleanup(maxAge = 30 * 60 * 1000) {
  const now = Date.now()
  for (const [jid, game] of activeGames) {
    if (now - game.startedAt > maxAge) activeGames.delete(jid)
  }
  for (const [jid, ch] of pendingChallenges) {
    if (now - ch.createdAt > 5 * 60 * 1000) pendingChallenges.delete(jid)
  }
}

// Auto-cleanup tiap 10 menit.
setInterval(cleanup, 10 * 60 * 1000)
