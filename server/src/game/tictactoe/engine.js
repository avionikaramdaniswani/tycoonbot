/**
 * Tic Tac Toe — game engine (stateless, pure-function).
 *
 * Board disimpan sebagai array 9 elemen (index 0–8):
 *   null = kosong, 'X' = pemain 1, 'O' = pemain 2.
 *
 *  0 | 1 | 2
 * ───┼───┼───
 *  3 | 4 | 5
 * ───┼───┼───
 *  6 | 7 | 8
 */

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // baris
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // kolom
  [0, 4, 8], [2, 4, 6]             // diagonal
]

/** Buat game baru. */
export function createGame(player1Jid, player2Jid, groupJid) {
  return {
    board: Array(9).fill(null),
    players: { X: player1Jid, O: player2Jid },
    turn: 'X',            // X mulai duluan
    winner: null,          // 'X' | 'O' | 'draw' | null
    winLine: null,         // [i,i,i] garis pemenang, null kalau belum
    groupJid,
    startedAt: Date.now(),
    moves: 0
  }
}

/**
 * Lakukan langkah pada posisi (1–9, user-facing).
 * @returns {{ ok: boolean, reason?: string }} hasil langkah.
 */
export function makeMove(game, playerJid, position) {
  if (game.winner) return { ok: false, reason: 'Game sudah selesai.' }

  const currentPlayer = game.players[game.turn]
  if (playerJid !== currentPlayer) return { ok: false, reason: 'Bukan giliranmu!' }

  const idx = position - 1
  if (idx < 0 || idx > 8) return { ok: false, reason: 'Posisi harus 1–9.' }
  if (game.board[idx] !== null) return { ok: false, reason: 'Posisi sudah terisi!' }

  // Letakkan tanda.
  game.board[idx] = game.turn
  game.moves++

  // Cek pemenang.
  const line = checkWin(game.board, game.turn)
  if (line) {
    game.winner = game.turn
    game.winLine = line
    return { ok: true }
  }

  // Cek seri (board penuh).
  if (game.moves >= 9) {
    game.winner = 'draw'
    return { ok: true }
  }

  // Ganti giliran.
  game.turn = game.turn === 'X' ? 'O' : 'X'
  return { ok: true }
}

/** Cek apakah `mark` punya garis kemenangan. Kembalikan garis atau null. */
function checkWin(board, mark) {
  for (const line of WIN_LINES) {
    if (line.every((i) => board[i] === mark)) return line
  }
  return null
}

/** Ambil posisi yang masih kosong (1–9, user-facing). */
export function availableMoves(game) {
  return game.board
    .map((v, i) => (v === null ? i + 1 : null))
    .filter((v) => v !== null)
}

/** Cek apakah seorang pemain adalah bagian dari game. */
export function isPlayer(game, playerJid) {
  return game.players.X === playerJid || game.players.O === playerJid
}

/** Dapatkan tanda (X/O) seorang pemain. */
export function markOf(game, playerJid) {
  if (game.players.X === playerJid) return 'X'
  if (game.players.O === playerJid) return 'O'
  return null
}

// ── AI (minimax) ────────────────────────────────────────────

/** JID khusus yang merepresentasikan bot AI. */
export const AI_JID = 'AI_BOT@s.whatsapp.net'

/** Cek siapa yang menang di board. Return 'X', 'O', atau null. */
function getWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a]
  }
  return null
}

/** Minimax dengan alpha-beta pruning. */
function minimax(board, depth, isMaximizing, aiMark, humanMark, alpha, beta) {
  const winner = getWinner(board)
  if (winner === aiMark) return 10 - depth
  if (winner === humanMark) return depth - 10
  if (board.every((c) => c !== null)) return 0

  if (isMaximizing) {
    let best = -Infinity
    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue
      board[i] = aiMark
      best = Math.max(best, minimax(board, depth + 1, false, aiMark, humanMark, alpha, beta))
      board[i] = null
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue
      board[i] = humanMark
      best = Math.min(best, minimax(board, depth + 1, true, aiMark, humanMark, alpha, beta))
      board[i] = null
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

/**
 * Pilih langkah terbaik untuk AI. Mengembalikan posisi 1–9.
 * @param {Array} board — board saat ini
 * @param {'X'|'O'} aiMark — tanda yang dipakai AI
 */
export function getBotMove(board, aiMark) {
  const humanMark = aiMark === 'X' ? 'O' : 'X'
  let bestScore = -Infinity
  let bestMove = -1

  const copy = [...board]
  for (let i = 0; i < 9; i++) {
    if (copy[i] !== null) continue
    copy[i] = aiMark
    const score = minimax(copy, 0, false, aiMark, humanMark, -Infinity, Infinity)
    copy[i] = null
    if (score > bestScore) {
      bestScore = score
      bestMove = i
    }
  }

  return bestMove + 1 // 1-indexed (user-facing)
}
