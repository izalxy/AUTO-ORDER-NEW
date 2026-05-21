const productTabs = document.querySelector("#productTabs");
const productTitle = document.querySelector("#productTitle");
const productTagline = document.querySelector("#productTagline");
const plansEl = document.querySelector("#plans");
const orderForm = document.querySelector("#orderForm");
const formMessage = document.querySelector("#formMessage");
const summaryProduct = document.querySelector("#summaryProduct");
const summaryPlan = document.querySelector("#summaryPlan");
const summaryPrice = document.querySelector("#summaryPrice");
const paymentDialog = document.querySelector("#paymentDialog");
const closeDialog = document.querySelector("#closeDialog");
const qrisImage = document.querySelector("#qrisImage");
const orderIdText = document.querySelector("#orderIdText");
const payAmount = document.querySelector("#payAmount");
const paymentStatus = document.querySelector("#paymentStatus");
const checkoutLink = document.querySelector("#checkoutLink");
const bgVideo = document.querySelector(".bg-video");
const soundToggle = document.querySelector("#soundToggle");
const layout = document.querySelector(".layout");
const startOrder = document.querySelector("#startOrder");
const openGuide = document.querySelector("#openGuide");
const orderArea = document.querySelector("#orderArea");
const robotAssistant = document.querySelector("#robotAssistant");
const robotToggle = document.querySelector("#robotToggle");
const botChat = document.querySelector("#botChat");
const botActions = document.querySelector(".bot-actions");

let products = [];
let selectedProduct = null;
let selectedPlan = null;
let pollingTimer = null;

const helpReplies = {
  payment:
    "Klik Buat QRIS, scan kode yang muncul, lalu bayar sesuai total sampai digit uniknya. Setelah paid, owner otomatis dapat notifikasi.",
  package:
    "📦 DAFTAR PRODUK:\n\n🔴 BUG MANTAX:\n├ Member Harian: Rp5.000/hari\n├ Member Bulanan: Rp40.000/bulan\n├ Full Up: Rp60.000 (Permanen)\n├ Reseller: Rp80.000 (Permanen)\n├ PT Partner: Rp100.000 (Permanen)\n└ TK: Rp150.000 (Permanen)\n\n⚫ NECROBYTE:\n├ 1 Hari: Rp2.000\n├ 2 Hari: Rp5.000\n├ 1 Bulan: Rp10.000\n├ Permanen: Rp20.000\n├ Reseller: Rp30.000\n├ Partner: Rp40.000\n├ TK: Rp50.000\n├ Moderator: Rp80.000\n└ Owner: Rp110.000\n\n🛠️ JASA APK BUG:\n├ Base dari LU: Rp15.000\n└ Base dari GW: Rp25.000\n\n💀 PPL PROJECT:\n├ 1 Bulan: Rp35.000\n└ Permanen: Rp50.000\n\n🔥 FLUX PROJECT: COMING SOON!",
  status:
    "Kalau dialog QRIS masih terbuka, status akan dicek otomatis. Setelah paid, owner akan diperingatkan lewat Telegram sampai order diproses."
};

function rupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(amount);
}

function setMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
}

function selectProduct(productId) {
  selectedProduct = products.find((product) => product.id === productId) || products[0];
  selectedPlan = selectedProduct.plans[0];
  render();
  animateProductSwitch(productId);
}

function selectPlan(planId) {
  selectedPlan = selectedProduct.plans.find((plan) => plan.id === planId) || selectedProduct.plans[0];
  render();
}

function renderTabs() {
  productTabs.innerHTML = products
    .map(
      (product) => `
        <button class="tab ${product.id === selectedProduct.id ? "active" : ""}" type="button" data-product="${product.id}">
          <span>${product.name}</span>
        </button>
      `
    )
    .join("");
}

function renderPlans() {
  plansEl.innerHTML = selectedProduct.plans
    .map(
      (plan) => `
        <button class="plan ${plan.id === selectedPlan.id ? "active" : ""}" type="button" data-plan="${plan.id}">
          <strong>${plan.label}</strong>
          <span class="duration">${plan.duration}</span>
          <span class="price">${rupiah(plan.price)}</span>
        </button>
      `
    )
    .join("");
  bindPlanTilt();
}

function renderSummary() {
  summaryProduct.textContent = selectedProduct.name;
  summaryPlan.textContent = `${selectedPlan.label} - ${selectedPlan.duration}`;
  summaryPrice.textContent = rupiah(selectedPlan.price);
}

