

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

        <!-- Tambahkan Socket.IO Client -->
        <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
        <script>
          // Koneksi ke server bot (Ganti PUBLIC_URL di .env nanti kalau sudah di Pterodactyl)
          const WS_URL = "${process.env.PUBLIC_URL || 'http://localhost:2397'}";
          const gameId = "${game.id}"; // ID Chat
          
          const socket = io(WS_URL + '/game');
          
          socket.on('connect', () => {
            console.log('Terhubung ke server bot!');
          });

          // Kalau ada update papan dari server (misal musuh/AI jalan)
          socket.on('boardUpdate', (newBoard) => {
            const boardEl = document.getElementById('board');
            let html = '';
            newBoard.forEach((mark, i) => {
              let cellClass = mark === 'X' ? 'x' : (mark === 'O' ? 'o' : '');
              let content = mark ? mark : '<span class="number">' + (i + 1) + '</span>';
              html += '<div class="cell ' + cellClass + '" onclick="makeMove(' + i + ')">' + content + '</div>';
            });
            boardEl.innerHTML = html;
          });

          // Fungsi saat kotak dipencet
          window.makeMove = function(pos) {
            // Kirim event ke server bot
            socket.emit('ttt_move', { gameId, pos });
            
            // Beri efek loading sementara
            const cells = document.querySelectorAll('.cell');
            if(cells[pos] && !cells[pos].classList.contains('x') && !cells[pos].classList.contains('o')) {
               cells[pos].innerHTML = '...';
            }
          }
        </script>
      </body>
    </html>
  `

  return html
}
