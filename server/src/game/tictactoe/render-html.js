

/**
 * Render Tic Tac Toe board murni dari HTML & CSS!
 */
export async function renderBoardHtml(game) {
  const getCell = (mark, index) => {
    let content = mark
    if (!mark) content = `<span class="number">${index + 1}</span>`
    
    let isWin = game.winLine && game.winLine.includes(index)
    // Tambahkan event onclick ke HTML
    return `<div class="cell ${isWin ? 'win' : ''} ${mark === 'X' ? 'x' : mark === 'O' ? 'o' : ''}" onclick="makeMove(${index})">${content}</div>`
  }

  const html = `
    <html>
      <head>
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
            justify-content: center;
            align-items: center;
            padding: 15px;
            box-sizing: border-box;
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
        <div class="board-container">
          <div class="grid" id="board">
            ${game.board.map((mark, i) => getCell(mark, i)).join('')}
          </div>
        </div>

        <!-- Logika Game Mandiri (Berjalan Langsung di WA) -->
        <script>
          let board = ${JSON.stringify(game.board)};
          let turn = '${game.turn}';
          let isAi = ${game.isAi};
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

          function getBestMove(b) {
            const empty = b.map((v, i) => v === '' ? i : -1).filter(v => v !== -1);
            if (empty.length === 0) return -1;
            // Simple random AI for now
            return empty[Math.floor(Math.random() * empty.length)];
          }

          function render() {
            const boardEl = document.getElementById('board');
            let html = '';
            let winLine = checkWinner(board);
            
            board.forEach((mark, i) => {
              let cellClass = mark === 'X' ? 'x' : (mark === 'O' ? 'o' : '');
              if (winLine && winLine.includes(i)) cellClass += ' win';
              
              let content = mark ? mark : '<span class="number">' + (i + 1) + '</span>';
              html += '<div class="cell ' + cellClass + '" onclick="makeMove(' + i + ')">' + content + '</div>';
            });
            boardEl.innerHTML = html;
          }

          window.makeMove = function(pos) {
            if (winner || board[pos] !== '') return;
            
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
            
            if (winner) {
              setTimeout(() => {
                alert(winner === 'SERI' ? 'Gamenya SERI!' : 'Pemenangnya adalah: ' + winner + ' 🎉');
              }, 300);
            }
          }
        </script>
      </body>
    </html>
  `

  return html
}
