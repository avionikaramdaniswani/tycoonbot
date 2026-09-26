import { AI_JID } from './engine.js'

/**
 * Render Tic Tac Toe sebagai mini-app multi-layar di dalam bubble WA:
 *   Splash -> Main Menu -> (Lobby / Game).
 * Semua UI + logika (AI minimax, mode Online via WebSocket) jalan client-side.
 * Transisi antar-layar pakai loading biar terasa hidup.
 *
 * opts:
 *   wsUrl   - endpoint WebSocket (wss://.../ttt) buat mode Online. '' = nonaktif.
 *   room    - id room yang ditanam di pesan; yang buka pesan sama = 1 room.
 *   members - [{id, name}] daftar peserta grup buat lobby Create Room.
 */
export async function renderBoardHtml(game, opts = {}) {
  const isAi = !!(game.players && (game.players.X === AI_JID || game.players.O === AI_JID))
  const wsUrl = opts.wsUrl || ''
  const room = opts.room || ''
  const members = Array.isArray(opts.members) ? opts.members : []
  const membersJson = JSON.stringify(members)

  const html = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
        <style>
          * { box-sizing: border-box; }
          html,body{margin:0;padding:0;background:#f3efe6;color:#2c2a26;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-tap-highlight-color:transparent;}
          body{padding:22px 16px;}
          .app{width:100%;max-width:340px;margin:0 auto;position:relative;min-height:380px;}
          .screen{display:none;animation:fade .32s ease;}
          .screen.active{display:block;}
          @keyframes fade{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
          .brand{font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#a89b83;text-align:center;}
          .title{font-size:26px;font-weight:800;text-align:center;margin:2px 0 18px;}
          .splash-inner{padding:52px 0;text-align:center;}
          .logo{width:80px;height:80px;margin:0 auto 16px;border-radius:22px;background:#e7e0d1;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;letter-spacing:.05em;color:#2c2a26;}
          .splash-tag{color:#a89b83;font-size:13px;margin-top:16px;}
          .menu{display:flex;flex-direction:column;gap:12px;margin-top:4px;}
          .card{padding:16px;border-radius:16px;border:1px solid #d9d0bd;background:#fbf9f4;cursor:pointer;display:flex;align-items:center;gap:14px;transition:transform .08s ease,background .15s ease;}
          .card:active{transform:scale(.98);background:#f3ede0;}
          .card .ic{width:46px;height:46px;border-radius:13px;background:#e7e0d1;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#2c2a26;flex-shrink:0;}
          .card .ch{font-size:16px;font-weight:700;}
          .card .cs{font-size:12px;color:#a89b83;margin-top:2px;line-height:1.3;}
          .section-head{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
          .section-head .brand{text-align:left;}
          .back{width:36px;height:36px;border-radius:11px;border:1px solid #d9d0bd;background:#fbf9f4;color:#6b6353;font-size:20px;line-height:1;cursor:pointer;flex-shrink:0;}
          .back:active{transform:scale(.95);}
          .sub{font-size:12px;color:#a89b83;margin-top:2px;}
          .list{display:flex;flex-direction:column;gap:8px;max-height:330px;overflow:auto;}
          .player{padding:11px 13px;border-radius:12px;border:1px solid #d9d0bd;background:#fbf9f4;display:flex;align-items:center;gap:12px;cursor:pointer;transition:transform .08s ease;}
          .player:active{transform:scale(.98);}
          .avatar{width:36px;height:36px;border-radius:50%;background:#3a8891;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0;}
          .pname{flex:1;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
          .go{color:#a89b83;font-size:12px;flex-shrink:0;}
          .note{background:#f7edd6;border:1px solid #ecdcb4;color:#8a7748;font-size:12px;padding:10px 12px;border-radius:11px;margin-bottom:12px;line-height:1.35;}
          .empty{color:#a89b83;text-align:center;padding:26px 0;font-size:13px;line-height:1.5;}
          .status{font-size:20px;font-weight:600;text-align:center;margin:2px 0 16px;min-height:26px;}
          .board{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:10px;background:#e7e0d1;border-radius:18px;}
          .cell{aspect-ratio:1/1;background:#fbf9f4;border-radius:12px;display:flex;justify-content:center;align-items:center;font-size:46px;font-weight:700;line-height:1;cursor:pointer;user-select:none;box-shadow:0 1px 0 rgba(0,0,0,.04);transition:background .15s ease,transform .08s ease;}
          .cell.x{color:#d9694a;} .cell.o{color:#3a8891;}
          .number{font-size:18px;font-weight:600;color:#cec4ae;}
          .cell.win{background:#f2c14e;color:#2c2a26;}
          .cell:active{transform:scale(.96);}
          .controls{display:flex;gap:8px;margin-top:16px;}
          .ctrl{flex:1;padding:12px 6px;border-radius:11px;border:1px solid #d9d0bd;background:#fbf9f4;color:#6b6353;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s ease,transform .08s ease;}
          .ctrl:active{transform:scale(.97);}
          .loading{position:absolute;inset:-22px -16px;background:rgba(243,239,230,.9);display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;z-index:50;}
          .loading.show{display:flex;}
          .spinner{width:40px;height:40px;border-radius:50%;border:4px solid #e7e0d1;border-top-color:#3a8891;animation:spin .8s linear infinite;}
          @keyframes spin{to{transform:rotate(360deg);}}
          .loading-text{color:#6b6353;font-size:13px;font-weight:600;}
        </style>
      </head>
      <body>
        <div class="app">
          <section class="screen active" id="screen-splash">
            <div class="splash-inner">
              <div class="logo">XO</div>
              <div class="brand">Game Center</div>
              <div class="title" style="margin-top:6px;">Tic Tac Toe</div>
              <div class="spinner" style="margin:20px auto 0;"></div>
              <div class="splash-tag">Menyiapkan permainan…</div>
            </div>
          </section>
          <section class="screen" id="screen-menu">
            <div class="brand">Tic Tac Toe</div>
            <div class="title">Pilih Mode</div>
            <div class="menu">
              <div class="card" id="menu-room">
                <div class="ic">VS</div>
                <div><div class="ch">Create Room</div><div class="cs">Tantang pemain lain di grup (realtime)</div></div>
              </div>
              <div class="card" id="menu-ai">
                <div class="ic">AI</div>
                <div><div class="ch">vs AI</div><div class="cs">Lawan bot unbeatable</div></div>
              </div>
            </div>
          </section>
          <section class="screen" id="screen-lobby">
            <div class="section-head">
              <button class="back" id="lobby-back">‹</button>
              <div><div class="brand">Create Room</div><div class="sub">Pilih lawanmu</div></div>
            </div>
            <div id="lobby-note"></div>
            <div class="list" id="player-list"></div>
          </section>
          <section class="screen" id="screen-game">
            <div class="section-head">
              <button class="back" id="game-back">‹</button>
              <div class="brand" id="game-mode-label">vs AI</div>
            </div>
            <div class="status" id="status">Giliran X</div>
            <div class="board" id="board"></div>
            <div class="controls">
              <button class="ctrl" id="btn-new">Ulang</button>
            </div>
          </section>
          <div class="loading" id="loading"><div class="spinner"></div><div class="loading-text" id="loading-text">Memuat…</div></div>
        </div>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            const MEMBERS = ${membersJson};
            const WS_URL = ${JSON.stringify(wsUrl)};
            const ROOM = ${JSON.stringify(room)};
            const ONLINE_OK = !!(WS_URL && ROOM);

            let board = ['', '', '', '', '', '', '', '', ''];
            let turn = 'X';
            let isAi = true;
            let mode = 'ai';
            let winner = null;
            let aiThinking = false;
            let gen = 0;
            let ws = null;
            let seat = null;
            let presence = { X: false, O: false };
            let opponentName = '';

            // ── Navigasi antar-layar ──────────────────────────────
            function swapTo(screen) {
              const list = document.querySelectorAll('.screen');
              for (let i = 0; i < list.length; i++) list[i].classList.remove('active');
              document.getElementById('screen-' + screen).classList.add('active');
            }
            function showLoading(text) {
              document.getElementById('loading-text').innerText = text || 'Memuat…';
              document.getElementById('loading').classList.add('show');
            }
            function hideLoading() {
              document.getElementById('loading').classList.remove('show');
            }
            // Pindah layar dengan loading dulu biar terasa realistis.
            function goto(screen, text, delay) {
              showLoading(text);
              setTimeout(function() {
                swapTo(screen);
                hideLoading();
              }, delay || 850);
            }
            // ── Logika game ───────────────────────────────────────
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
                    bd[i] = 'O'; best = Math.max(best, mm(bd, false, depth + 1)); bd[i] = '';
                  }
                  return best;
                } else {
                  let best = Infinity;
                  for (let i = 0; i < 9; i++) {
                    if (bd[i] !== '') continue;
                    bd[i] = 'X'; best = Math.min(best, mm(bd, true, depth + 1)); bd[i] = '';
                  }
                  return best;
                }
              }
              let bestScore = -Infinity, bestMove = -1;
              for (let i = 0; i < 9; i++) {
                if (b[i] !== '') continue;
                b[i] = 'O'; const s = mm(b, false, 1); b[i] = '';
                if (s > bestScore) { bestScore = s; bestMove = i; }
              }
              return bestMove;
            }
            function render() {
              const boardEl = document.getElementById('board');
              let html = '';
              let winLine = checkWinner(board);
              board.forEach(function(mark, i) {
                let cls = mark === 'X' ? 'x' : (mark === 'O' ? 'o' : '');
                if (winLine && winLine.includes(i)) cls += ' win';
                let content = mark ? mark : '<span class="number">' + (i + 1) + '</span>';
                html += '<div class="cell ' + cls + '" data-index="' + i + '">' + content + '</div>';
              });
              boardEl.innerHTML = html;

              const statusEl = document.getElementById('status');
              if (mode === 'online') { statusEl.innerText = onlineStatusText(); return; }
              if (winner) {
                if (winner === 'SERI') statusEl.innerText = 'Seri';
                else if (mode === 'ai') statusEl.innerText = (winner === 'O') ? 'AI menang' : 'Kamu menang';
                else statusEl.innerText = 'Pemain ' + winner + ' menang';
              } else {
                statusEl.innerText = 'Giliran ' + turn;
              }
            }

            function onlineStatusText() {
              if (!ONLINE_OK) return 'Server realtime belum aktif';
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
              gen++; aiThinking = false;
              board = ['', '', '', '', '', '', '', '', ''];
              turn = 'X'; winner = null;
              render();
            }
            // ── Aksi navigasi / mulai mode ────────────────────────
            function openMenu() {
              if (mode === 'online') closeWs();
              gen++; aiThinking = false;
              goto('menu', 'Memuat menu…', 650);
            }
            function openLobby() {
              buildPlayerList();
              goto('lobby', 'Membuka lobby…', 850);
            }
            function startAi() {
              mode = 'ai'; isAi = true;
              gen++; aiThinking = false;
              board = ['', '', '', '', '', '', '', '', ''];
              turn = 'X'; winner = null;
              document.getElementById('game-mode-label').innerText = 'vs AI';
              render();
              goto('game', 'Menyiapkan papan…', 850);
            }
            function startOnline(name) {
              mode = 'online'; isAi = false; opponentName = name || '';
              gen++; aiThinking = false;
              board = ['', '', '', '', '', '', '', '', ''];
              turn = 'X'; winner = null; seat = null; presence = { X: false, O: false };
              document.getElementById('game-mode-label').innerText = name ? ('vs ' + name) : 'Online';
              render();
              goto('game', name ? ('Menantang ' + name + '…') : 'Menyambungkan…', 900);
              connectWs();
            }

            function buildPlayerList() {
              const note = document.getElementById('lobby-note');
              note.innerHTML = ONLINE_OK ? '' :
                '<div class="note">Server realtime belum aktif, jadi tantangan belum bisa dikirim. Set PUBLIC_URL / tunnel dulu ya.</div>';
              const list = document.getElementById('player-list');
              if (!MEMBERS.length) {
                list.innerHTML = '<div class="empty">Daftar pemain tidak tersedia.<br>Buka papan ini di dalam grup.</div>';
                return;
              }
              list.innerHTML = '';
              MEMBERS.forEach(function(m) {
                const nm = m.name || m.id || 'Pemain';
                const row = document.createElement('div');
                row.className = 'player';
                row.innerHTML = '<div class="avatar"></div><div class="pname"></div><div class="go">Tantang ›</div>';
                row.querySelector('.avatar').innerText = nm.trim().charAt(0).toUpperCase() || '?';
                row.querySelector('.pname').innerText = nm;
                row.addEventListener('pointerdown', function(e) { e.preventDefault(); startOnline(nm); });
                list.appendChild(row);
              });
            }
            // ── WebSocket multiplayer (server sebagai wasit) ──────
            function connectWs() {
              if (!ONLINE_OK) { render(); return; }
              closeWs();
              const myGen = gen;
              try {
                ws = new WebSocket(WS_URL + '?room=' + encodeURIComponent(ROOM));
              } catch (e) { render(); return; }
              ws.onopen = function() { render(); };
              ws.onmessage = function(ev) {
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
              ws.onclose = function() { if (mode === 'online' && myGen === gen) render(); };
              ws.onerror = function() {};
            }
            function closeWs() {
              if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} ws = null; }
            }
            function wsSend(obj) {
              if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(obj)); } catch (e) {} }
            }

            // ── Tap di papan ──────────────────────────────────────
            function boardTap(e) {
              const cell = e.target.closest('.cell');
              if (!cell) return;
              e.preventDefault();
              if (aiThinking) return;
              const pos = parseInt(cell.getAttribute('data-index'));
              if (isNaN(pos)) return;

              // Online: server yang jadi wasit, cukup kirim langkah.
              if (mode === 'online') {
                if (!ONLINE_OK || seat === 'spec' || !seat) return;
                if (winner || turn !== seat || board[pos] !== '') return;
                if (!presence.X || !presence.O) return;
                wsSend({ type: 'move', pos: pos });
                return;
              }
              // Mode AI / lokal: papan dikelola di sisi client.
              if (winner || board[pos] !== '') return;
              board[pos] = turn;
              let line = checkWinner(board);
              if (line) { winner = turn; render(); return; }
              if (!board.includes('')) { winner = 'SERI'; render(); return; }

              if (mode === 'ai' && turn === 'X') {
                turn = 'O';
                render();
                // AI "mikir" sebentar biar terasa hidup.
                aiThinking = true;
                const myGen = gen;
                setTimeout(function() {
                  if (myGen !== gen || winner) { aiThinking = false; return; }
                  const move = getBestMove(board.slice());
                  if (move >= 0) board[move] = 'O';
                  let l2 = checkWinner(board);
                  if (l2) winner = 'O';
                  else if (!board.includes('')) winner = 'SERI';
                  else turn = 'X';
                  aiThinking = false;
                  render();
                }, 500 + Math.random() * 500);
              } else {
                turn = (turn === 'X') ? 'O' : 'X';
                render();
              }
            }

            // ── Wiring tombol & event ─────────────────────────────
            document.getElementById('menu-room').addEventListener('pointerdown', function(e) { e.preventDefault(); openLobby(); });
            document.getElementById('menu-ai').addEventListener('pointerdown', function(e) { e.preventDefault(); startAi(); });
            document.getElementById('lobby-back').addEventListener('pointerdown', function(e) { e.preventDefault(); openMenu(); });
            document.getElementById('game-back').addEventListener('pointerdown', function(e) { e.preventDefault(); openMenu(); });
            document.getElementById('btn-new').addEventListener('pointerdown', function(e) {
              e.preventDefault();
              if (mode === 'online') {
                if (seat && seat !== 'spec') wsSend({ type: 'reset' });
              } else {
                resetBoard();
              }
            });
            document.getElementById('board').addEventListener('pointerdown', boardTap);

            // ── Splash → Main Menu otomatis ───────────────────────
            render();
            setTimeout(function() { swapTo('menu'); }, 2200);
          });
        </script>
      </body>
    </html>
  `

  return html
}
