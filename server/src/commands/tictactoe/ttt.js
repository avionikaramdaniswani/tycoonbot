import { AIRich } from '@vanzxy/baileys'
import {
  createGame,
  makeMove,
  availableMoves,
  isPlayer,
  markOf
} from '../../game/tictactoe/engine.js'
import {
  getGame,
  setGame,
  deleteGame,
  getChallenge,
  setChallenge,
  deleteChallenge
} from '../../game/tictactoe/store.js'
import config from '../../config/index.js'

const PREFIX = config.bot.prefix

// ── Emoji & visual ──────────────────────────────────────────

const MARK_EMOJI = { X: '❌', O: '⭕' }
const NUM_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']

function cellEmoji(board, index) {
  if (board[index] === 'X') return '❌'
  if (board[index] === 'O') return '⭕'
  return NUM_EMOJI[index]  // posisi kosong → tampilkan nomornya
}

function boardText(board, winLine) {
  const c = (i) => {
    const emoji = cellEmoji(board, i)
    // Highlight garis pemenang
    if (winLine && winLine.includes(i)) return `⟪${emoji}⟫`
    return ` ${emoji} `
  }
  return [
    `${c(0)}│${c(1)}│${c(2)}`,
    '────┼────┼────',
    `${c(3)}│${c(4)}│${c(5)}`,
    '────┼────┼────',
    `${c(6)}│${c(7)}│${c(8)}`
  ].join('\n')
}

function mention(jid) {
  return `@${jid.split('@')[0]}`
}

// ── AIRich renderers ────────────────────────────────────────

async function sendBoard(sock, jid, game, statusText, quoted) {
  const board = boardText(game.board, game.winLine)

  const p1 = mention(game.players.X)
  const p2 = mention(game.players.O)

  const rich = new AIRich(sock)
    .addHeading('🎮 TIC TAC TOE')
    .addText(board)
    .addDivider()
    .addText(`❌ ${p1}  vs  ⭕ ${p2}`)
    .addText(statusText)

  // Kalau game masih berjalan, tambahkan suggest buttons.
  if (!game.winner) {
    const moves = availableMoves(game)
    const suggestions = moves.map((pos) => `${PREFIX}ttt ${pos}`)
    rich.addSuggest(suggestions)
  }

  await rich.send(jid, { quoted: quoted?.raw })
}

async function sendRich(sock, jid, heading, text, quoted, suggests) {
  const rich = new AIRich(sock)
    .addHeading(heading)
    .addText(text)
  if (suggests && suggests.length) {
    rich.addSuggest(suggests)
  }
  await rich.send(jid, { quoted: quoted?.raw })
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

async function handleHelp(sock, msg) {
  const text = [
    '📖 CARA MAIN:',
    '',
    `\`${PREFIX}ttt @pemain\` — tantang seseorang`,
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

  await sendRich(sock, msg.from, '🎮 TIC TAC TOE — Bantuan', text, msg, [`${PREFIX}ttt`])
}

// ── Command utama ───────────────────────────────────────────

export default {
  name: 'ttt',
  aliases: ['tictactoe'],
  description: 'Game Tic Tac Toe (PvP di grup)',
  category: 'game',
  async execute({ sock, msg, args }) {
    const sub = (args[0] || '').toLowerCase()

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
