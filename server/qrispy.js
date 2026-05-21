const QRISPY_BASE_URL = "https://api.qrispy.id";

function getToken() {
  const token = process.env.QRISPY_API_TOKEN;
  if (!token) {
    throw new Error("QRISPY_API_TOKEN belum diisi.");
  }
  return token;
}

async function qrispyFetch(path, options = {}) {
  const response = await fetch(`${QRISPY_BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-API-TOKEN": getToken(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status === "error") {
    throw new Error(body.message || `QRISPY error ${response.status}`);
  }

  return body.data;
}

export async function generateQris({ amount, orderId, returnUrl }) {
  return qrispyFetch("/api/payment/qris/generate", {
    method: "POST",
    body: JSON.stringify({
      amount,
      payment_reference: orderId,
      return_url: returnUrl
    })
  });
}

export async function checkQrisStatus(qrisId) {
  return qrispyFetch(`/api/payment/qris/${encodeURIComponent(qrisId)}/status`);
}
