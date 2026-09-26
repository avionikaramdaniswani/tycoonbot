

import { AI_JID } from './engine.js'

/**
 * Render Tic Tac Toe board murni dari HTML & CSS!
 * Game berjalan penuh di sisi client (seperti Anya Chess) — semua state & AI
 * ada di dalam <script>, jadi klik langsung diproses di dalam bubble WA.
 */
export async function renderBoardHtml(game, opts = {}) {
  // Sel kosong di engine = null; untuk client kita normalkan jadi '' supaya
  // semua perbandingan (=== '') di dalam <script> konsisten.
  const boardForClient = game.board.map((c) => c || '')
  // AI aktif kalau salah satu pemain adalah bot.
  const isAi = !!(game.players && (game.players.X === AI_JID || game.players.O === AI_JID))
  // Untuk mode Online (multiplayer real-time lewat WebSocket di dalam HTML).
  const wsUrl = opts.wsUrl || ''
  const room = opts.room || ''

  const getCell = (mark, index) => {
    let content = mark
    if (!mark) content = `<span class="number">${index + 1}</span>`
    
    let isWin = game.winLine && game.winLine.includes(index)
    // HAPUS onclick inline karena diblokir CSP WhatsApp
    return `<div class="cell ${isWin ? 'win' : ''} ${mark === 'X' ? 'x' : mark === 'O' ? 'o' : ''}" data-index="${index}">${content}</div>`
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background: #f3efe6;
            color: #2c2a26;
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            -webkit-tap-highlight-color: transparent;
          }
          body { padding: 22px 16px; }
          .wrap {
            width: 100%;
            max-width: 340px;
            margin: 0 auto;
          }
          .title {
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #a89b83;
            text-align: center;
            margin-bottom: 4px;
          }
          .status {
            font-size: 20px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 16px;
            min-height: 26px;
          }
          .board {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            padding: 10px;
            background: #e7e0d1;
            border-radius: 18px;
          }
          .cell {
            aspect-ratio: 1 / 1;
            background: #fbf9f4;
            border-radius: 12px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 46px;
            font-weight: 700;
            line-height: 1;
            cursor: pointer;
            user-select: none;
            box-shadow: 0 1px 0 rgba(0,0,0,0.04);
            transition: background .15s ease, transform .08s ease;
          }
          .cell.x { color: #d9694a; }
          .cell.o { color: #3a8891; }
          .number {
            font-size: 18px;
            font-weight: 600;
            color: #cec4ae;
          }
          .cell.win {
            background: #f2c14e;
            color: #2c2a26;
          }
          .cell:active { transform: scale(0.96); }
          .controls {
            display: flex;
            gap: 8px;
            margin-top: 16px;
          }
          .ctrl {
            flex: 1;
            padding: 11px 6px;
            border-radius: 10px;
            border: 1px solid #d9d0bd;
            background: #fbf9f4;
            color: #6b6353;
            font-size: 13px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
            transition: background .15s ease, color .15s ease, transform .08s ease;
          }
          .ctrl.active {
            background: #2c2a26;
            border-color: #2c2a26;
            color: #f3efe6;
          }
          .ctrl:active { transform: scale(0.97); }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="title">Tic Tac Toe</div>
          <div class="status" id="status">Giliran X</div>
          <div class="board" id="board">
            ${game.board.map((mark, i) => getCell(mark, i)).join('')}
          </div>
          <div class="controls">
            <button class="ctrl" data-mode="ai" id="btn-ai">vs AI</button>
            <button class="ctrl" data-mode="pvp" id="btn-pvp">2 Pemain</button>
            <button class="ctrl" data-mode="online" id="btn-online">Online</button>
            <button class="ctrl" id="btn-new">Reset</button>
          </div>
        </div>

        <script>
          document.addEventListener('DOMContentLoaded', function() {
            let board = ${JSON.stringify(boardForClient)};
            let turn = '${game.turn}';
            let isAi = ${isAi};
            let mode = isAi ? 'ai' : 'pvp';
            let winner = null;
            let aiThinking = false;
            let gen = 0;

            // Online (multiplayer via WebSocket yang ditanam di HTML ini).
            const WS_URL = ${JSON.stringify(wsUrl)};
            const ROOM = ${JSON.stringify(room)};
            const ONLINE_OK = !!(WS_URL && ROOM);
            let ws = null;
            let seat = null;
            let presence = { X: false, O: false };

            function checkWinner(b) {
              const lines = [
                [0,1,2],[3,4,5],[6,7,8],
                [0,3,6],[1,4,7],[2,5,8],
                [0,4,8],[2,4,6]
              ];
              for (let line of lines) {
                const [x,y,z] = line;
                if (b[x] && b[x] === b[y] && b[x] === b[z]) return line;
              }
              return null;
            }

            // AI unbeatable (minimax). AI = 'O', pemain = 'X'.
            function getBestMove(b) {
              function winnerOf(bd) {
                const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
                for (const [x,y,z] of L) {
                  if (bd[x] && bd[x] === bd[y] && bd[x] === bd[z]) return bd[x];
                }
                return null;
              }
              function mm(bd, isMax, depth) {
                const w = winnerOf(bd);
                if (w === 'O') return 10 - depth;
                if (w === 'X') return depth - 10;
                if (!bd.includes('')) return 0;
                if (isMax) {
                  let best = -Infinity;
                  for (let i = 0; i < 9; i++) {
                    if (bd[i] !== '') continue;
                    bd[i] = 'O';
                    best = Math.max(best, mm(bd, false, depth + 1));
                    bd[i] = '';
                  }
                  return best;
                } else {
                  let best = Infinity;
                  for (let i = 0; i < 9; i++) {
                    if (bd[i] !== '') continue;
                    bd[i] = 'X';
                    best = Math.min(best, mm(bd, true, depth + 1));
                    bd[i] = '';
                  }
                  return best;
                }
              }
              let bestScore = -Infinity, bestMove = -1;
              for (let i = 0; i < 9; i++) {
                if (b[i] !== '') continue;
                b[i] = 'O';
                const s = mm(b, false, 1);
                b[i] = '';
                if (s > bestScore) { bestScore = s; bestMove = i; }
              }
              return bestMove;
            }

            function render() {
              const boardEl = document.getElementById('board');
              let html = '';
              let winLine = checkWinner(board);
              
              board.forEach((mark, i) => {
                let cellClass = mark === 'X' ? 'x' : (mark === 'O' ? 'o' : '');
                if (winLine && winLine.includes(i)) cellClass += ' win';
                
                let content = mark ? mark : '<span class="number">' + (i + 1) + '</span>';
                html += '<div class="cell ' + cellClass + '" data-index="' + i + '">' + content + '</div>';
              });
              boardEl.innerHTML = html;
              
              const statusEl = document.getElementById('status');
              if (mode === 'online') {
                statusEl.innerText = onlineStatusText();
                return;
              }
              if (winner) {
                if (winner === 'SERI') {
                  statusEl.innerText = 'Seri';
                } else if (mode === 'ai') {
                  statusEl.innerText = (winner === 'O') ? 'AI menang' : 'Kamu menang';
                } else {
                  statusEl.innerText = 'Pemain ' + winner + ' menang';
                }
              } else {
                statusEl.innerText = 'Giliran ' + turn;
              }
            }

            // Teks status khusus mode Online (bergantung kursi & kehadiran lawan).
            function onlineStatusText() {
              if (!ONLINE_OK) return 'Mode Online belum aktif';
              if (!ws || ws.readyState !== 1) return 'Menyambungkan…';
              if (seat === 'spec') {
                if (winner) return winner === 'SERI' ? 'Seri' : 'Pemain ' + winner + ' menang';
                return 'Nonton • Giliran ' + turn;
              }
              if (!seat) return 'Menyambungkan…';
              if (!presence.X || !presence.O) return 'Menunggu lawan…';
              if (winner) {
                if (winner === 'SERI') return 'Seri';
                return winner === seat ? 'Kamu menang' : 'Lawan menang';
              }
              return (turn === seat ? 'Giliranmu' : 'Giliran lawan') + ' • Kamu ' + seat;
            }

            function resetBoard() {
              gen++;
              aiThinking = false;
              board = ['', '', '', '', '', '', '', '', ''];
              turn = 'X';
              winner = null;
              render();
            }

            function updateControls() {
              document.getElementById('btn-ai').classList.toggle('active', mode === 'ai');
              document.getElementById('btn-pvp').classList.toggle('active', mode === 'pvp');
              const onlineBtn = document.getElementById('btn-online');
              onlineBtn.classList.toggle('active', mode === 'online');
              // Kalau server publik belum di-set, tombol Online dinonaktifkan.
              if (!ONLINE_OK) {
                onlineBtn.disabled = true;
                onlineBtn.style.opacity = '0.4';
              }
            }

            function setMode(m) {
              if (m === mode) return;
              // Keluar dari Online -> tutup koneksi biar kursi bebas buat orang lain.
              if (mode === 'online' && m !== 'online') closeWs();
              mode = m;
              isAi = (m === 'ai');
              updateControls();
              if (m === 'online') {
                board = ['', '', '', '', '', '', '', '', ''];
                turn = 'X';
                winner = null;
                seat = null;
                presence = { X: false, O: false };
                gen++;
                aiThinking = false;
                render();
                connectWs();
              } else {
                resetBoard();
              }
            }

            // ── WebSocket multiplayer (server sebagai wasit) ──────────────
            function connectWs() {
              if (!ONLINE_OK) return;
              closeWs();
              const myGen = gen;
              try {
                ws = new WebSocket(WS_URL + '?room=' + encodeURIComponent(ROOM));
              } catch (e) {
                render();
                return;
              }
              ws.onopen = function() { render(); };
              ws.onmessage = function(ev) {
                // Abaikan kalau sudah pindah mode selama koneksi.
                if (mode !== 'online' || myGen !== gen) return;
                let msg;
                try { msg = JSON.parse(ev.data); } catch (e) { return; }
                if (msg.type === 'welcome') {
                  seat = msg.seat;
                } else if (msg.type === 'state') {
                  const s = msg.state;
                  board = s.board.map(function(c) { return c || ''; });
                  turn = s.turn;
                  winner = s.winner || null;
                  if (msg.presence) presence = msg.presence;
                }
                render();
              };
              ws.onclose = function() {
                if (mode === 'online' && myGen === gen) render();
              };
              ws.onerror = function() {};
            }

            function closeWs() {
              if (ws) {
                try { ws.onclose = null; ws.close(); } catch (e) {}
                ws = null;
              }
            }

            function wsSend(obj) {
              if (ws && ws.readyState === 1) {
                try { ws.send(JSON.stringify(obj)); } catch (e) {}
              }
            }

            // Event delegation + pointerdown (seperti Anya Chess) supaya responsif di WA webview.
            document.getElementById('board').addEventListener('pointerdown', function(e) {
              const cell = e.target.closest('.cell');
              if (!cell) return;
              e.preventDefault();

              // Kunci input selama AI lagi "mikir".
              if (aiThinking) return;

              const pos = parseInt(cell.getAttribute('data-index'));
              if (isNaN(pos)) return;

              // Mode Online: server yang jadi wasit — cukup kirim langkah,
              // state datang balik lewat pesan 'state'. Jangan ubah board lokal.
              if (mode === 'online') {
                if (!ONLINE_OK || seat === 'spec' || !seat) return;
                if (winner || turn !== seat || board[pos] !== '') return;
                if (!presence.X || !presence.O) return; // lawan belum ada
                wsSend({ type: 'move', pos: pos });
                return;
              }

              if (winner || board[pos] !== '') return;

              // Langkah pemain.
              board[pos] = turn;
              let winLine = checkWinner(board);

              if (winLine) {
                winner = turn;
                render();
                return;
              }
              if (!board.includes('')) {
                winner = 'SERI';
                render();
                return;
              }

              turn = turn === 'X' ? 'O' : 'X';
              render(); // tampilkan langkah pemain dulu

              // Giliran AI — kasih jeda 2-3 detik biar nggak terasa instan.
              if (isAi && turn === 'O') {
                aiThinking = true;
                const statusEl = document.getElementById('status');
                if (statusEl) statusEl.innerText = 'AI berpikir…';

                const myGen = gen;
                const delay = 2000 + Math.random() * 1000; // 2-3 detik
                setTimeout(function() {
                  // Batal kalau board sudah di-reset / ganti mode selama jeda.
                  if (myGen !== gen) return;

                  const aiMove = getBestMove(board);
                  if (aiMove !== -1) {
                    board[aiMove] = 'O';
                    const wl = checkWinner(board);
                    if (wl) winner = 'O';
                    else if (!board.includes('')) winner = 'SERI';
                    turn = 'X';
                  }
                  aiThinking = false;
                  render();
                }, delay);
              }
            });
            
            document.getElementById('btn-ai').addEventListener('pointerdown', function(e) { e.preventDefault(); setMode('ai'); });
            document.getElementById('btn-pvp').addEventListener('pointerdown', function(e) { e.preventDefault(); setMode('pvp'); });
            document.getElementById('btn-online').addEventListener('pointerdown', function(e) { e.preventDefault(); if (ONLINE_OK) setMode('online'); });
            document.getElementById('btn-new').addEventListener('pointerdown', function(e) {
              e.preventDefault();
              // Di Online, reset harus lewat server biar kedua pemain sinkron.
              if (mode === 'online') { wsSend({ type: 'reset' }); return; }
              resetBoard();
            });

            // Render pertama kali
            updateControls();
            render();
          });
        </script>
      </body>
    </html>
  `

  return html
}
