import { AIRich, Button, Toolkit } from '@vanzxy/baileys'

// Patch: @vanzxy/baileys v2.0.3 — AIRich.build() memanggil Toolkit.stringifyEscaped()
// tapi method itu belum ada di shared.js. Tambahkan polyfill supaya tidak crash.
if (typeof Toolkit.stringifyEscaped !== 'function') {
  Toolkit.stringifyEscaped = (obj) => JSON.stringify(obj)
}
import {
  createGame,
  makeMove,
  availableMoves,
  isPlayer,
  markOf,
  AI_JID,
  getBotMove
} from '../../game/tictactoe/engine.js'
import {
  getGame,
  setGame,
  deleteGame,
  getChallenge,
  setChallenge,
  deleteChallenge
} from '../../game/tictactoe/store.js'
import { renderBoardHtml } from '../../game/tictactoe/render-html.js'
import { renderBoardImage } from '../../game/tictactoe/render-image.js'
import { bot } from '../../bot/BotManager.js'

import config from '../../config/index.js'

const PREFIX = config.bot.prefix

// ── Emoji & visual ──────────────────────────────────────────

const MARK_EMOJI = { X: '❌', O: '⭕' }

function mention(jid) {
  if (jid === AI_JID) return '🤖 AI'
  return `@${jid.split('@')[0]}`
}

// ── WEBVIEW WEBSOCKET HANDLER ───────────────────────────────

bot.on('webview_ttt_move', async ({ gameId, pos, socket }) => {
  const game = getGame(gameId)
  if (!game) return

  // Pastikan posisi valid
  const movePos = parseInt(pos, 10)
  if (isNaN(movePos) || movePos < 0 || movePos > 8 || game.board[movePos] !== '') return
  if (game.winner) return

  // Jalankan langkah
  // (Untuk Webview AI, karena Webview tidak tahu siapa pemainnya, kita asumsikan yang mencet adalah X)
  game.board[movePos] = game.turn
  game.turn = game.turn === 'X' ? 'O' : 'X'

  const winCombo = checkWinner(game.board)
  if (winCombo) {
    game.winner = game.board[winCombo[0]]
    game.winLine = winCombo
  } else if (!game.board.includes('')) {
    game.winner = 'SERI'
  } else if (game.isAi && game.turn === 'O') {
    // Jalankan giliran AI
    const aiMove = getBestMove(game.board)
    if (aiMove !== -1) {
      game.board[aiMove] = 'O'
      game.turn = 'X'
      const aiWinCombo = checkWinner(game.board)
      if (aiWinCombo) {
        game.winner = 'O'
        game.winLine = aiWinCombo
      } else if (!game.board.includes('')) {
        game.winner = 'SERI'
      }
    }
  }

  setGame(gameId, game)

  // Update ke Webview agar UI-nya berubah otomatis!
  bot.emit('ttt_update', { gameId, board: game.board })

  // (Opsional: Kalau game selesai, hapus dari memory. Tapi biarkan dulu agar user bisa lihat hasilnya di Webview)
  if (game.winner) {
    // deleteGame(gameId) // Jangan dihapus dulu, biar UI Webview bisa gambar status menang
  }
})

// ── AIRich renderers ────────────────────────────────────────

async function sendBoard(sock, jid, game, statusText, quoted) {
  const p1 = mention(game.players.X)
  const p2 = mention(game.players.O)

  // Render HTML dan Gambar
  const rawHtml = await renderBoardHtml(game)
  const imageBuffer = await renderBoardImage(game)
  
  let text = `🎮 *TIC TAC TOE*\n\n❌ ${p1}  vs  ⭕ ${p2}\n\n${statusText}`

  const msg = new AIRich(sock)

  // 1. Tambahkan Gambar (HTML yg sudah di-render)
  msg.addInlineImage(imageBuffer, { text: "Tic Tac Toe Board" })

  // 2. Teks Status
  msg.addText(text, { header: "Status Game" })

  // 3. (Opsional/Gaya TikTok) Tampilkan Payload Code
  msg.addCode('html', rawHtml)

  // 4. Tombol Langkah via Suggestion Chips
  if (!game.winner) {
    game.board.forEach((mark, i) => {
      if (!mark) {
        msg.addSuggest(`${PREFIX}ttt ${i + 1}`)
      }
    })
    msg.addSuggest(`${PREFIX}ttt quit`)
  }

  await msg.send(jid, { quoted: quoted?.raw })
}

async function sendRich(sock, jid, heading, text, quoted, suggests) {
  // Gunakan Button untuk notifikasi biasa agar konsisten dengan native flow
  const btn = new Button(sock)
    .setBody(`*${heading}*\n\n${text}`)
    
  if (suggests && suggests.length) {
    suggests.forEach((cmd) => {
      const label = cmd.replace(`${PREFIX}ttt `, '').toUpperCase()
      btn.addReply(label, cmd)
    })
  }
  await btn.send(jid, { quoted: quoted?.raw })
}

