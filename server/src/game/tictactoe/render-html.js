

import { AI_JID } from './engine.js'

/**
 * Render Tic Tac Toe board murni dari HTML & CSS!
 * Game berjalan penuh di sisi client (seperti Anya Chess) — semua state & AI
 * ada di dalam <script>, jadi klik langsung diproses di dalam bubble WA.
 */
export async function renderBoardHtml(game) {
  // Sel kosong di engine = null; untuk client kita normalkan jadi '' supaya
  // semua perbandingan (=== '') di dalam <script> konsisten.
  const boardForClient = game.board.map((c) => c || '')
  // AI aktif kalau salah satu pemain adalah bot.
  const isAi = !!(game.players && (game.players.X === AI_JID || game.players.O === AI_JID))

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
          html, body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #1a1c29 0%, #2a2d42 100%);
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            -webkit-tap-highlight-color: transparent;
          }
          body {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 15px;
            box-sizing: border-box;
          }
          .status {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
            text-shadow: 0 2px 5px rgba(0,0,0,0.5);
          }
          .board-container {
            width: min(100%, 400px);
            aspect-ratio: 1;
            background: rgba(255, 255, 255, 0.05);
            padding: 15px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 2px 5px rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.1);
            box-sizing: border-box;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 1fr);
            gap: 10px;
            width: 100%;
            height: 100%;
          }
          .cell {
            background: #1f2233;
            border-radius: 12px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: clamp(30px, 12vw, 60px);
            font-weight: bold;
            box-shadow: inset 0 4px 5px rgba(0,0,0,0.4), 0 2px 0 rgba(255,255,255,0.05);
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            cursor: pointer;
            user-select: none;
          }
          .cell.x { color: #f7768e; }
          .cell.o { color: #7aa2f7; }
          .number {
            font-size: clamp(16px, 6vw, 30px);
            color: rgba(255,255,255,0.1);
            text-shadow: none;
          }
          .cell.win {
            background: #e0af68;
            color: #1a1c29;
            box-shadow: 0 0 20px rgba(224, 175, 104, 0.5);
          }
          .cell:active { transform: scale(0.95); }
        </style>
      </head>
      <body>
        <div class="status" id="status">Giliran: X</div>
        <div class="board-container">
          <div class="grid" id="board">
            ${game.board.map((mark, i) => getCell(mark, i)).join('')}
          </div>
        </div>

        <script>
          document.addEventListener('DOMContentLoaded', function() {
            let board = ${JSON.stringify(boardForClient)};
            let turn = '${game.turn}';
            let isAi = ${isAi};
            let winner = null;

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
              if (winner) {
                if (winner === 'SERI') {
                  statusEl.innerText = 'Gamenya SERI! 🤝';
                } else {
                  statusEl.innerText = 'Pemenangnya: ' + winner + ' 🎉';
                }
              } else {
                statusEl.innerText = 'Giliran: ' + turn;
              }
            }

            // Event delegation + pointerdown (seperti Anya Chess) supaya responsif di WA webview.
            document.getElementById('board').addEventListener('pointerdown', function(e) {
              const cell = e.target.closest('.cell');
              if (!cell) return;
              e.preventDefault();

              const pos = parseInt(cell.getAttribute('data-index'));
              if (isNaN(pos) || winner || board[pos] !== '') return;
              
              // Player move
              board[pos] = turn;
              let winLine = checkWinner(board);
              
              if (winLine) {
                winner = turn;
              } else if (!board.includes('')) {
                winner = 'SERI';
              } else {
                turn = turn === 'X' ? 'O' : 'X';
                
                // AI Move
                if (isAi && turn === 'O') {
                  let aiMove = getBestMove(board);
                  if (aiMove !== -1) {
                    board[aiMove] = 'O';
                    winLine = checkWinner(board);
                    if (winLine) {
                      winner = 'O';
                    } else if (!board.includes('')) {
                      winner = 'SERI';
                    }
                    turn = 'X';
                  }
                }
              }
              
              render();
            });
            
            // Render pertama kali (optional, untuk sync)
            render();
          });
        </script>
      </body>
    </html>
  `

  return html
}
