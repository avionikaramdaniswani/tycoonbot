import { WebSocketServer } from 'ws'
import { logger } from '../lib/logger.js'

/**
 * Server WebSocket "mentah" untuk Tic Tac Toe online (real-time multiplayer).
 *
 * Ini yang dipakai oleh <script> di dalam HTML rich-response: tiap HP yang
 * membuka pesan papan yang sama akan connect ke room yang sama (room id
 * ditanam di HTML saat render), lalu server jadi wasit + relay langkah.
 *
 * Sengaja pakai `ws` (bukan Socket.IO namespace) karena webview WA cuma
 * bisa buka `new WebSocket(...)` native tanpa memuat library dari luar
 * (CSP webview memblokir script eksternal).
 *
 * Protokol pesan (JSON):
 *   server -> client : { type:'welcome', seat:'X'|'O'|'spec' }
 *                      { type:'state', state, presence }
 *                      { type:'error', message }
 *   client -> server : { type:'move', pos:0..8 }
 *                      { type:'reset' }
 */

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
]

/** room id -> { state, seats:{X,O}, clients:Set } */
const rooms = new Map()

function freshState() {
  return { board: Array(9).fill(null), turn: 'X', winner: null, winLine: null }
}

function getRoom(id) {
  let room = rooms.get(id)
  if (!room) {
    room = { state: freshState(), seats: { X: null, O: null }, clients: new Set() }
    rooms.set(id, room)
  }
  return room
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

export function initGameSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ttt' })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost')
    const roomId = url.searchParams.get('room')
    if (!roomId) {
      send(ws, { type: 'error', message: 'room wajib' })
      ws.close()
      return
    }

    const room = getRoom(roomId)
    room.clients.add(ws)

    // Assign kursi: X dulu, lalu O, sisanya penonton.
    let seat = 'spec'
    if (!room.seats.X) { room.seats.X = ws; seat = 'X' }
    else if (!room.seats.O) { room.seats.O = ws; seat = 'O' }
    ws._roomId = roomId
    ws._seat = seat

    send(ws, { type: 'welcome', seat })
    broadcastState(room)

    ws.on('message', (raw) => {
      let msg
      try { msg = JSON.parse(raw.toString()) } catch { return }

      if (msg.type === 'move') {
        const s = room.state
        const pos = Number(msg.pos)
        if (s.winner) return
        if (ws._seat !== s.turn) return // bukan giliranmu / penonton
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
      } else if (msg.type === 'reset') {
        if (ws._seat !== 'X' && ws._seat !== 'O') return // penonton nggak boleh reset
        room.state = freshState()
        broadcastState(room)
      }
    })

    ws.on('close', () => {
      room.clients.delete(ws)
      if (room.seats.X === ws) room.seats.X = null
      if (room.seats.O === ws) room.seats.O = null
      if (room.clients.size === 0) {
        rooms.delete(roomId)
      } else {
        broadcastState(room)
      }
    })
  })

  logger.success('WebSocket game (/ttt) siap.')
  return wss
}

export default initGameSocket