// ── Sub-commands ────────────────────────────────────────────

async function handleChallenge(sock, msg, args) {
  if (!msg.isGroup) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '⚠️ Game Tic Tac Toe hanya bisa dimainkan di grup!', msg)
    return
  }

  const existing = getGame(msg.from)
  if (existing) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '⚠️ Sudah ada game berjalan di grup ini!\nKetik `.ttt quit` untuk menyerah, atau tunggu sampai selesai.', msg)
    return
  }

  // Cek mention target lawan
  const raw = msg.raw
  const mentions = raw?.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
  const target = mentions[0]

  if (!target) {
    await sendRich(
      sock, msg.from,
      '🎮 TIC TAC TOE',
      '👋 Tantang seseorang!\n\nKetik: `.ttt @pemain`\nContoh: `.ttt @6281234567890`\n\nPemain yang ditantang ketik `.ttt accept` untuk menerima.',
      msg
    )
    return
  }

  if (target === msg.sender) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '😅 Tidak bisa menantang diri sendiri!', msg)
    return
  }

  // Simpan tantangan.
  setChallenge(msg.from, {
    challenger: msg.sender,
    target,
    createdAt: Date.now()
  })

  await sendRich(
    sock, msg.from,
    '🎮 TANTANGAN TIC TAC TOE!',
    `${mention(msg.sender)} menantang ${mention(target)}!\n\n${mention(target)}, ketik \`.ttt accept\` untuk menerima tantangan.\nKetik \`.ttt reject\` untuk menolak.\n\n⏰ Tantangan kadaluarsa dalam 5 menit.`,
    msg,
    [`${PREFIX}ttt accept`, `${PREFIX}ttt reject`]
  )
}

async function handleAccept(sock, msg) {
  const challenge = getChallenge(msg.from)
  if (!challenge) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '❌ Tidak ada tantangan yang aktif.', msg)
    return
  }

  if (msg.sender !== challenge.target) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '⚠️ Tantangan ini bukan untukmu!', msg)
    return
  }

  // Cek kadaluarsa (5 menit).
  if (Date.now() - challenge.createdAt > 5 * 60 * 1000) {
    deleteChallenge(msg.from)
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '⏰ Tantangan sudah kadaluarsa!', msg)
    return
  }

  // Mulai game!
  deleteChallenge(msg.from)
  const game = createGame(challenge.challenger, challenge.target, msg.from)
  setGame(msg.from, game)

  const statusText = `⏳ Giliran: ${mention(game.players.X)} (❌)`
  await sendBoard(sock, msg.from, game, statusText, msg)
}

async function handleReject(sock, msg) {
  const challenge = getChallenge(msg.from)
  if (!challenge) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '❌ Tidak ada tantangan yang aktif.', msg)
    return
  }

  if (msg.sender !== challenge.target) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '⚠️ Tantangan ini bukan untukmu!', msg)
    return
  }

  deleteChallenge(msg.from)
  await sendRich(
    sock, msg.from,
    '🎮 TIC TAC TOE',
    `${mention(challenge.target)} menolak tantangan dari ${mention(challenge.challenger)}. 😢`,
    msg
  )
}

async function handleMove(sock, msg, position) {
  const game = getGame(msg.from)
  if (!game) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '❌ Tidak ada game aktif!\nMulai dengan `.ttt @pemain`', msg)
    return
  }

  if (!isPlayer(game, msg.sender)) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '⚠️ Kamu bukan pemain di game ini!', msg)
    return
  }

  const result = makeMove(game, msg.sender, position)
  if (!result.ok) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', `⚠️ ${result.reason}`, msg)
    return
  }

  // Update store.
  setGame(msg.from, game)

  // Tentukan status text.
  let statusText
  if (game.winner === 'draw') {
    statusText = '🤝 SERI! Tidak ada pemenang.'
    deleteGame(msg.from)
  } else if (game.winner) {
    const winnerJid = game.players[game.winner]
    statusText = `🏆 ${mention(winnerJid)} (${MARK_EMOJI[game.winner]}) MENANG!`
    deleteGame(msg.from)
  } else {
    const nextJid = game.players[game.turn]
    statusText = `⏳ Giliran: ${mention(nextJid)} (${MARK_EMOJI[game.turn]})`
  }

  await sendBoard(sock, msg.from, game, statusText, msg)

  // Kalau lawan adalah AI dan game masih berjalan, AI langsung main.
  if (!game.winner && game.players[game.turn] === AI_JID) {
    await handleAITurn(sock, msg.from, game, msg)
  }
}

