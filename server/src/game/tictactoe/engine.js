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
