import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const ordersPath = path.join(dataDir, "orders.json");

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(ordersPath, "utf8");
  } catch {
    await writeFile(ordersPath, "[]\n", "utf8");
  }
}

export async function readOrders() {
  await ensureStore();
  const raw = await readFile(ordersPath, "utf8");
  return JSON.parse(raw || "[]");
}

export async function writeOrders(orders) {
  await ensureStore();
  await writeFile(ordersPath, `${JSON.stringify(orders, null, 2)}\n`, "utf8");
}

export async function saveOrder(order) {
  const orders = await readOrders();
  orders.unshift(order);
  await writeOrders(orders);
  return order;
}

export async function getOrder(orderId) {
  const orders = await readOrders();
  return orders.find((order) => order.id === orderId);
}

export async function updateOrder(orderId, updater) {
  const orders = await readOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index === -1) return null;

  orders[index] = { ...orders[index], ...updater(orders[index]) };
  await writeOrders(orders);
  return orders[index];
}

export async function findOrderByQrisId(qrisId) {
  const orders = await readOrders();
  return orders.find((order) => order.qrisId === qrisId);
}
