import { createGame, AI_JID } from '../../game/tictactoe/engine.js'
import { renderBoardHtml } from '../../game/tictactoe/render-html.js'

import config from '../../config/index.js'

const PREFIX = config.bot.prefix

// Ubah PUBLIC_URL (http/https) jadi endpoint WebSocket (ws/wss) + path /ttt.
// Kalau PUBLIC_URL kosong, kembalikan '' -> mode Online otomatis nonaktif.
function deriveWsUrl() {
  const base = config.publicUrl
  if (!base) return ''
  const wsBase = base.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws'))
  return wsBase.replace(/\/+$/, '') + '/ttt'
}

// ── Kirim papan interaktif (HTML Primitive / AIRich) ────────────────
// Game berjalan penuh di sisi client di dalam bubble WA — semua state,
// giliran, mode (vs AI / 2 Player), reset & minimax ada di dalam HTML.
// Bot cuma perlu mengirim papannya sekali, nggak menyimpan state apa pun.

async function sendBoard(sock, jid, game, quoted) {
  const wsUrl = deriveWsUrl()
  // Room id ditanam di payload pesan; semua yang buka pesan ini share room.
  const room = `ttt-${game.startedAt}-${Math.random().toString(36).slice(2, 8)}`
  const rawHtml = await renderBoardHtml(game, { wsUrl, room })

  await sock.relayMessage(
    jid,
    {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        botMetadata: {}
      },
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: [
              {
                messageType: 2,
                messageText:
                  '🎮 *TIC TAC TOE*\n\nTap kotak buat main! Ganti mode (🤖 vs AI / 👥 2 Player) & reset ada di dalam papan.'
              }
            ],
            unifiedResponse: {
              data: Buffer.from(
                JSON.stringify({
                  response_id: `ttt-${Date.now()}`,
                  sections: [
                    {
                      view_model: {
                        primitive: {
                          __typename: 'GenAIaeacdsnwHtmlPrimitive',
                          payload: rawHtml,
                          trusted_sources: []
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                      }
                    }
                  ]
                })
              ).toString('base64')
            },
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedAiBotMessageInfo: {
                botJid: '867051314767696@bot'
              },
              forwardOrigin: 4
            }
          }
        }
      }
    },
    { quoted: quoted?.raw }
  )
}

async function sendText(sock, jid, heading, text, quoted) {
  await sock.sendMessage(jid, { text: `*${heading}*\n\n${text}` }, { quoted: quoted?.raw })
}

// ── Handlers ────────────────────────────────────────────────

async function handleLaunch(sock, msg, startMode) {
  // Mode awal ditentukan lewat "lawan": AI_JID -> vs AI, selain itu -> 2 Player.
  // render-html mendeteksi isAi dari game.players, dan mode bisa diganti di HTML.
  const opponent = startMode === 'ai' ? AI_JID : 'PLAYER_O'
  const game = createGame('PLAYER_X', opponent, msg.from)
  await sendBoard(sock, msg.from, game, msg)
}

async function handleHelp(sock, msg) {
  const text = [
    '📖 CARA MAIN:',
    '',
    `\`${PREFIX}ttt\` — buka papan (default vs AI 🤖)`,
    `\`${PREFIX}ttt pvp\` — buka papan mode 2 Player 👥`,
    '',
    'Semua dimainkan langsung di papan:',
    '• Tap kotak untuk jalan.',
    '• Tombol 🤖 vs AI / 👥 2 Player buat ganti mode.',
    '• Tombol ♻️ New buat mulai ulang.',
    '',
    'Mode 2 Player = gantian tap di layar yang sama (pass-and-play).',
    'Mode vs AI = kamu lawan bot (unbeatable).',
    'Mode Online = main real-time beda HP (butuh server publik / PUBLIC_URL).'
  ].join('\n')

  await sendText(sock, msg.from, '🎮 TIC TAC TOE — Bantuan', text, msg)
}

// ── Command utama ───────────────────────────────────────────

export default {
  name: 'ttt',
  aliases: ['tictactoe'],
  description: 'Game Tic Tac Toe interaktif (vs AI & 2 Player, main langsung di papan)',
  category: 'game',
  async execute({ sock, msg, args }) {
    const sub = (args[0] || '').toLowerCase()

    if (sub === 'help' || sub === 'bantuan') {
      return handleHelp(sock, msg)
    }

    // `.ttt pvp` / `.ttt 2p` mulai di mode 2 Player, selain itu default vs AI.
    const startMode = sub === 'pvp' || sub === '2p' || sub === '2player' ? 'pvp' : 'ai'
    return handleLaunch(sock, msg, startMode)
  }
}
