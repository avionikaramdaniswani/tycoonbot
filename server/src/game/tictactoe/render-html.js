/**
 * Tic Tac Toe mini-app di dalam bubble WA.
 * Menu: Create Room / Join Room (online realtime pakai KODE ROOM) / Vs AI.
 *
 * Online: native WebSocket ke server (/ttt). Create -> dapat kode 4 digit &
 * nunggu; Join -> masukin kode lawan. Server yang mencocokkan 2 pemain dan
 * jadi wasit. Layar game nampilin diagnostik kalau koneksi bermasalah.
 *
 * Vs AI: minimax dengan 3 tingkat kesulitan (Easy = asal, Medium = reaktif,
 * Hard = unbeatable).
 *
 * opts.wsUrl = endpoint wss://.../ttt ('' = online nonaktif)
 */
export async function renderBoardHtml(game, opts = {}) {
  const wsUrl = opts.wsUrl || ''

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
          .app{width:100%;max-width:342px;margin:0 auto;position:relative;min-height:430px;}
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
          .ic.c{background:var(--acc);color:var(--ink);}
          .ch{font-size:17px;font-weight:800;}
          .cs{font-size:12px;color:#7c7161;margin-top:2px;line-height:1.3;}
          .arw{margin-left:auto;font-size:22px;font-weight:900;}
          .head{display:flex;align-items:center;gap:11px;margin-bottom:18px;}
          .back{width:44px;height:44px;border-radius:11px;border:2.5px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);font-size:22px;font-weight:900;line-height:1;cursor:pointer;flex-shrink:0;color:var(--ink);}
          .back:active{transform:translate(3px,3px);box-shadow:0 0 0 var(--ink);}
          .htitle{font-size:19px;font-weight:900;text-transform:uppercase;letter-spacing:-.01em;}
          .hsub{font-size:12px;color:#7c7161;margin-top:1px;}
          .status{display:inline-block;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.02em;background:var(--ink);color:var(--bg);padding:8px 14px;border-radius:9px;margin-bottom:16px;}
          .diag{display:none;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;background:var(--card);border:2px dashed var(--ink);border-radius:10px;padding:10px 12px;margin-bottom:14px;word-break:break-all;}
          .diag.show{display:block;}
          .diag b{color:var(--x);}
          .codebar{background:var(--acc);border:2.5px solid var(--ink);border-radius:13px;box-shadow:4px 4px 0 var(--ink);padding:12px 14px;margin-bottom:14px;text-align:center;}
          .codebar.err{background:var(--x);color:#fff;}
          .codebar .cl{font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;}
          .codebar .cv{font-size:34px;font-weight:900;letter-spacing:.16em;line-height:1.05;margin-top:2px;}
          .codebar .ct{font-size:11px;font-weight:600;margin-top:3px;opacity:.85;}
          .board{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
          .cell{aspect-ratio:1/1;background:var(--card);border:2.5px solid var(--ink);border-radius:14px;box-shadow:4px 4px 0 var(--ink);display:flex;justify-content:center;align-items:center;font-size:48px;font-weight:900;line-height:1;cursor:pointer;user-select:none;transition:transform .07s,box-shadow .07s;}
          .cell:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--ink);}
          .cell.x{color:var(--x);}
          .cell.o{color:var(--o);}
          .cell.win{background:var(--acc);}
          .num{font-size:15px;font-weight:800;color:#d8cdb6;}
          .ctrl{width:100%;margin-top:18px;padding:14px;border-radius:12px;border:2.5px solid var(--ink);background:var(--acc);box-shadow:5px 5px 0 var(--ink);font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;font-family:inherit;cursor:pointer;color:var(--ink);}
          .ctrl:active{transform:translate(4px,4px);box-shadow:1px 1px 0 var(--ink);}
          .code-slots{display:flex;gap:11px;justify-content:center;margin:6px 0 4px;}
          .slot{width:56px;height:66px;border:2.5px solid var(--ink);border-radius:13px;background:var(--card);box-shadow:4px 4px 0 var(--ink);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;}
          .slot.f{background:var(--acc);}
          .jmsg{text-align:center;font-size:12px;font-weight:700;color:var(--x);min-height:16px;margin:14px 0 4px;}
          .keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-top:6px;}
          .key{padding:15px 0;border:2.5px solid var(--ink);border-radius:13px;background:var(--card);box-shadow:4px 4px 0 var(--ink);font-size:23px;font-weight:900;text-align:center;cursor:pointer;color:var(--ink);font-family:inherit;user-select:none;}
          .key:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--ink);}
          .key.ok{background:var(--o);color:#fff;}
          .key.del{background:var(--card);}
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
              <div class="card" id="m-create">
                <div class="ic a">+</div>
                <div><div class="ch">Create Room</div><div class="cs">Bikin room, bagikan kodenya</div></div>
                <div class="arw">›</div>
              </div>
              <div class="card" id="m-join">
                <div class="ic b">#</div>
                <div><div class="ch">Join Room</div><div class="cs">Masuk pakai kode room</div></div>
                <div class="arw">›</div>
              </div>
              <div class="card" id="m-ai">
                <div class="ic c">AI</div>
                <div><div class="ch">Vs AI</div><div class="cs">Lawan bot (Easy/Medium/Hard)</div></div>
                <div class="arw">›</div>
              </div>
            </div>
          </section>
          <section class="screen" id="s-ai">
            <div class="head">
              <button class="back" id="a-back">‹</button>
              <div><div class="htitle">Vs AI</div><div class="hsub">Pilih tingkat kesulitan</div></div>
            </div>
            <div class="menu">
              <div class="card" data-diff="easy">
                <div class="ic b">E</div>
                <div><div class="ch">Easy</div><div class="cs">Santai — AI jalan asal</div></div>
                <div class="arw">›</div>
              </div>
              <div class="card" data-diff="medium">
                <div class="ic c">M</div>
                <div><div class="ch">Medium</div><div class="cs">Nyerang & bertahan, masih bisa dikalahin</div></div>
                <div class="arw">›</div>
              </div>
              <div class="card" data-diff="hard">
                <div class="ic a">H</div>
                <div><div class="ch">Hard</div><div class="cs">Unbeatable — mustahil menang</div></div>
                <div class="arw">›</div>
              </div>
            </div>
          </section>
          <section class="screen" id="s-join">
            <div class="head">
              <button class="back" id="j-back">‹</button>
              <div><div class="htitle">Join Room</div><div class="hsub">Masukin kode 4 digit</div></div>
            </div>
            <div class="code-slots" id="j-slots">
              <div class="slot"></div><div class="slot"></div><div class="slot"></div><div class="slot"></div>
            </div>
            <div class="jmsg" id="j-msg"></div>
            <div class="keypad" id="j-pad">
              <div class="key" data-k="1">1</div><div class="key" data-k="2">2</div><div class="key" data-k="3">3</div>
              <div class="key" data-k="4">4</div><div class="key" data-k="5">5</div><div class="key" data-k="6">6</div>
              <div class="key" data-k="7">7</div><div class="key" data-k="8">8</div><div class="key" data-k="9">9</div>
              <div class="key del" data-k="del">⌫</div><div class="key" data-k="0">0</div><div class="key ok" data-k="ok">✓</div>
            </div>
          </section>
          <section class="screen" id="s-game">
            <div class="head">
              <button class="back" id="g-back">‹</button>
              <div><div class="htitle" id="g-label">Vs AI</div><div class="hsub" id="g-sub">Papan permainan</div></div>
            </div>
            <div class="codebar" id="codebar" style="display:none;"></div>
            <div class="status" id="status">Giliran X</div>
            <div class="diag" id="diag"></div>
            <div class="board" id="board"></div>
            <button class="ctrl" id="btn-new">Main Lagi</button>
          </section>
          <div class="overlay" id="loading"><div class="dots"><i></i><i></i><i></i></div><div class="otext" id="loading-text">Memuat</div></div>
        </div>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            const WS_URL = ${JSON.stringify(wsUrl)};
            const ONLINE_OK = !!WS_URL;

            let board = ['','','','','','','','',''];
            let turn = 'X';
            let mode = 'ai';
            let difficulty = 'medium';
            let winner = null;
            let aiThinking = false;
            let gen = 0;
            let ws = null;
            let seat = null;
            let presence = { X: false, O: false };
            let roomCode = '';
            let joinCode = '';
            let pendingAction = null;
            let errMsg = '';
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
              setTimeout(function() { swapTo(id); hideLoading(); }, d || 720);
            }
            function checkWinner(b) {
              const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
              for (let ln of L) { const x = ln[0], y = ln[1], z = ln[2]; if (b[x] && b[x] === b[y] && b[x] === b[z]) return ln; }
              return null;
            }
            // Minimax penuh (AI = 'O', pemain = 'X') -> langkah optimal (Hard).
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
            // Cari kotak kosong yang melengkapi garis milik 'p' (buat menang/blok).
            function findLine(b, p) {
              const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
              for (const ln of L) {
                const v = [b[ln[0]], b[ln[1]], b[ln[2]]];
                if (v.filter(function(c){return c===p;}).length === 2 && v.indexOf('') > -1) {
                  return ln[v.indexOf('')];
                }
              }
              return -1;
            }
            // Pilih langkah AI sesuai tingkat kesulitan.
            function aiMove() {
              const empty = [];
              board.forEach(function(v, i) { if (v === '') empty.push(i); });
              if (!empty.length) return -1;
              if (difficulty === 'easy') return empty[Math.floor(Math.random() * empty.length)];
              if (difficulty === 'hard') return getBestMove(board.slice());
              // medium: ambil kemenangan instan -> blok kekalahan -> selebihnya asal.
              let m = findLine(board, 'O'); if (m > -1) return m;
              m = findLine(board, 'X'); if (m > -1) return m;
              return empty[Math.floor(Math.random() * empty.length)];
            }
            function stateName(w) {
              if (!w) return 'null';
              return ['CONNECTING','OPEN','CLOSING','CLOSED'][w.readyState];
            }
            function updateDiag() {
              const d = document.getElementById('diag');
              if (mode !== 'online') { d.classList.remove('show'); return; }
              const ready = ws && ws.readyState === 1 && seat && presence.X && presence.O && !errMsg;
              if (ready) { d.classList.remove('show'); return; }
              d.classList.add('show');
              let html = '';
              html += '<b>WS:</b> ' + (WS_URL || '(kosong — tunnel belum aktif)') + '<br>';
              html += '<b>STATE:</b> ' + stateName(ws) + '<br>';
              html += '<b>SEAT:</b> ' + (seat || '-') + ' | <b>KODE:</b> ' + (roomCode || joinCode || '-') + '<br>';
              html += '<b>EVT:</b> ' + lastEvt + '<br>';
              html += '<b>HADIR:</b> X=' + (presence.X ? 'ya' : '-') + ' O=' + (presence.O ? 'ya' : '-');
              if (errMsg) html += '<br><b>ERR:</b> ' + errMsg;
              d.innerHTML = html;
            }
            function setCodebar() {
              const c = document.getElementById('codebar');
              if (mode !== 'online') { c.style.display = 'none'; return; }
              if (errMsg) {
                c.style.display = 'block';
                c.className = 'codebar err';
                c.innerHTML = '<div class="cl">Gagal</div><div class="ct" style="opacity:1;font-size:13px;margin-top:4px;">' + errMsg + '</div>';
                return;
              }
              if (roomCode) {
                const both = presence.X && presence.O;
                c.style.display = 'block';
                c.className = 'codebar';
                c.innerHTML = '<div class="cl">Kode Room</div><div class="cv">' + roomCode + '</div>'
                  + '<div class="ct">' + (both ? 'Lawan sudah gabung!' : 'Bagikan kode ini ke lawanmu') + '</div>';
                return;
              }
              c.style.display = 'none';
            }
            function statusText() {
              if (mode === 'online') return onlineStatus();
              if (winner) {
                if (winner === 'SERI') return 'Seri!';
                return winner === 'O' ? 'AI Menang' : 'Kamu Menang';
              }
              return turn === 'X' ? 'Giliranmu' : 'AI Mikir';
            }
            function onlineStatus() {
              if (!ONLINE_OK) return 'Server Offline';
              if (errMsg) return 'Gagal';
              if (!ws || ws.readyState !== 1 || !seat) return 'Menyambungkan';
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
              setCodebar();
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
              mode = 'ai'; errMsg = ''; roomCode = '';
              goto('menu', 'Memuat', 520);
            }
            function openAi() { goto('ai', 'Memuat', 480); }
            function openJoin() {
              joinCode = ''; renderSlots();
              document.getElementById('j-msg').innerText = '';
              goto('join', 'Memuat', 480);
            }
            function startAi(diff) {
              mode = 'ai'; difficulty = diff || 'medium'; errMsg = ''; roomCode = '';
              resetBoard();
              const lbl = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[difficulty] || 'Medium';
              document.getElementById('g-label').innerText = 'Vs AI - ' + lbl;
              document.getElementById('g-sub').innerText = 'Kamu (X) vs Bot (O)';
              goto('game', 'Menyiapkan papan', 700);
            }
            function resetOnlineState() {
              gen++; aiThinking = false;
              board = ['','','','','','','','',''];
              turn = 'X'; winner = null; seat = null;
              presence = { X: false, O: false }; errMsg = ''; roomCode = ''; lastEvt = 'start';
            }
            function startCreate() {
              mode = 'online'; resetOnlineState();
              pendingAction = { type: 'create' };
              document.getElementById('g-label').innerText = 'Online';
              document.getElementById('g-sub').innerText = 'Kamu host (X)';
              render();
              goto('game', 'Membuat room', 800);
              connectWs();
            }
            function startJoin() {
              if (joinCode.length !== 4) {
                document.getElementById('j-msg').innerText = 'Kode harus 4 digit';
                return;
              }
              mode = 'online'; resetOnlineState();
              pendingAction = { type: 'join', code: joinCode };
              document.getElementById('g-label').innerText = 'Online';
              document.getElementById('g-sub').innerText = 'Gabung room ' + joinCode + ' (O)';
              render();
              goto('game', 'Gabung room ' + joinCode, 800);
              connectWs();
            }
            function connectWs() {
              if (!ONLINE_OK) { lastEvt = 'no-url'; render(); return; }
              closeWs();
              const g = gen;
              try {
                lastEvt = 'connecting';
                ws = new WebSocket(WS_URL);
              } catch (err) {
                lastEvt = 'throw:' + (err && err.message ? err.message : err);
                errMsg = 'Tidak bisa connect';
                render();
                return;
              }
              ws.onopen = function() {
                lastEvt = 'open';
                if (pendingAction) { wsSend(pendingAction); }
                render();
              };
              ws.onmessage = function(ev) {
                if (mode !== 'online' || g !== gen) return;
                lastEvt = 'msg';
                let msg;
                try { msg = JSON.parse(ev.data); } catch (e) { return; }
                if (msg.type === 'created') {
                  seat = msg.seat; roomCode = msg.code; errMsg = ''; lastEvt = 'created:' + msg.code;
                } else if (msg.type === 'joined') {
                  seat = msg.seat; errMsg = ''; lastEvt = 'joined';
                } else if (msg.type === 'state') {
                  const s = msg.state;
                  board = s.board.map(function(c) { return c || ''; });
                  turn = s.turn; winner = s.winner || null;
                  if (msg.presence) presence = msg.presence;
                } else if (msg.type === 'error') {
                  errMsg = msg.message || 'Error'; lastEvt = 'err:' + errMsg;
                }
                render();
              };
              ws.onerror = function() { lastEvt = 'error'; if (mode === 'online' && g === gen) render(); };
              ws.onclose = function(e) { lastEvt = 'close:' + (e && e.code); if (mode === 'online' && g === gen) render(); };
            }
            function closeWs() {
              if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} ws = null; }
              seat = null; presence = { X: false, O: false }; pendingAction = null;
            }
            function wsSend(obj) {
              if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(obj)); } catch (e) {} }
            }
            function renderSlots() {
              const slots = document.querySelectorAll('#j-slots .slot');
              for (let i = 0; i < slots.length; i++) {
                const ch = joinCode[i] || '';
                slots[i].innerText = ch;
                if (ch) slots[i].classList.add('f'); else slots[i].classList.remove('f');
              }
            }
            function keyTap(k) {
              if (k === 'del') { joinCode = joinCode.slice(0, -1); document.getElementById('j-msg').innerText = ''; renderSlots(); return; }
              if (k === 'ok') { startJoin(); return; }
              if (joinCode.length >= 4) return;
              if (/^[0-9]$/.test(k)) { joinCode += k; document.getElementById('j-msg').innerText = ''; renderSlots(); }
            }
            function boardTap(e) {
              const cell = e.target.closest('.cell');
              if (!cell) return;
              e.preventDefault();
              if (aiThinking) return;
              const pos = parseInt(cell.getAttribute('data-i'), 10);
              if (isNaN(pos)) return;
              if (mode === 'online') {
                if (!ONLINE_OK || !seat) return;
                if (winner || turn !== seat || board[pos] !== '') return;
                if (!presence.X || !presence.O) return;
                wsSend({ type: 'move', pos: pos });
                return;
              }
              // Vs AI (pemain = X).
              if (winner || board[pos] !== '' || turn !== 'X') return;
              board[pos] = 'X';
              if (checkWinner(board)) { winner = 'X'; render(); return; }
              if (!board.includes('')) { winner = 'SERI'; render(); return; }
              turn = 'O'; render();
              aiThinking = true;
              const g = gen;
              setTimeout(function() {
                if (g !== gen || winner) { aiThinking = false; return; }
                const mv = aiMove();
                if (mv >= 0) board[mv] = 'O';
                if (checkWinner(board)) winner = 'O';
                else if (!board.includes('')) winner = 'SERI';
                else turn = 'X';
                aiThinking = false; render();
              }, 420 + Math.random() * 460);
            }
            document.getElementById('m-create').addEventListener('pointerdown', function(e){ e.preventDefault(); startCreate(); });
            document.getElementById('m-join').addEventListener('pointerdown', function(e){ e.preventDefault(); openJoin(); });
            document.getElementById('m-ai').addEventListener('pointerdown', function(e){ e.preventDefault(); openAi(); });
            document.getElementById('a-back').addEventListener('pointerdown', function(e){ e.preventDefault(); openMenu(); });
            document.getElementById('j-back').addEventListener('pointerdown', function(e){ e.preventDefault(); openMenu(); });
            document.getElementById('g-back').addEventListener('pointerdown', function(e){ e.preventDefault(); openMenu(); });
            document.getElementById('s-ai').addEventListener('pointerdown', function(e){
              const card = e.target.closest('[data-diff]');
              if (!card) return;
              e.preventDefault();
              startAi(card.getAttribute('data-diff'));
            });
            document.getElementById('j-pad').addEventListener('pointerdown', function(e){
              const key = e.target.closest('.key');
              if (!key) return;
              e.preventDefault();
              keyTap(key.getAttribute('data-k'));
            });
            document.getElementById('btn-new').addEventListener('pointerdown', function(e){
              e.preventDefault();
              if (mode === 'online') { if (seat) wsSend({ type: 'reset' }); }
              else resetBoard();
            });
            document.getElementById('board').addEventListener('pointerdown', boardTap);

            renderSlots();
            render();
            setTimeout(function(){ swapTo('menu'); }, 2100);
          });
        </script>
      </body>
    </html>
`

  return html
}
