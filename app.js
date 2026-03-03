const STORAGE_KEY = "inventario_mac_v1";
const THEME_KEY = "inventario_mac_theme";

const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"products":[],"history":[]}');
let deferredPrompt = null;

const $ = (sel) => document.querySelector(sel);
const productForm = $("#productForm");
const movementForm = $("#movementForm");
const stockBody = $("#stockBody");
const historyList = $("#historyList");
const searchInput = $("#search");

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyThemeFromStorage() {
  const color = localStorage.getItem(THEME_KEY);
  if (color) {
    document.documentElement.style.setProperty("--primary", color);
  }
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function renderTable() {
  const q = searchInput.value.trim().toLowerCase();
  const rows = state.products
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    .map((p) => `
      <tr>
        <td>${p.sku}</td>
        <td>${p.name}</td>
        <td>${p.model || "-"}</td>
        <td>${p.variant || "-"}</td>
        <td>${p.stock}</td>
        <td>${formatMoney(p.cost)}</td>
        <td>${formatMoney(p.price)}</td>
        <td>${p.owner || "-"}</td>
        <td><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${p.color || '#2563eb'}"></span></td>
      </tr>
    `)
    .join("");

  stockBody.innerHTML = rows || `<tr><td colspan="9">Sin productos</td></tr>`;
}

function renderHistory() {
  historyList.innerHTML = state.history
    .slice()
    .reverse()
    .slice(0, 50)
    .map((m) => `<li>${m.date} — <strong>${m.type}</strong> ${m.qty} en SKU <strong>${m.sku}</strong> (${m.owner || 'sin responsable'})</li>`)
    .join("") || "<li>Sin movimientos</li>";
}

function addHistory(type, sku, qty, owner) {
  state.history.push({
    type,
    sku,
    qty,
    owner,
    date: new Date().toLocaleString("es-MX")
  });
}

productForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(productForm);
  const sku = String(fd.get("sku")).trim();
  const existing = state.products.find((p) => p.sku === sku);

  const customKey = String(fd.get("customKey") || "").trim();
  const customValue = String(fd.get("customValue") || "").trim();

  const payload = {
    name: String(fd.get("name") || "").trim(),
    sku,
    category: String(fd.get("category") || "Mac").trim(),
    model: String(fd.get("model") || "").trim(),
    variant: String(fd.get("variant") || "").trim(),
    cost: Number(fd.get("cost") || 0),
    price: Number(fd.get("price") || 0),
    supplier: String(fd.get("supplier") || "").trim(),
    owner: String(fd.get("owner") || "").trim(),
    stock: Number(fd.get("stock") || 0),
    notes: String(fd.get("notes") || "").trim(),
    color: String(fd.get("color") || "#2563eb"),
    custom: customKey ? { [customKey]: customValue } : {}
  };

  if (existing) {
    Object.assign(existing, payload);
    addHistory("edición", sku, payload.stock, payload.owner);
  } else {
    state.products.push(payload);
    addHistory("alta", sku, payload.stock, payload.owner);
  }

  persist();
  renderTable();
  renderHistory();
  productForm.reset();
});

movementForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(movementForm);
  const sku = String(fd.get("sku")).trim();
  const type = String(fd.get("type"));
  const qty = Number(fd.get("qty") || 0);
  const owner = String(fd.get("owner") || "").trim();

  const product = state.products.find((p) => p.sku === sku);
  if (!product) {
    alert("SKU no encontrado");
    return;
  }

  if (type === "entrada") product.stock += qty;
  if (type === "salida") product.stock = Math.max(0, product.stock - qty);
  if (type === "ajuste") product.stock = qty;

  if (owner) product.owner = owner;

  addHistory(type, sku, qty, owner);
  persist();
  renderTable();
  renderHistory();
  movementForm.reset();
});

searchInput.addEventListener("input", renderTable);

$("#backupBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `respaldo-inventario-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("#restoreJson").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const parsed = JSON.parse(text);
  state.products = Array.isArray(parsed.products) ? parsed.products : [];
  state.history = Array.isArray(parsed.history) ? parsed.history : [];
  persist();
  renderTable();
  renderHistory();
});

$("#exportExcel").addEventListener("click", () => {
  const worksheet = XLSX.utils.json_to_sheet(state.products);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
  XLSX.writeFile(workbook, "inventario_mac.xlsx");
});

$("#importExcel").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const first = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[first]);
  state.products = rows.map((r) => ({
    name: r.name || r.Nombre || "",
    sku: String(r.sku || r.SKU || "").trim(),
    category: r.category || r.Categoria || "Mac",
    model: r.model || r.Modelo || "",
    variant: r.variant || r.Variante || "",
    cost: Number(r.cost || r.Costo || 0),
    price: Number(r.price || r.Precio || 0),
    supplier: r.supplier || r.Proveedor || "",
    owner: r.owner || r.Responsable || "",
    stock: Number(r.stock || r.Stock || 0),
    notes: r.notes || r.Notas || "",
    color: r.color || "#2563eb",
    custom: {}
  })).filter((r) => r.sku);
  addHistory("importación excel", "N/A", state.products.length, "sistema");
  persist();
  renderTable();
  renderHistory();
});

$("#themeBtn").addEventListener("click", () => {
  const current = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#2563eb";
  const next = prompt("Escribe un color HEX (ej. #111827)", current);
  if (!next) return;
  document.documentElement.style.setProperty("--primary", next);
  localStorage.setItem(THEME_KEY, next);
});

$("#shareWhatsApp").addEventListener("click", () => {
  const top = [...state.products]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 5)
    .map((p) => `• ${p.name} (${p.sku}): ${p.stock}`)
    .join("%0A");
  const msg = `Resumen inventario Mac%0A${top || 'Sin productos'}`;
  window.open(`https://wa.me/?text=${msg}`, "_blank");
});

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $("#installBtn").classList.remove("hidden");
});

$("#installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $("#installBtn").classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

applyThemeFromStorage();
renderTable();
renderHistory();
