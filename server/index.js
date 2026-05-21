import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { catalog, findPlan } from "./catalog.js";
import { checkQrisStatus, generateQris } from "./qrispy.js";
import { findOrderByQrisId, getOrder, readOrders, saveOrder, updateOrder } from "./storage.js";
import { notifyOwner, orderCreatedMessage, paymentPaidMessage, reminderMessage } from "./telegram.js";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (process.env[key]) continue;

    process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
  }
}

loadEnvFile();

const port = Number(process.env.PORT || 4282);
const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
const frontendOrigin = process.env.FRONTEND_ORIGIN || "*";
const paymentPollMs = Number(process.env.PAYMENT_POLL_SECONDS || 30) * 1000;
const reminderMs = Number(process.env.OWNER_REMINDER_MINUTES || 15) * 60 * 1000;
const publicDir = path.join(process.cwd(), "public");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": frontendOrigin,
    "Access-Control-Allow-Headers": "Content-Type, X-Qrispy-Signature",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request terlalu besar."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseJson(raw) {
  if (!raw) return {};
  return JSON.parse(raw);
}

function makeOrderId() {
  return `Izall-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function verifyQrispySignature(rawBody, signature) {
  const secret = process.env.QRISPY_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== String(signature).length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function serveStatic(url, res) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalized = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, normalized);

  if (!filePath.startsWith(publicDir)) {
    return sendJson(res, 403, { error: "Forbidden." });
  }

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream"
    });
    res.end(file);
  } catch {
    const index = await readFile(path.join(publicDir, "index.html"));
    res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
    res.end(index);
  }
}

async function markPaid(order, paymentData = {}) {
  if (!order || order.status === "paid" || order.status === "fulfilled") return order;

  const updated = await updateOrder(order.id, () => ({
    status: "paid",
    paidAt: paymentData.paid_at || new Date().toISOString(),
    lastPaymentCheckAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  await notifyOwner(paymentPaidMessage(updated)).catch((error) => console.error(error.message));
  return updated;
}

async function handleCreateOrder(req, res) {
  const payload = parseJson(await readBody(req));
  const selected = findPlan(payload.productId, payload.planId);
  if (!selected) {
    return sendJson(res, 400, { error: "Produk atau paket tidak valid." });
  }

  const customerName = String(payload.customerName || "").trim();
  const customerContact = String(payload.customerContact || "").trim();
  if (customerName.length < 2 || customerContact.length < 4) {
    return sendJson(res, 400, { error: "Nama dan kontak wajib diisi." });
  }

  const orderId = makeOrderId();
  const { product, plan } = selected;
  const returnUrl = `${publicBaseUrl}/?order=${encodeURIComponent(orderId)}`;
  const qris = await generateQris({
    amount: plan.price,
    orderId,
    returnUrl
  });

  const order = await saveOrder({
    id: orderId,
    productId: product.id,
    productName: product.name,
    planId: plan.id,
    planLabel: plan.label,
    duration: plan.duration,
    requestedAmount: qris.requested_amount || plan.price,
    amount: qris.amount,
    uniqueId: qris.unique_id,
    qrisId: qris.qris_id,
    qrisImageUrl: qris.qris_image_url,
    qrisImageBase64: qris.qris_image_base64,
    checkoutUrl: qris.checkout_url,
    expiredAt: qris.expired_at,
    customerName,
    customerContact,
    note: String(payload.note || "").trim(),
    status: "pending",
    delivered: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastOwnerReminderAt: null,
    lastPaymentCheckAt: null
  });

  await notifyOwner(orderCreatedMessage(order)).catch((error) => console.error(error.message));

  return sendJson(res, 201, { order });
}

async function handleGetOrder(req, res, orderId) {
  const order = await getOrder(orderId);
  if (!order) return sendJson(res, 404, { error: "Order tidak ditemukan." });
  return sendJson(res, 200, { order });
}

async function handleFulfillOrder(req, res, orderId) {
  const updated = await updateOrder(orderId, () => ({
    status: "fulfilled",
    delivered: true,
    fulfilledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  if (!updated) return sendJson(res, 404, { error: "Order tidak ditemukan." });
  return sendJson(res, 200, { order: updated });
}

async function handleWebhook(req, res) {
  const rawBody = await readBody(req);
  const signature = req.headers["x-qrispy-signature"];
  if (!verifyQrispySignature(rawBody, signature)) {
    return sendJson(res, 401, { error: "Signature webhook tidak valid." });
  }

  const payload = parseJson(rawBody);
  if (payload.event !== "payment.success") {
    return sendJson(res, 200, { ok: true });
  }

  const order = await findOrderByQrisId(payload.qris_id);
  if (!order) return sendJson(res, 404, { error: "Order webhook tidak ditemukan." });

  const updated = await markPaid(order, payload);
  return sendJson(res, 200, { ok: true, order: updated });
}

async function route(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});

  const url = new URL(req.url, publicBaseUrl);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/api/products") {
      return sendJson(res, 200, { products: catalog });
    }

    if (req.method === "POST" && url.pathname === "/api/orders") {
      return handleCreateOrder(req, res);
    }

    const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (req.method === "GET" && orderMatch) {
      return handleGetOrder(req, res, decodeURIComponent(orderMatch[1]));
    }

    const fulfillMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/fulfill$/);
    if (req.method === "POST" && fulfillMatch) {
      return handleFulfillOrder(req, res, decodeURIComponent(fulfillMatch[1]));
    }

    if (req.method === "POST" && url.pathname === "/api/webhooks/qrispy") {
      return handleWebhook(req, res);
    }

    if (req.method === "GET") {
      return serveStatic(url, res);
    }

    return sendJson(res, 404, { error: "Endpoint tidak ditemukan." });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: error.message || "Server error." });
  }
}

async function pollPayments() {
  const orders = await readOrders().catch(() => []);
  const pendingOrders = orders.filter((order) => order.status === "pending" && order.qrisId);

  for (const order of pendingOrders) {
    try {
      const status = await checkQrisStatus(order.qrisId);
      if (status.payment_status === "paid") {
        await markPaid(order, status);
      } else if (["expired", "cancelled"].includes(status.payment_status)) {
        await updateOrder(order.id, () => ({
          status: status.payment_status,
          lastPaymentCheckAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      } else {
        await updateOrder(order.id, () => ({
          lastPaymentCheckAt: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error(`Gagal cek status ${order.id}: ${error.message}`);
    }
  }
}

async function remindOwner() {
  const orders = await readOrders().catch(() => []);
  const now = Date.now();
  const paidOrders = orders.filter((order) => order.status === "paid" && !order.delivered);

  for (const order of paidOrders) {
    const lastReminder = order.lastOwnerReminderAt ? new Date(order.lastOwnerReminderAt).getTime() : 0;
    if (now - lastReminder < reminderMs) continue;

    await notifyOwner(reminderMessage(order)).catch((error) => console.error(error.message));
    await updateOrder(order.id, () => ({
      lastOwnerReminderAt: new Date().toISOString()
    }));
  }
}

http.createServer(route).listen(port, () => {
  console.log(`Izall auto order backend running on ${publicBaseUrl}`);
});

setInterval(pollPayments, paymentPollMs);
setInterval(remindOwner, 60 * 1000);
