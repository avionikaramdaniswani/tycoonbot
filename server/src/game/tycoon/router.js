import * as engine from './engine.js'
import * as view from './format.js'
import * as events from './events.js'
import * as prog from './progression.js'
import { getPlayer, savePlayer, topPlayers } from './store.js'
import { BUILDINGS } from './config.js'

/**
 * Router sub-perintah Tycoon. Terima objek pesan tersial + sub + sisa argumen,
 * kembalikan { text } untuk dikirim ke chat. Semua state per-pemain by JID.
 */

// Sinkronisasi pasif tiap interaksi: cek pencapaian baru + coba munculkan event.
function sync(p) {
  const ach = prog.checkAchievements(p).map((a) => `Pencapaian terbuka: ${a.desc} (+${a.reward} APBN).`)
  const ev = events.maybeSpawnEvent(p)
  return { ach, ev }
}

function evLine(ev) {
  if (!ev) return null
  return ev.type === 'crisis'
    ? `KRISIS: ${ev.label}. Ketik .ty repair.`
    : `Ada keputusan: ${ev.label}. Ketik .ty event a / b.`
}

function withExtra(text, ach, ev) {
  const extra = [...ach]
  const e = evLine(ev)
  if (e) extra.push(e)
  return extra.length ? `${text}\n\n${extra.join('\n')}` : text
}

