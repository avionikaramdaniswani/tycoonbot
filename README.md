# 🤖 Bot Terbaru

Bot WhatsApp berbasis [`@vanzxy/baileys`](https://www.npmjs.com/package/@vanzxy/baileys) dengan **dashboard web** untuk mengontrol bot (start / stop / restart / scan QR / pairing code) secara realtime.

## ✨ Fitur

- Koneksi WhatsApp via **QR Code** atau **Pairing Code**
- Dashboard web (React) dengan status realtime, log streaming, dan tombol kontrol
- Login dashboard terproteksi (JWT)
- Sistem **command berbasis plugin** — tambah fitur cukup buat 1 file
- Auto-reconnect saat koneksi putus

## 📁 Struktur

```
Bot Terbaru/
├── server/       # Backend: bot + REST API + Socket.IO
│   └── src/
│       ├── bot/         # BotManager, koneksi Baileys, serialize
│       ├── commands/    # plugin command (auto-load)
│       ├── handlers/    # routing pesan masuk
│       ├── web/         # express app, routes, socket, auth
│       └── lib/         # logger, utils
└── dashboard/    # Frontend: React + Vite + Tailwind
    └── src/
        ├── pages/        # Login, Dashboard
        ├── components/   # StatusCard, ControlButtons, ConnectPanel, LogViewer
        ├── hooks/        # useBotState
        └── api/          # axios client + socket client
```

## 🚀 Cara Menjalankan

**1. Install semua dependency**

```bash
npm run setup
```

**2. Siapkan konfigurasi**

Salin `.env.example` menjadi `.env`, lalu ganti kredensial login & `JWT_SECRET`:

```bash
cp .env.example .env
```

| Variabel | Keterangan |
|---|---|
| `PORT` | Port backend (default 3000) |
| `DASHBOARD_USER` / `DASHBOARD_PASSWORD` | Login dashboard |
| `JWT_SECRET` | **Wajib diganti** dengan string acak panjang |
| `BOT_PREFIX` | Prefix command (default `.`) |
| `OWNER_NUMBER` | Nomor owner, format `628xxx` |
| `MONGODB_URI` | Connection string MongoDB Atlas. **Diisi** → sesi WA disimpan di DB. Dikosongkan → fallback ke file lokal. |
| `MONGODB_DB` | Nama database (default `piobot`) |

**3. Jalankan (mode development)**

```bash
npm run dev
```

- Backend + API: http://localhost:3000
- Dashboard: **http://localhost:5173**

Buka dashboard, login, lalu tekan **▶ Start**. QR akan muncul untuk discan — atau pilih tab **Pairing Code**, masukkan nomor, dan ketik kode di WhatsApp (Perangkat Tertaut → Tautkan perangkat).

**4. Mode produksi**

```bash
npm run build     # build dashboard
npm start         # jalankan server (menyajikan dashboard hasil build di :3000)
```

## ➕ Menambah Command

Buat file baru di `server/src/commands/<kategori>/namacommand.js`:

```js
export default {
  name: 'halo',
  aliases: ['hi'],
  description: 'Menyapa pengguna',
  category: 'general',
  ownerOnly: false, // true = hanya owner
  async execute({ sock, msg, args, config }) {
    await sock.sendMessage(msg.from, { text: `Halo ${msg.pushName}! 👋` }, { quoted: msg.raw })
  }
}
```

Command otomatis dimuat saat bot start (atau restart).

## 💾 Penyimpanan Sesi

Sesi WhatsApp (kredensial Baileys) bisa disimpan di dua tempat:

- **MongoDB** (disarankan untuk deploy) — set `MONGODB_URI`. Sesi tersimpan di koleksi `wa_auth`, jadi **tetap ada meski server di-redeploy/restart** (tidak perlu scan ulang). Cocok untuk host dengan filesystem ephemeral (Railway, Render, dsb).
- **File lokal** — kalau `MONGODB_URI` kosong, sesi disimpan di folder `server/sessions/`.

Pergantian antar keduanya otomatis berdasarkan ada/tidaknya `MONGODB_URI`.

## 🔒 Keamanan

- Folder `sessions/` (kredensial WhatsApp) dan `.env` **tidak boleh** di-commit / dibagikan — sudah masuk `.gitignore`.
- **Jangan bagikan connection string MongoDB** (berisi user & password). Kalau pernah bocor, ganti password user DB di MongoDB Atlas.
- Dashboard mengontrol WhatsApp-mu; jangan ekspos ke internet tanpa proteksi tambahan (HTTPS, firewall). Default hanya untuk `localhost`.

## 🛠️ Stack

Node.js · @vanzxy/baileys · Express · Socket.IO · MongoDB · JWT · React · Vite · Tailwind CSS