async function handleQuit(sock, msg) {
  const game = getGame(msg.from)
  if (!game) {
    // Cek apakah ada challenge pending.
    const challenge = getChallenge(msg.from)
    if (challenge && (msg.sender === challenge.challenger || msg.sender === challenge.target)) {
      deleteChallenge(msg.from)
      await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '🚪 Tantangan dibatalkan.', msg)
      return
    }
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '❌ Tidak ada game aktif!', msg)
    return
  }

  if (!isPlayer(game, msg.sender)) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '⚠️ Kamu bukan pemain di game ini!', msg)
    return
  }

  const mark = markOf(game, msg.sender)
  const opponentMark = mark === 'X' ? 'O' : 'X'
  const winner = game.players[opponentMark]

  deleteGame(msg.from)

  await sendRich(
    sock, msg.from,
    '🎮 TIC TAC TOE',
    `🏳️ ${mention(msg.sender)} menyerah!\n🏆 ${mention(winner)} menang!`,
    msg,
    [`${PREFIX}ttt`]
  )
}

async function handleAI(sock, msg) {
  if (!msg.isGroup) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '⚠️ Game Tic Tac Toe hanya bisa dimainkan di grup!', msg)
    return
  }

  const existing = getGame(msg.from)
  if (existing) {
    await sendRich(sock, msg.from, '🎮 TIC TAC TOE', '⚠️ Sudah ada game berjalan di grup ini!\nKetik `.ttt quit` untuk menyerah.', msg)
    return
  }

  // Player = X (mulai duluan), AI = O.
  const game = createGame(msg.sender, AI_JID, msg.from)
  setGame(msg.from, game)

  const statusText = `⏳ Giliran: ${mention(msg.sender)} (❌)`
  await sendBoard(sock, msg.from, game, statusText, msg)
}

async function handleAITurn(sock, jid, game, msg) {
  const aiMark = game.turn
  const pos = getBotMove(game.board, aiMark)
  makeMove(game, AI_JID, pos)
  setGame(jid, game)

  let statusText
  if (game.winner === 'draw') {
    statusText = '🤝 SERI! Tidak ada pemenang.'
    deleteGame(jid)
  } else if (game.winner) {
    if (game.players[game.winner] === AI_JID) {
      statusText = `🤖 AI (${MARK_EMOJI[game.winner]}) MENANG! Coba lagi!`
    } else {
      const winnerJid = game.players[game.winner]
      statusText = `🏆 ${mention(winnerJid)} (${MARK_EMOJI[game.winner]}) MENANG!`
    }
    deleteGame(jid)
  } else {
    const nextJid = game.players[game.turn]
    statusText = `⏳ Giliran: ${mention(nextJid)} (${MARK_EMOJI[game.turn]})`
  }

  await sendBoard(sock, jid, game, statusText, msg)
}

async function handleHelp(sock, msg) {
  const text = [
    '📖 CARA MAIN:',
    '',
    `\`${PREFIX}ttt @pemain\` — tantang seseorang (PvP)`,
    `\`${PREFIX}ttt ai\` — lawan AI 🤖`,
    `\`${PREFIX}ttt accept\` — terima tantangan`,
    `\`${PREFIX}ttt reject\` — tolak tantangan`,
    `\`${PREFIX}ttt <1-9>\` — pilih posisi`,
    `\`${PREFIX}ttt quit\` — menyerah`,
    '',
    '📐 POSISI PAPAN:',
    ' 1 │ 2 │ 3',
    '───┼───┼───',
    ' 4 │ 5 │ 6',
    '───┼───┼───',
    ' 7 │ 8 │ 9',
    '',
    'Tiga sejajar = menang! (baris/kolom/diagonal)'
  ].join('\n')

  await sendRich(sock, msg.from, '🎮 TIC TAC TOE — Bantuan', text, msg, [`${PREFIX}ttt ai`, `${PREFIX}ttt`])
}

// ── Command utama ───────────────────────────────────────────

export default {
  name: 'ttt',
  aliases: ['tictactoe'],
  description: 'Game Tic Tac Toe (PvP & vs AI di grup)',
  category: 'game',
  async execute({ sock, msg, args }) {
    const sub = (args[0] || '').toLowerCase()

    // `.ttt ai` — lawan bot.
    if (sub === 'ai' || sub === 'bot') {
      return handleAI(sock, msg)
    }

    // `.ttt accept`
    if (sub === 'accept' || sub === 'terima') {
      return handleAccept(sock, msg)
    }

    // `.ttt reject`
    if (sub === 'reject' || sub === 'tolak') {
      return handleReject(sock, msg)
    }

    // `.ttt quit` / `.ttt menyerah`
    if (sub === 'quit' || sub === 'menyerah' || sub === 'stop') {
      return handleQuit(sock, msg)
    }

    // `.ttt help`
    if (sub === 'help' || sub === 'bantuan') {
      return handleHelp(sock, msg)
    }

    // `.ttt <1-9>` — langkah.
    const pos = parseInt(sub, 10)
    if (pos >= 1 && pos <= 9) {
      return handleMove(sock, msg, pos)
    }

    // `.ttt` atau `.ttt @someone` — tantang / mulai.
    return handleChallenge(sock, msg, args)
  }
}
