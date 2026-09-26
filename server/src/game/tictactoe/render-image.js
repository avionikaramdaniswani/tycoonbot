import nodeHtmlToImage from 'node-html-to-image'
import { renderBoardHtml } from './render-html.js'

export async function renderBoardImage(game) {
  let html = await renderBoardHtml(game)
  // Buang tag script dan socket.io agar puppeteer tidak hang saat render gambar
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  const image = await nodeHtmlToImage({
    html: html,
    transparent: true
  })
  return image
}
