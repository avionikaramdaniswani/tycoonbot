import { getSharp } from '@vanzxy/baileys'

/**
 * Render Tic Tac Toe board ke image Buffer menggunakan SVG -> Sharp
 * Dijamin jalan di Pterodactyl karena pakai library bawaan (tanpa chrome/puppeteer).
 */
export async function renderBoardToBuffer(game) {
  const sharp = await getSharp()

  // Tema glassmorphism & premium UI
  const bgColors = ['#1a1b26', '#24283b']
  
  const getBoxContent = (mark, index) => {
    if (mark === 'X') {
      return `<g transform="translate(15, 15) scale(0.7)">
        <path d="M 10,10 L 90,90 M 90,10 L 10,90" stroke="#f7768e" stroke-width="16" stroke-linecap="round" fill="none" />
      </g>`
    }
    if (mark === 'O') {
      return `<g transform="translate(15, 15) scale(0.7)">
        <circle cx="50" cy="50" r="40" stroke="#7aa2f7" stroke-width="16" fill="none" />
      </g>`
    }
    // Nomor kosong (transparan)
    return `<text x="50" y="65" font-family="Arial" font-size="30" font-weight="bold" fill="#565f89" text-anchor="middle" opacity="0.4">${index + 1}</text>`
  }

  // Generate kotak 3x3
  const gridSize = 100
  const gap = 15
  let gridSvg = ''
  
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3)
    const col = i % 3
    const x = col * (gridSize + gap)
    const y = row * (gridSize + gap)
    
    let isWinningBox = false
    if (game.winLine && game.winLine.includes(i)) {
      isWinningBox = true
    }

    const boxBg = isWinningBox ? '#e0af68' : '#414868'
    const mark = game.board[i]
    
    gridSvg += `
      <g transform="translate(${x}, ${y})">
        <rect width="${gridSize}" height="${gridSize}" rx="15" fill="${boxBg}" />
        ${getBoxContent(mark, i)}
      </g>
    `
  }

  // Layout keseluruhan
  const svg = `
    <svg width="450" height="450" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bgColors[0]}" />
          <stop offset="100%" stop-color="${bgColors[1]}" />
        </linearGradient>
      </defs>
      
      <!-- Background Papan -->
      <rect width="450" height="450" fill="url(#bg)" />
      
      <!-- Grid -->
      <g transform="translate(60, 60)">
        ${gridSvg}
      </g>
    </svg>
  `

  // Konversi SVG ke PNG Buffer
  return await sharp(Buffer.from(svg))
    .png()
    .toBuffer()
}
