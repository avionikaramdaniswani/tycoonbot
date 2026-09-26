/**
 * Tic Tac Toe mini-app di dalam bubble WA.
 * Splash -> Menu -> (Create Room = Online realtime) / (Vs AI).
 * Online: native WebSocket ke server (/ttt) sebagai wasit. Layar sambung
 * menampilkan diagnostik nyata (url + state + error) biar ketahuan kalau
 * koneksi gagal — bukan cuma muter "Menyambungkan" tanpa info.
 *
 * opts.wsUrl  = endpoint wss://.../ttt ('' = online nonaktif)
 * opts.room   = id room yang ditanam di pesan (yang buka pesan sama = 1 room)
 * opts.members = [{id,name}] anggota grup (buat info lobby)
 */
export async function renderBoardHtml(game, opts = {}) {
  const members = Array.isArray(opts.members) ? opts.members : []
  const membersJson = JSON.stringify(members)
  const wsUrl = opts.wsUrl || ''
  const room = opts.room || ''

  const html = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
        <style>
          *{box-sizing:border-box;margin:0;padding:0;}
          :root{--bg:#f4ede0;--ink:#161310;--card:#fffdf6;--x:#df5338;--o:#2f8f86;--acc:#f7c331;}
          html,body{background:var(--bg);color:var(--ink);font-family:'Segoe UI',system-ui,-apple-system,Roboto,sans-serif;-webkit-tap-highlight-color:transparent;}
          body{padding:20px 15px;}
          .app{width:100%;max-width:342px;margin:0 auto;position:relative;min-height:410px;}
          .screen{display:none;}
          .screen.active{display:block;animation:pop .32s cubic-bezier(.2,.85,.3,1.3);}
          @keyframes pop{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
          .tag{display:inline-block;background:var(--ink);color:var(--bg);font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;padding:5px 9px;}
          .h1{font-size:31px;font-weight:900;letter-spacing:-.02em;line-height:.95;margin:11px 0 3px;text-transform:uppercase;}
          .lead{color:#7c7161;font-size:13px;font-weight:500;margin-bottom:20px;}
          .menu{display:flex;flex-direction:column;gap:14px;}
          .card{background:var(--card);border:2.5px solid var(--ink);border-radius:15px;box-shadow:5px 5px 0 var(--ink);padding:15px;cursor:pointer;display:flex;align-items:center;gap:13px;transition:transform .09s,box-shadow .09s;}
          .card:active{transform:translate(4px,4px);box-shadow:1px 1px 0 var(--ink);}
          .ic{width:52px;height:52px;border-radius:12px;border:2.5px solid var(--ink);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;flex-shrink:0;}
          .ic.a{background:var(--x);color:#fff;}
          .ic.b{background:var(--o);color:#fff;}
          .ch{font-size:17px;font-weight:800;}
          .cs{font-size:12px;color:#7c7161;margin-top:2px;line-height:1.3;}
          .arw{margin-left:auto;font-size:22px;font-weight:900;}
          .head{display:flex;align-items:center;gap:11px;margin-bottom:18px;}
          .back{width:44px;height:44px;border-radius:11px;border:2.5px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);font-size:22px;font-weight:900;line-height:1;cursor:pointer;flex-shrink:0;color:var(--ink);}
          .back:active{transform:translate(3px,3px);box-shadow:0 0 0 var(--ink);}
          .htitle{font-size:19px;font-weight:900;text-transform:uppercase;letter-spacing:-.01em;}
          .hsub{font-size:12px;color:#7c7161;margin-top:1px;}
          .list{display:flex;flex-direction:column;gap:10px;max-height:340px;overflow:auto;}
          .player{background:var(--card);border:2.5px solid var(--ink);border-radius:13px;box-shadow:4px 4px 0 var(--ink);padding:11px 13px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:transform .09s,box-shadow .09s;}
          .player:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--ink);}
          .av{width:40px;height:40px;border-radius:10px;border:2.5px solid var(--ink);background:var(--acc);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;flex-shrink:0;}
          .pn{flex:1;font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
          .vs{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--x);}
          .note{background:var(--acc);border:2.5px solid var(--ink);border-radius:11px;box-shadow:4px 4px 0 var(--ink);font-size:12px;font-weight:600;padding:11px 12px;margin-bottom:14px;line-height:1.35;}
          .empty{text-align:center;padding:34px 14px;font-size:13px;font-weight:600;color:#7c7161;line-height:1.5;}
          .status{display:inline-block;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.02em;background:var(--ink);color:var(--bg);padding:8px 14px;border-radius:9px;margin-bottom:16px;}
          .diag{display:none;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;background:var(--card);border:2px dashed var(--ink);border-radius:10px;padding:10px 12px;margin-bottom:14px;word-break:break-all;}
          .diag.show{display:block;}
          .diag b{color:var(--x);}
          .board{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
          .cell{aspect-ratio:1/1;background:var(--card);border:2.5px solid var(--ink);border-radius:14px;box-shadow:4px 4px 0 var(--ink);display:flex;justify-content:center;align-items:center;font-size:48px;font-weight:900;line-height:1;cursor:pointer;user-select:none;transition:transform .07s,box-shadow .07s;}
          .cell:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--ink);}
          .cell.x{color:var(--x);}
          .cell.o{color:var(--o);}
          .cell.win{background:var(--acc);}
          .num{font-size:15px;font-weight:800;color:#d8cdb6;}
          .ctrl{width:100%;margin-top:18px;padding:14px;border-radius:12px;border:2.5px solid var(--ink);background:var(--acc);box-shadow:5px 5px 0 var(--ink);font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;font-family:inherit;cursor:pointer;color:var(--ink);}
          .ctrl:active{transform:translate(4px,4px);box-shadow:1px 1px 0 var(--ink);}
          .splash{text-align:center;padding:60px 0;}
          .logo{width:92px;height:92px;margin:0 auto;border-radius:20px;border:3px solid var(--ink);background:var(--card);box-shadow:6px 6px 0 var(--ink);display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:900;}
          .logo b:first-child{color:var(--x);}
          .logo b:last-child{color:var(--o);}
          .dots{display:flex;gap:7px;justify-content:center;margin-top:26px;}
          .dots i{width:11px;height:11px;border-radius:50%;background:var(--ink);animation:bounce .6s infinite alternate;}
          .dots i:nth-child(2){animation-delay:.15s;}
          .dots i:nth-child(3){animation-delay:.3s;}
          @keyframes bounce{to{transform:translateY(-9px);opacity:.4;}}
          .overlay{position:absolute;inset:-20px -15px;background:rgba(244,237,224,.94);display:none;align-items:center;justify-content:center;flex-direction:column;gap:16px;z-index:40;padding:20px;}
          .overlay.show{display:flex;}
          .otext{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;}
          .modal-card{background:var(--card);border:3px solid var(--ink);border-radius:18px;box-shadow:7px 7px 0 var(--ink);padding:26px 22px;text-align:center;max-width:290px;animation:pop .3s cubic-bezier(.2,.85,.3,1.4);}
          .modal-badge{width:66px;height:66px;margin:0 auto 14px;border-radius:16px;border:3px solid var(--ink);background:var(--x);color:#fff;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;}
          .modal-t{font-size:23px;font-weight:900;text-transform:uppercase;letter-spacing:-.01em;}
          .modal-s{font-size:14px;color:#5f574a;font-weight:600;margin-top:7px;line-height:1.4;}
          .modal-btns{display:flex;gap:11px;margin-top:22px;}
          .mbtn{flex:1;padding:13px;border-radius:11px;border:2.5px solid var(--ink);font-size:14px;font-weight:900;text-transform:uppercase;font-family:inherit;cursor:pointer;box-shadow:4px 4px 0 var(--ink);color:var(--ink);}
          .mbtn:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--ink);}
          .mbtn.yes{background:var(--o);color:#fff;}
          .mbtn.no{background:var(--card);}
        </style>
      </head>
      <body>
        <div class="app">
          <section class="screen active" id="s-splash">
            <div class="splash">
              <div class="logo"><b>X</b><b>O</b></div>
              <div class="h1" style="margin-top:22px;">Tic Tac Toe</div>
              <div class="lead" style="margin-bottom:0;">Game Center</div>
              <div class="dots"><i></i><i></i><i></i></div>
            </div>
          </section>
          <section class="screen" id="s-menu">
            <span class="tag">Game Center</span>
            <div class="h1">Tic<br>Tac Toe</div>
            <div class="lead">Pilih cara main kamu.</div>
            <div class="menu">
              <div class="card" id="m-room">
                <div class="ic a">VS</div>
                <div><div class="ch">Create Room</div><div class="cs">Tantang teman di grup</div></div>
                <div class="arw">›</div>
              </div>
              <div class="card" id="m-ai">
                <div class="ic b">AI</div>
                <div><div class="ch">Vs AI</div><div class="cs">Lawan bot unbeatable</div></div>
                <div class="arw">›</div>
              </div>
            </div>
          </section>
          <section class="screen" id="s-lobby">
            <div class="head">
              <button class="back" id="l-back">‹</button>
              <div><div class="htitle">Create Room</div><div class="hsub">Pilih lawanmu</div></div>
            </div>
            <div id="l-note"></div>
            <div class="list" id="p-list"></div>
          </section>
          <section class="screen" id="s-game">
            <div class="head">
              <button class="back" id="g-back">‹</button>
              <div><div class="htitle" id="g-label">Vs AI</div><div class="hsub" id="g-sub">Papan permainan</div></div>
            </div>
            <div class="status" id="status">Giliran X</div>
            <div class="diag" id="diag"></div>
            <div class="board" id="board"></div>
            <button class="ctrl" id="btn-new">Main Lagi</button>
          </section>
          <div class="overlay" id="loading"><div class="dots"><i></i><i></i><i></i></div><div class="otext" id="loading-text">Memuat</div></div>
          <div class="overlay" id="modal">
            <div class="modal-card">
              <div class="modal-badge">!</div>
              <div class="modal-t" id="modal-t">Tantang</div>
              <div class="modal-s" id="modal-s">Kamu ditantang</div>
              <div class="modal-btns">
                <button class="mbtn no" id="modal-no">Batal</button>
                <button class="mbtn yes" id="modal-yes">Tantang</button>
              </div>
            </div>
          </div>
        </div>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            const MEMBERS = ${membersJson};
            const WS_URL = ${JSON.stringify(wsUrl)};
            const ROOM = ${JSON.stringify(room)};
            const ONLINE_OK = !!(WS_URL && ROOM);

            let board = ['','','','','','','','',''];
            let turn = 'X';
            let mode = 'ai';
            let winner = null;
            let aiThinking = false;
            let gen = 0;
            let oppName = '';
            let pending = '';
            let pendingTarget = '';
            let pendingChallenge = '';
            let ws = null;
            let seat = null;
            let presence = { X: false, O: false };
            let lastEvt = 'init';
            function swapTo(id) {
              const list = document.querySelectorAll('.screen');
              for (let i = 0; i < list.length; i++) list[i].classList.remove('active');
              document.getElementById('s-' + id).classList.add('active');
            }
            function showLoading(t) {
              document.getElementById('loading-text').innerText = t || 'Memuat';
              document.getElementById('loading').classList.add('show');
            }
            function hideLoading() { document.getElementById('loading').classList.remove('show'); }
            function goto(id, t, d) {
              showLoading(t);
              setTimeout(function() { swapTo(id); hideLoading(); }, d || 780);
            }
            function showModal(m) {
              pending = (m && m.name) || '';
              pendingTarget = (m && m.id) || '';
              document.getElementById('modal-t').innerText = 'Tantang?';
              document.getElementById('modal-s').innerText =
                'Tantang ' + pending + '? Dia bakal di-tag di chat biar dapat notif & tinggal buka papan yang sama.';
              document.getElementById('modal').classList.add('show');
            }
            function hideModal() { document.getElementById('modal').classList.remove('show'); }
            function checkWinner(b) {
              const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
              for (let ln of L) { const x = ln[0], y = ln[1], z = ln[2]; if (b[x] && b[x] === b[y] && b[x] === b[z]) return ln; }
              return null;
            }
            function getBestMove(b) {
              function won(bd) {
                const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
                for (const ln of L) { if (bd[ln[0]] && bd[ln[0]] === bd[ln[1]] && bd[ln[0]] === bd[ln[2]]) return bd[ln[0]]; }
                return null;
              }
              function mm(bd, isMax, d) {
                const w = won(bd);
                if (w === 'O') return 10 - d;
                if (w === 'X') return d - 10;
                if (!bd.includes('')) return 0;
                let best = isMax ? -Infinity : Infinity;
                for (let i = 0; i < 9; i++) {
                  if (bd[i] !== '') continue;
                  bd[i] = isMax ? 'O' : 'X';
                  const s = mm(bd, !isMax, d + 1);
                  bd[i] = '';
                  best = isMax ? Math.max(best, s) : Math.min(best, s);
                }
                return best;
              }
              let bs = -Infinity, bm = -1;
              for (let i = 0; i < 9; i++) {
                if (b[i] !== '') continue;
                b[i] = 'O'; const s = mm(b, false, 1); b[i] = '';
                if (s > bs) { bs = s; bm = i; }
              }
              return bm;
            }
            function stateName(w) {
              if (!w) return 'null';
              return ['CONNECTING','OPEN','CLOSING','CLOSED'][w.readyState];
            }
            function updateDiag() {
              const d = document.getElementById('diag');
              if (mode !== 'online') { d.classList.remove('show'); return; }
              const connected = ws && ws.readyState === 1 && seat;
              if (connected && (presence.X && presence.O)) { d.classList.remove('show'); return; }
              d.classList.add('show');
              let html = '';
              html += '<b>WS:</b> ' + (WS_URL || '(kosong — tunnel belum aktif)') + '<br>';
              html += '<b>ROOM:</b> ' + (ROOM || '(kosong)') + '<br>';
              html += '<b>STATE:</b> ' + stateName(ws) + '<br>';
              html += '<b>SEAT:</b> ' + (seat || '-') + ' | <b>EVT:</b> ' + lastEvt + '<br>';
              html += '<b>HADIR:</b> X=' + (presence.X ? 'ya' : '-') + ' O=' + (presence.O ? 'ya' : '-');
              d.innerHTML = html;
            }
            function statusText() {
              if (mode === 'online') return onlineStatus();
              if (winner) {
                if (winner === 'SERI') return 'Seri!';
                if (mode === 'ai') return winner === 'O' ? 'AI Menang' : 'Kamu Menang';
                return (winner === 'X' ? 'Kamu' : oppName) + ' Menang';
              }
              if (mode === 'ai') return turn === 'X' ? 'Giliranmu' : 'AI Mikir';
              return turn === 'X' ? 'Giliran Kamu' : 'Giliran ' + oppName;
            }
            function onlineStatus() {
              if (!ONLINE_OK) return 'Server Offline';
              if (!ws || ws.readyState !== 1) return 'Menyambungkan';
              if (!seat) return 'Menyambungkan';
              if (seat === 'spec') {
                if (winner) return winner === 'SERI' ? 'Seri!' : 'Pemain ' + winner + ' Menang';
                return 'Nonton - Giliran ' + turn;
              }
              if (!presence.X || !presence.O) return 'Menunggu Lawan';
              if (winner) {
                if (winner === 'SERI') return 'Seri!';
                return winner === seat ? 'Kamu Menang' : 'Lawan Menang';
              }
              return (turn === seat ? 'Giliranmu' : 'Giliran Lawan') + ' - Kamu ' + seat;
            }
            function render() {
              const el = document.getElementById('board');
              const wl = checkWinner(board);
              let h = '';
              board.forEach(function(m, i) {
                let c = m === 'X' ? 'x' : (m === 'O' ? 'o' : '');
                if (wl && wl.indexOf(i) > -1) c += ' win';
                const inner = m ? m : '<span class="num">' + (i + 1) + '</span>';
                h += '<div class="cell ' + c + '" data-i="' + i + '">' + inner + '</div>';
              });
              el.innerHTML = h;
              document.getElementById('status').innerText = statusText();
              updateDiag();
            }
            function resetBoard() {
              gen++; aiThinking = false;
              board = ['','','','','','','','',''];
              turn = 'X'; winner = null;
              render();
            }
            function openMenu() {
              gen++; aiThinking = false;
              if (mode === 'online') closeWs();
              goto('menu', 'Memuat', 600);
            }
            function openLobby() { buildList(); goto('lobby', 'Membuka lobby', 720); }
            function startAi() {
              mode = 'ai'; resetBoard();
              document.getElementById('g-label').innerText = 'Vs AI';
              document.getElementById('g-sub').innerText = 'Kamu (X) vs Bot (O)';
              goto('game', 'Menyiapkan papan', 720);
            }
            function startOnline(name, targetId) {
              mode = 'online'; oppName = name || '';
              pendingChallenge = targetId || '';
              gen++; aiThinking = false;
              board = ['','','','','','','','',''];
              turn = 'X'; winner = null; seat = null; presence = { X: false, O: false }; lastEvt = 'start';
              document.getElementById('g-label').innerText = 'Online';
              document.getElementById('g-sub').innerText = name ? ('vs ' + name) : 'Realtime multiplayer';
              render();
              goto('game', name ? ('Menantang ' + name) : 'Menyambungkan', 900);
              connectWs();
            }
            function connectWs() {
              if (!ONLINE_OK) { lastEvt = 'no-url'; render(); return; }
              closeWs();
              const g = gen;
              try {
                lastEvt = 'connecting';
                ws = new WebSocket(WS_URL + '?room=' + encodeURIComponent(ROOM));
              } catch (err) {
                lastEvt = 'throw:' + (err && err.message ? err.message : err);
                render();
                return;
              }
              ws.onopen = function() { lastEvt = 'open'; render(); };
              ws.onmessage = function(ev) {
                if (mode !== 'online' || g !== gen) return;
                lastEvt = 'msg';
                let msg;
                try { msg = JSON.parse(ev.data); } catch (e) { return; }
                if (msg.type === 'welcome') {
                  seat = msg.seat;
                  // Begitu tersambung & dapat kursi, minta server nge-tag lawan
                  // yang kita pilih di chat grup (undangan cross-device).
                  if (pendingChallenge) {
                    wsSend({ type: 'challenge', targetId: pendingChallenge });
                    pendingChallenge = '';
                  }
                }
                else if (msg.type === 'state') {
                  const s = msg.state;
                  board = s.board.map(function(c) { return c || ''; });
                  turn = s.turn; winner = s.winner || null;
                  if (msg.presence) presence = msg.presence;
                }
                else if (msg.type === 'challenged') {
                  oppName = msg.name || oppName;
                  lastEvt = 'tag-terkirim';
                  document.getElementById('g-sub').innerText = 'Undangan terkirim ke ' + (msg.name || 'lawan');
                }
                else if (msg.type === 'error') {
                  lastEvt = 'err:' + (msg.message || '?');
                }
                render();
              };
              ws.onerror = function() { lastEvt = 'error'; if (mode === 'online' && g === gen) render(); };
              ws.onclose = function(e) { lastEvt = 'close:' + (e && e.code); if (mode === 'online' && g === gen) render(); };
            }
            function closeWs() {
              if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} ws = null; }
              seat = null; presence = { X: false, O: false };
            }
            function wsSend(obj) {
              if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(obj)); } catch (e) {} }
            }
            function buildList() {
              const note = document.getElementById('l-note');
              note.innerHTML = ONLINE_OK
                ? '<div class="note">Pilih lawan lalu Terima. Lawan cukup buka papan/pesan yang sama buat gabung realtime.</div>'
                : '<div class="note">Server realtime belum aktif (WS kosong). Set tunnel dulu, cek diagnostik di layar game.</div>';
              const list = document.getElementById('p-list');
              if (!MEMBERS.length) {
                list.innerHTML = '<div class="empty">Belum ada anggota grup yang bisa ditantang.<br>Buka papan ini di dalam grup.</div>';
                return;
              }
              list.innerHTML = '';
              MEMBERS.forEach(function(m) {
                const nm = (m.name || m.id || 'Pemain').toString();
                const row = document.createElement('div');
                row.className = 'player';
                row.innerHTML = '<div class="av"></div><div class="pn"></div><div class="vs">Tantang</div>';
                row.querySelector('.av').innerText = (nm.trim().charAt(0) || '?').toUpperCase();
                row.querySelector('.pn').innerText = nm;
                row.addEventListener('pointerdown', function(e) { e.preventDefault(); showModal(m); });
                list.appendChild(row);
              });
            }
            function boardTap(e) {
              const cell = e.target.closest('.cell');
              if (!cell) return;
              e.preventDefault();
              if (aiThinking) return;
              const pos = parseInt(cell.getAttribute('data-i'), 10);
              if (isNaN(pos)) return;
              if (mode === 'online') {
                if (!ONLINE_OK || !seat || seat === 'spec') return;
                if (winner || turn !== seat || board[pos] !== '') return;
                if (!presence.X || !presence.O) return;
                wsSend({ type: 'move', pos: pos });
                return;
              }
              if (winner || board[pos] !== '') return;
              board[pos] = turn;
              if (checkWinner(board)) { winner = turn; render(); return; }
              if (!board.includes('')) { winner = 'SERI'; render(); return; }
              if (mode === 'ai') {
                turn = 'O'; render();
                aiThinking = true;
                const g = gen;
                setTimeout(function() {
                  if (g !== gen || winner) { aiThinking = false; return; }
                  const mv = getBestMove(board.slice());
                  if (mv >= 0) board[mv] = 'O';
                  if (checkWinner(board)) winner = 'O';
                  else if (!board.includes('')) winner = 'SERI';
                  else turn = 'X';
                  aiThinking = false; render();
                }, 480 + Math.random() * 520);
              } else {
                turn = turn === 'X' ? 'O' : 'X'; render();
              }
            }
            document.getElementById('m-room').addEventListener('pointerdown', function(e){ e.preventDefault(); openLobby(); });
            document.getElementById('m-ai').addEventListener('pointerdown', function(e){ e.preventDefault(); startAi(); });
            document.getElementById('l-back').addEventListener('pointerdown', function(e){ e.preventDefault(); openMenu(); });
            document.getElementById('g-back').addEventListener('pointerdown', function(e){ e.preventDefault(); openMenu(); });
            document.getElementById('btn-new').addEventListener('pointerdown', function(e){
              e.preventDefault();
              if (mode === 'online') { if (seat && seat !== 'spec') wsSend({ type: 'reset' }); }
              else resetBoard();
            });
            document.getElementById('board').addEventListener('pointerdown', boardTap);
            document.getElementById('modal-no').addEventListener('pointerdown', function(e){ e.preventDefault(); hideModal(); });
            document.getElementById('modal-yes').addEventListener('pointerdown', function(e){ e.preventDefault(); var n = pending; var t = pendingTarget; hideModal(); startOnline(n, t); });

            render();
            setTimeout(function(){ swapTo('menu'); }, 2100);
          });
        </script>
      </body>
    </html>
`

  return html
}