function render() {
  productTitle.textContent = selectedProduct.name;
  productTagline.textContent = selectedProduct.tagline;
  renderTabs();
  renderPlans();
  renderSummary();
}

function bindPlanTilt() {
  document.querySelectorAll(".plan").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      if (window.matchMedia("(max-width: 820px)").matches) return;

      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--tilt-x", `${-y * 12}deg`);
      card.style.setProperty("--tilt-y", `${x * 12}deg`);
      card.classList.add("tilting");
    });

    card.addEventListener("pointerleave", () => {
      card.classList.remove("tilting");
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
    });
  });
}

function animateProductSwitch(productId) {
  const activeTab = productTabs.querySelector(`[data-product="${productId}"]`);
  activeTab?.classList.add("launching");
  layout.classList.remove("switching");
  void layout.offsetWidth;
  layout.classList.add("switching");

  window.setTimeout(() => {
    activeTab?.classList.remove("launching");
    layout.classList.remove("switching");
  }, 700);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request gagal.");
  return body;
}

function openPayment(order) {
  qrisImage.src = order.qrisImageBase64 || order.qrisImageUrl;
  orderIdText.textContent = order.id;
  payAmount.textContent = rupiah(order.amount);
  paymentStatus.textContent = order.status;
  checkoutLink.href = order.checkoutUrl;
  paymentDialog.showModal();
  startPolling(order.id);
  addBotMessage(`Order ${order.id} sudah dibuat. Aku akan bantu pantau statusnya di layar ini.`);
}

function startPolling(orderId) {
  window.clearInterval(pollingTimer);
  pollingTimer = window.setInterval(async () => {
    try {
      const { order } = await api(`/api/orders/${encodeURIComponent(orderId)}`);
      paymentStatus.textContent = order.status;
      if (["paid", "fulfilled", "expired", "cancelled"].includes(order.status)) {
        window.clearInterval(pollingTimer);
      }
    } catch (error) {
      console.error(error);
    }
  }, 5000);
}

productTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product]");
  if (!button) return;
  selectProduct(button.dataset.product);
});

plansEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-plan]");
  if (!button) return;
  selectPlan(button.dataset.plan);
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = orderForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  setMessage("Membuat QRIS...");

  const formData = new FormData(orderForm);
  try {
    const { order } = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        productId: selectedProduct.id,
        planId: selectedPlan.id,
        customerName: formData.get("customerName"),
        customerContact: formData.get("customerContact"),
        note: formData.get("note")
      })
    });
    setMessage("QRIS berhasil dibuat. Silakan scan total yang muncul.");
    openPayment(order);
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

closeDialog.addEventListener("click", () => {
  window.clearInterval(pollingTimer);
  paymentDialog.close();
});

function addBotMessage(message, fromUser = false) {
  const bubble = document.createElement("p");
  bubble.className = `bot-bubble${fromUser ? " user" : ""}`;
  bubble.textContent = message;
  botChat.append(bubble);
  botChat.scrollTop = botChat.scrollHeight;
}

robotToggle.addEventListener("click", () => {
  robotAssistant.classList.toggle("open");
});

soundToggle.addEventListener("click", async () => {
  bgVideo.muted = !bgVideo.muted;
  bgVideo.volume = 0.55;

  try {
    await bgVideo.play();
  } catch (error) {
    console.error(error);
  }

  soundToggle.textContent = bgVideo.muted ? "Sound off" : "Sound on";
  soundToggle.setAttribute("aria-label", bgVideo.muted ? "Nyalakan suara video" : "Matikan suara video");
});

startOrder.addEventListener("click", () => {
  orderArea.scrollIntoView({ behavior: "smooth", block: "start" });
});

openGuide.addEventListener("click", () => {
  robotAssistant.classList.add("open");
  addBotMessage("Urutannya simpel: pilih menu produk, pilih paket harga, isi data pembeli, lalu klik Buat QRIS.");
});

botActions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-help]");
  if (!button) return;

  addBotMessage(button.textContent, true);
  addBotMessage(helpReplies[button.dataset.help]);
});

async function boot() {
  try {
    const { products: productList } = await api("/api/products");
    products = productList;
    selectedProduct = products[0];
    selectedPlan = selectedProduct.plans[0];
    render();

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order");
    if (orderId) {
      const { order } = await api(`/api/orders/${encodeURIComponent(orderId)}`);
      openPayment(order);
    }
  } catch (error) {
    setMessage(`Backend belum aktif: ${error.message}`, true);
  }
}

boot();