// Bungkus teks dengan satu tombol "Menu utama" (navigasi balik ke dashboard).
function nav(text) {
  return { text, buttons: [view.menuButton()] }
}
export async function route(msg, sub, rest) {
  const jid = msg.sender
  sub = String(sub || '').toLowerCase()

  if (sub === 'help' || sub === '?') return nav(view.help())

  // Registrasi pemain baru.
  if (sub === 'start' || sub === 'daftar') {
    const existing = await getPlayer(jid)
    if (existing) return nav('Kamu sudah punya kota. Ketik .ty untuk melihatnya.')
    const p = engine.newPlayer(jid, msg.senderNumber, msg.pushName)
    await savePlayer(p)
    return { text: `Kota "${p.name}" berdiri! Modal awal ${view.fmt(p.kas)} APBN.\n\n${view.dashboard(p)}`, buttons: view.hubButtons(p) }
  }

  // Sisa perintah butuh pemain terdaftar.
  const p = await getPlayer(jid)
  if (!p) return { text: 'Kamu belum punya kota. Ketik .ty start untuk mulai.' }

  switch (sub) {
    case '': {
      engine.applyGrowth(p)
      const promo = engine.evalTier(p)
      const { ach } = sync(p) // spawn event (tampil di banner) + cek pencapaian
      await savePlayer(p)
      let text = view.dashboard(p)
      const head = [...ach]
      if (promo) head.unshift(`Selamat! Kotamu naik jadi ${promo.label}.`)
      if (head.length) text = `${head.join('\n')}\n\n${text}`
      return { text, buttons: view.hubButtons(p) }
    }

    case 'collect': {
      const got = engine.collect(p)
      if (got > 0) {
        prog.trackQuest(p, 'collects', 1)
        prog.trackQuest(p, 'kasEarned', got)
      }
      const promo = engine.evalTier(p)
      const { ach, ev } = sync(p)
      await savePlayer(p)
      let text = got > 0 ? `Panen ${view.fmt(got)} APBN. Total sekarang ${view.fmt(p.kas)}.` : 'Belum ada yang bisa dipanen.'
      if (promo) text += `\n\nSelamat! Kotamu naik jadi ${promo.label}.`
      return nav(withExtra(text, ach, ev))
    }

    case 'build': {
      const jenis = String(rest[0] || '').toLowerCase()
      // Tanpa argumen: kirim bottom-sheet pilihan bangunan.
      if (!jenis) return view.buildMenu(p)
      const qty = Math.max(1, parseInt(rest[1], 10) || 1)
      if (!BUILDINGS[jenis]) return nav(`Jenis tidak dikenal. Pilihan: ${Object.keys(BUILDINGS).join(', ')}.`)
      const r = engine.build(p, jenis, qty)
      if (!r.ok) return nav(r.msg)
      prog.trackQuest(p, 'builds', qty)
      const promo = engine.evalTier(p)
      const { ach, ev } = sync(p)
      await savePlayer(p)
      let text = `Bangun ${qty}x ${jenis} (-${view.fmt(r.cost)} APBN). Sisa APBN ${view.fmt(p.kas)}.`
      if (promo) text += `\n\nSelamat! Kotamu naik jadi ${promo.label}.`
      return { text: withExtra(text, ach, ev), buttons: [view.button('Bangun lagi', 'build'), view.menuButton()] }
    }

    case 'upgrade': {
      const jenis = String(rest[0] || '').toLowerCase()
      // Tanpa argumen: bottom-sheet bangunan yang dimiliki.
      if (!jenis) return view.upgradeMenu(p)
      if (!BUILDINGS[jenis]) return nav(`Jenis tidak dikenal. Pilihan: ${Object.keys(BUILDINGS).join(', ')}.`)
      const r = engine.upgradeBuilding(p, jenis)
      if (!r.ok) return nav(r.msg)
      const promo = engine.evalTier(p)
      const { ach, ev } = sync(p)
      await savePlayer(p)
      let text = `${jenis} naik ke level ${r.level} (-${view.fmt(r.cost)} APBN). Semua efeknya menguat.`
      if (promo) text += `\n\nSelamat! Kotamu naik jadi ${promo.label}.`
      return { text: withExtra(text, ach, ev), buttons: [view.button('Upgrade lagi', 'upgrade'), view.menuButton()] }
    }

    case 'shop':
      return { text: view.shop(p), buttons: [view.button('Bangun', 'build'), view.menuButton()] }

    case 'tax': {
      // Tanpa argumen valid: bottom-sheet preset tarif pajak.
      if (rest[0] == null || rest[0] === '') return view.taxMenu(p)
      const rate = parseInt(rest[0], 10)
      if (Number.isNaN(rate)) return view.taxMenu(p)
      const r = engine.setTax(p, rate)
      await savePlayer(p)
      return nav(`Pajak diatur ke ${r}%. Approval sekarang ${engine.computeApproval(p)}%.`)
    }

    case 'gudang': {
      const r = engine.upgradeStorage(p)
      if (!r.ok) return nav(r.msg)
      await savePlayer(p)
      return nav(`Gudang di-upgrade. Kapasitas simpan jadi ${r.hours} jam-game / ${view.realTime(r.hours)} nyata (-${view.fmt(r.cost)} APBN).`)
    }

    case 'proyek': {
      const action = String(rest[0] || '').toLowerCase()
      if (action === 'fund') {
        const id = String(rest[1] || '').toLowerCase()
        const raw = rest[2]
        const amount = raw == null || String(raw).toLowerCase() === 'max' ? 'max' : parseInt(raw, 10)
        if (amount !== 'max' && (Number.isNaN(amount) || amount <= 0)) {
          return nav('Format: .ty proyek fund <id> [nominal|max].')
        }
        const r = engine.fundLandmark(p, id, amount)
        if (!r.ok) return nav(r.msg)
        const promo = engine.evalTier(p)
        const { ach, ev } = sync(p)
        await savePlayer(p)
        let text = r.done
          ? `${r.label} SELESAI! Dana ${view.fmt(r.paid)} APBN masuk. Bonus kota aktif.`
          : `Danai ${r.label} ${view.fmt(r.paid)} APBN. Progres ${view.fmt(r.funded)}/${view.fmt(r.cost)}.`
        if (promo) text += `\n\nSelamat! Kotamu naik jadi ${promo.label}.`
        return { text: withExtra(text, ach, ev), buttons: [view.button('Danai lagi', 'proyek'), view.menuButton()] }
      }
      // Tanpa argumen fund: tampilan proyek + bottom-sheet danai.
      return view.proyekMenu(p)
    }

    case 'tier': {
      engine.applyGrowth(p)
      await savePlayer(p)
      return nav(view.tierInfo(p))
    }

    case 'repair': {
      const r = events.repair(p)
      if (!r.ok) return nav(r.msg)
      engine.applyGrowth(p)
      await savePlayer(p)
      return nav(`${r.label} beres (-${view.fmt(r.cost)} APBN). Kota normal lagi.`)
    }

    case 'event': {
      // Tanpa argumen: kalau ada choice aktif, tampilkan 2 tombol A/B.
      if (rest[0] == null || rest[0] === '') {
        const prompt = view.eventPrompt(p)
        if (prompt) return prompt
      }
      const r = events.resolveChoice(p, rest[0])
      if (!r.ok) return nav(r.msg)
      engine.applyGrowth(p)
      await savePlayer(p)
      const parts = [`${r.eventLabel} - ${r.optLabel}.`]
      if (r.kas) parts.push(`APBN ${r.kas > 0 ? '+' : ''}${view.fmt(r.kas)}.`)
      if (r.approval) parts.push(`Approval ${r.approval > 0 ? '+' : ''}${r.approval} (sementara).`)
      return nav(parts.join(' '))
    }

    case 'daily': {
      const r = prog.claimDaily(p)
      if (!r.ok) return nav(r.msg)
      const { ach } = sync(p) // bonus APBN bisa memicu pencapaian
      await savePlayer(p)
      let text = `Check-in hari ke-${r.streak}. Dapat ${view.fmt(r.reward)} APBN.`
      if (r.jackpot) text += ' Jackpot streak!'
      if (ach.length) text += `\n\n${ach.join('\n')}`
      return nav(text)
    }

    case 'quest': {
      if (String(rest[0] || '').toLowerCase() === 'claim') {
        const r = prog.claimQuests(p)
        if (r.count === 0) return nav('Belum ada misi yang siap diklaim.')
        const { ach } = sync(p)
        await savePlayer(p)
        let text = `Klaim ${r.count} misi, total +${view.fmt(r.total)} APBN.`
        if (ach.length) text += `\n\n${ach.join('\n')}`
        return nav(text)
      }
      const text = view.questView(p)
      await savePlayer(p)
      return { text }
    }

    case 'ach':
      return { text: view.achView(p) }

    case 'top': {
      const list = await topPlayers(10)
      const lines = ['PERINGKAT TERKAYA', '--------------------']
      list.forEach((x, i) => lines.push(`${i + 1}. ${x.name} - ${view.fmt(x.kas)} APBN`))
      if (list.length === 0) lines.push('(belum ada pemain)')
      return { text: lines.join('\n') }
    }

    default:
      return { text: `Perintah "${sub}" tidak dikenal. Ketik .ty help.` }
  }
}
