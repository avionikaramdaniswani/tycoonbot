import { WebSocketServer } from 'ws'
import { logger } from '../lib/logger.js'

/**
 * Server WebSocket untuk Tic Tac Toe online realtime — matchmaking pakai
 * KODE ROOM 4 digit (bukan lagi nempel di pesan / tag anggota grup).
 *
 * Alur:
 *   - "Create Room" : client kirim {type:'create'} -> server bikin kode 4 digit
 *     unik, jadikan client seat X, balas {type:'created', code, seat:'X'}.
 *     Client nunggu di papan sampai ada yang join.
 *   - "Join Room"   : client kirim {type:'join', code} -> server cari room; kalau
 *     ada & slot O kosong, jadikan seat O, balas {type:'joined', seat:'O'}.
 *   - Dua HP dengan kode sama = 1 room = main realtime. Server jadi wasit.
 *
 * Dipakai <script> di dalam HTML rich-response (native WebSocket, tanpa lib
 * eksternal karena CSP webview WA memblokir script dari luar).
 *
 * Protokol pesan (JSON):
 *   server -> client : { type:'created', code, seat }
 *                      { type:'joined', seat }
 *                      { type:'state', state, presence }
 *                      { type:'error', message }
 *   client -> server : { type:'create' }
 *                      { type:'join', code }
 *                      { type:'move', pos:0..8 }
 *                      { type:'reset' }
 */

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
]

/** code (4 digit) -> { state, seats:{X,O}, clients:Set } */
const rooms = new Map()

function freshState() {
  return { board: Array(9).fill(null), turn: 'X', winner: null, winLine: null }
}

// Kode room 4 digit (1000-9999) yang belum dipakai.
function genCode() {
  let code
  do { code = String(Math.floor(1000 + Math.random() * 9000)) } while (rooms.has(code))
  return code
}

function checkWin(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line
  }
  return null
}

function presenceOf(room) {
  return { X: !!room.seats.X, O: !!room.seats.O }
}

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) {
    try { ws.send(JSON.stringify(obj)) } catch { /* ignore */ }
  }
}

function broadcastState(room) {
  const msg = { type: 'state', state: room.state, presence: presenceOf(room) }
  for (const ws of room.clients) send(ws, msg)
}

// Buat room baru: client jadi host (seat X), nunggu lawan gabung pakai kode.
function handleCreate(ws) {
  if (ws._code) { send(ws, { type: 'error', message: 'Kamu sudah di room' }); return }
  const code = genCode()
  const room = { state: freshState(), seats: { X: ws, O: null }, clients: new Set([ws]) }
  rooms.set(code, room)
  ws._code = code
  ws._seat = 'X'
  send(ws, { type: 'created', code, seat: 'X' })
  broadcastState(room)
  logger.info(`TTT room ${code} dibuat (menunggu lawan).`)
}

// Gabung room lewat kode: client jadi seat O kalau slot masih kosong.
function handleJoin(ws, rawCode) {
  const code = String(rawCode || '').trim()
  if (ws._code) { send(ws, { type: 'error', message: 'Kamu sudah di room' }); return }
  const room = rooms.get(code)
  if (!room) { send(ws, { type: 'error', message: 'Room tidak ditemukan' }); return }
  if (room.seats.X === ws) { send(ws, { type: 'error', message: 'Itu room kamu sendiri' }); return }
  if (room.seats.O) { send(ws, { type: 'error', message: 'Room sudah penuh' }); return }
  room.seats.O = ws
  room.clients.add(ws)
  ws._code = code
  ws._seat = 'O'
  send(ws, { type: 'joined', seat: 'O' })
  broadcastState(room)
  logger.info(`TTT room ${code}: lawan bergabung, mulai duel.`)
}

function handleMove(ws, rawPos) {
  const room = rooms.get(ws._code)
  if (!room) return
  const s = room.state
  const pos = Number(rawPos)
  if (s.winner) return
  if (!room.seats.X || !room.seats.O) return // lawan belum lengkap
  if (ws._seat !== s.turn) return // bukan giliranmu
  if (!Number.isInteger(pos) || pos < 0 || pos > 8) return
  if (s.board[pos] !== null) return

  s.board[pos] = s.turn
  const line = checkWin(s.board)
  if (line) {
    s.winner = s.turn
    s.winLine = line
  } else if (s.board.every((c) => c !== null)) {
    s.winner = 'SERI'
  } else {
    s.turn = s.turn === 'X' ? 'O' : 'X'
  }
  broadcastState(room)
}

function handleReset(ws) {
  const room = rooms.get(ws._code)
  if (!room) return
  if (ws._seat !== 'X' && ws._seat !== 'O') return
  room.state = freshState()
  broadcastState(room)
}

export function initGameSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ttt' })

  wss.on('connection', (ws) => {
    // Koneksi mulai "kosong" — belum di room mana pun. Room ditentukan
    // saat client kirim create/join. Jadi nggak perlu ?room= di URL.
    ws._code = null
    ws._seat = null

    ws.on('message', (raw) => {
      let msg
      try { msg = JSON.parse(raw.toString()) } catch { return }

      if (msg.type === 'create') handleCreate(ws)
      else if (msg.type === 'join') handleJoin(ws, msg.code)
      else if (msg.type === 'move') handleMove(ws, msg.pos)
      else if (msg.type === 'reset') handleReset(ws)
    })

    ws.on('close', () => {
      const code = ws._code
      if (!code) return
      const room = rooms.get(code)
      if (!room) return
      room.clients.delete(ws)
      if (room.seats.X === ws) room.seats.X = null
      if (room.seats.O === ws) room.seats.O = null
      if (room.clients.size === 0) {
        rooms.delete(code)
        logger.info(`TTT room ${code} kosong — dihapus.`)
      } else {
        // Sisakan pemain lain -> presence update jadi "menunggu lawan" lagi;
        // slot yang kosong bisa diisi orang lain yang join pakai kode sama.
        broadcastState(room)
      }
    })
  })

  logger.success('WebSocket game (/ttt) siap.')
  return wss
}

export default initGameSocket

