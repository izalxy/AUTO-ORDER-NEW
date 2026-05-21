function telegramConfig() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_OWNER_CHAT_ID
  };
}

export async function notifyOwner(message) {
  const { token, chatId } = telegramConfig();
  if (!token || !chatId) {
    console.warn("Telegram belum dikonfigurasi, skip notifikasi.");
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telegram error: ${text}`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function orderCreatedMessage(order) {
  return [
    "<b>Order baru dibuat</b>",
    `ID: <code>${escapeHtml(order.id)}</code>`,
    `Produk: ${escapeHtml(order.productName)}`,
    `Paket: ${escapeHtml(order.planLabel)} (${escapeHtml(order.duration)})`,
    `Harga: Rp${order.requestedAmount.toLocaleString("id-ID")}`,
    `Customer: ${escapeHtml(order.customerName)}`,
    `Kontak: ${escapeHtml(order.customerContact)}`,
    `Status: ${escapeHtml(order.status)}`
  ].join("\n");
}

export function paymentPaidMessage(order) {
  return [
    "<b>Pembayaran berhasil</b>",
    `ID: <code>${escapeHtml(order.id)}</code>`,
    `Produk: ${escapeHtml(order.productName)}`,
    `Paket: ${escapeHtml(order.planLabel)} (${escapeHtml(order.duration)})`,
    `Total dibayar: Rp${order.amount.toLocaleString("id-ID")}`,
    `Customer: ${escapeHtml(order.customerName)}`,
    `Kontak: ${escapeHtml(order.customerContact)}`,
    "Segera proses order ini."
  ].join("\n");
}

export function reminderMessage(order) {
  return [
    "<b>Reminder order belum diproses</b>",
    `ID: <code>${escapeHtml(order.id)}</code>`,
    `Produk: ${escapeHtml(order.productName)}`,
    `Paket: ${escapeHtml(order.planLabel)}`,
    `Customer: ${escapeHtml(order.customerName)}`,
    "Order sudah paid, tapi belum ditandai selesai."
  ].join("\n");
}
