# Izall Auto Order

Web auto order dengan frontend statis untuk Netlify dan backend Node untuk QRISPY + Telegram.

## Fitur

- 5 menu produk: BUG MANTAX, NECROBYTE, JASA APK BUG, PPL PROJECT, FLUX PROJECT.
- Generate QRIS dinamis lewat QRISPY.
- Status pembayaran otomatis via polling dan webhook.
- Notifikasi Telegram ke owner saat order dibuat dan saat pembayaran berhasil.
- Reminder Telegram berkala kalau order sudah paid tetapi belum ditandai selesai.

## Cara Run di Panel Node

1. Upload semua file ke panel Node.
2. Rename `.env.example` jadi `.env`.
3. Isi `QRISPY_API_TOKEN`, `TELEGRAM_BOT_TOKEN`, dan `TELEGRAM_OWNER_CHAT_ID`.
4. Jalankan:

```bash
npm start
```

Backend berjalan di `http://panel-legal.jhonaley.net:4282`.

## Cara Deploy Frontend ke Netlify

1. Edit `netlify.toml`.
2. Pastikan `netlify.toml` mengarah ke `http://panel-legal.jhonaley.net:4282`.
3. Upload folder ini ke Netlify.

Penting: jangan taruh API key QRISPY atau token Telegram di file dalam folder `public`.

## Webhook QRISPY

Di dashboard QRISPY, set webhook URL ke:

```text
http://panel-legal.jhonaley.net:4282/api/webhooks/qrispy
```

Kalau QRISPY memberi webhook secret/signature secret, isi `QRISPY_WEBHOOK_SECRET` di `.env`.

## Endpoint Owner

Untuk menandai order sudah diproses:

```bash
curl -X POST http://panel-legal.jhonaley.net:4282/api/orders/ORDER_ID/fulfill
```
