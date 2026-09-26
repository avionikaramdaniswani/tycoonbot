

/**
 * Render Tic Tac Toe board murni dari HTML & CSS!
 */
export async function renderBoardHtml(game) {
  const getCell = (mark, index) => {
    let content = mark
    if (!mark) content = `<span class="number">${index + 1}</span>`
    
    let isWin = game.winLine && game.winLine.includes(index)
    return `<div class="cell ${isWin ? 'win' : ''} ${mark === 'X' ? 'x' : mark === 'O' ? 'o' : ''}">${content}</div>`
  }

  const html = `
    <html>
      <head>
        <style>
          body {
            width: 500px;
            height: 500px;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #1a1c29 0%, #2a2d42 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .board-container {
            background: rgba(255, 255, 255, 0.05);
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 2px 5px rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.1);
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
          }
          .cell {
            width: 100px;
            height: 100px;
            background: #1f2233;
            border-radius: 15px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 60px;
            font-weight: bold;
            box-shadow: inset 0 4px 5px rgba(0,0,0,0.4), 0 2px 0 rgba(255,255,255,0.05);
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
          }
          .cell.x { color: #f7768e; }
          .cell.o { color: #7aa2f7; }
          .number {
            font-size: 30px;
            color: rgba(255,255,255,0.1);
            text-shadow: none;
          }
          .cell.win {
            background: #e0af68;
            color: #1a1c29;
            box-shadow: 0 0 20px rgba(224, 175, 104, 0.5);
          }
        </style>
      </head>
      <body>
        <div class="board-container">
          <div class="grid">
            ${game.board.map((mark, i) => getCell(mark, i)).join('')}
          </div>
        </div>
      </body>
    </html>
  `

  return html
}
