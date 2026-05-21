const catalog = [
  {
    id: "bug-manta",
    name: "🔴 BUG MANTAX",
    tagline: "APK Bug + Script Manta | Fitur Lengkap",
    plans: [
      { id: "manta-harian", label: "✅ Member Harian", duration: "1 Hari", price: 5000 },
      { id: "manta-bulanan", label: "✅ Member Bulanan", duration: "1 Bulan", price: 40000 },
      { id: "manta-full-up", label: "✅ Full Up", duration: "Permanen", price: 60000 },
      { id: "manta-reseller", label: "✅ Reseller", duration: "Permanen", price: 80000 },
      { id: "manta-pt", label: "✅ PT (Partner)", duration: "Permanen", price: 100000 },
      { id: "manta-tk", label: "✅ TK (Tangan Kanan)", duration: "Permanen", price: 150000 }
    ]
  },
  {
    id: "necrobyte",
    name: "⚫ NECROBYTE",
    tagline: "Aplikasi Bug Necrobyte | Fitur Lengkap",
    plans: [
      { id: "necro-1hari", label: "1 Hari", duration: "1 Hari", price: 2000 },
      { id: "necro-2hari", label: "2 Hari", duration: "2 Hari", price: 5000 },
      { id: "necro-1bulan", label: "1 Bulan", duration: "1 Bulan", price: 10000 },
      { id: "necro-permanen", label: "Permanen", duration: "Permanen", price: 20000 },
      { id: "necro-reseller", label: "Reseller", duration: "Permanen", price: 30000 },
      { id: "necro-partner", label: "Partner", duration: "Permanen", price: 40000 },
      { id: "necro-tk", label: "TK", duration: "Permanen", price: 50000 },
      { id: "necro-moderator", label: "Moderator", duration: "Permanen", price: 80000 },
      { id: "necro-owner", label: "Owner", duration: "Permanen", price: 110000 }
    ]
  },
  {
    id: "jasa-apk-bug",
    name: "🛠️ JASA APK BUG",
    tagline: "Buat APK Bug Custom | Bebas Request",
    plans: [
      { id: "jasa-base-lu", label: "Base dari LU", duration: "Jadi", price: 15000 },
      { id: "jasa-base-gw", label: "Base dari GW", duration: "Jadi", price: 25000 }
    ]
  },
  {
    id: "ppl-project",
    name: "💀 PPL PROJECT",
    tagline: "RAT Complete | Sadap & Kontrol Jarak Jauh",
    plans: [
      { id: "ppl-bulan", label: "1 Bulan", duration: "1 Bulan", price: 35000 },
      { id: "ppl-permanen", label: "Permanen", duration: "Permanen", price: 50000 }
    ]
  },
  {
    id: "flux-project",
    name: "🔥 FLUX PROJECT",
    tagline: "🚀 COMING SOON - Project Terbaru",
    isComingSoon: true,
    plans: [
      { id: "flux-vip", label: "VIP", duration: "COMING SOON", price: 50000 },
      { id: "flux-premium", label: "Premium", duration: "COMING SOON", price: 35000 },
      { id: "flux-basic", label: "Basic", duration: "COMING SOON", price: 20000 },
      { id: "flux-reseller", label: "Reseller", duration: "COMING SOON", price: 150000 }
    ]
  }
];

export function findPlan(productId, planId) {
  const product = catalog.find((item) => item.id === productId);
  if (!product) return null;

  const plan = product.plans.find((item) => item.id === planId);
  if (!plan) return null;

  return { product, plan };
}
