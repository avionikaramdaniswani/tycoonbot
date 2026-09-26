import { createGame } from '../../game/tictactoe/engine.js'
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
// Game jalan penuh di sisi client di dalam bubble WA. Matchmaking online
// pakai KODE ROOM 4 digit (Create/Join) — server WS (/ttt) yang mencocokkan
// 2 pemain. Vs AI (Easy/Medium/Hard) & pilihan mode ada di dalam papan.
// Bot cuma perlu mengirim papannya sekali, nggak menyimpan state apa pun.

async function sendBoard(sock, jid, game, quoted) {
  const wsUrl = deriveWsUrl()
  const rawHtml = await renderBoardHtml(game, { wsUrl })

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
                  '🎮 *TIC TAC TOE*\n\nPilih di papan: Create Room / Join Room (main realtime beda HP pakai kode) atau Vs AI (Easy/Medium/Hard).'
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

async function handleLaunch(sock, msg) {
  // Mode (Create/Join/Vs AI) dipilih langsung di dalam papan.
  const game = createGame('PLAYER_X', 'PLAYER_O', msg.from)
  await sendBoard(sock, msg.from, game, msg)
}

async function handleHelp(sock, msg) {
  const text = [
    '📖 CARA MAIN:',
    '',
    `\`${PREFIX}ttt\` — buka papan Tic Tac Toe`,
    '',
    'Di dalam papan ada 3 pilihan:',
    '• *Create Room* — bikin room, dapat kode 4 digit, tunggu lawan.',
    '• *Join Room* — masukin kode room temanmu buat gabung.',
    '• *Vs AI* — lawan bot (Easy / Medium / Hard).',
    '',
    'Online = 2 HP/WA berbeda main realtime lewat kode room yang sama',
    '(butuh server publik / PUBLIC_URL aktif).'
  ].join('\n')

  await sendText(sock, msg.from, '🎮 TIC TAC TOE — Bantuan', text, msg)
}

// ── Command utama ───────────────────────────────────────────

export default {
  name: 'ttt',
  aliases: ['tictactoe'],
  description: 'Game Tic Tac Toe interaktif (online realtime pakai kode room & vs AI)',
  category: 'game',
  async execute({ sock, msg, args }) {
    const sub = (args[0] || '').toLowerCase()

    if (sub === 'help' || sub === 'bantuan') {
      return handleHelp(sock, msg)
    }

    return handleLaunch(sock, msg)
  }
}
