const STORAGE_KEY = "inventario_mac_v1";
const THEME_KEY = "inventario_mac_theme";

const state = loadState();

const itemForm = document.getElementById("itemForm");
const movementForm = document.getElementById("movementForm");
const itemSelect = document.getElementById("itemSelect");
const inventoryBody = document.getElementById("inventoryBody");
const movementLog = document.getElementById("movementLog");
const themeColor = document.getElementById("themeColor");

document.getElementById("exportExcel").addEventListener("click", exportExcel);
document.getElementById("importExcel").addEventListener("change", importExcel);
document.getElementById("backupBtn").addEventListener("click", backupJson);
document.getElementById("restoreInput").addEventListener("change", restoreJson);
document.getElementById("whatsappBtn").addEventListener("click", shareWhatsApp);

itemForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(itemForm);
  const item = {
    id: crypto.randomUUID(),
    name: fd.get("name").toString().trim(),
    sku: fd.get("sku").toString().trim(),
    category: fd.get("category").toString().trim(),
    cost: Number(fd.get("cost") || 0),
    notes: fd.get("notes").toString().trim(),
    custom: parseCustom(fd.get("custom").toString()),
    variants: {}
  };
  state.items.push(item);
  persistAndRender();
  itemForm.reset();
});

movementForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(movementForm);
  const item = state.items.find((i) => i.id === itemSelect.value);
  if (!item) return;

  const variant = fd.get("variant").toString().trim();
  const qty = Number(fd.get("qty"));
  const type = fd.get("type");
  const role = fd.get("role").toString().trim() || "sin rol";

  const current = item.variants[variant] || 0;
  item.variants[variant] = type === "in" ? current + qty : Math.max(0, current - qty);

  state.movements.unshift({
    at: new Date().toISOString(),
    itemName: item.name,
    sku: item.sku,
    variant,
    qty,
    type,
    role
  });
  state.movements = state.movements.slice(0, 200);
  persistAndRender();
  movementForm.reset();
});

themeColor.addEventListener("input", () => {
  document.documentElement.style.setProperty("--accent", themeColor.value);
  localStorage.setItem(THEME_KEY, themeColor.value);
});

function parseCustom(raw) {
  const out = {};
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [k, ...rest] = pair.split(":");
      if (!k || !rest.length) return;
      out[k.trim()] = rest.join(":").trim();
    });
  return out;
}

function render() {
  itemSelect.innerHTML = state.items
    .map((i) => `<option value="${i.id}">${i.name} (${i.sku})</option>`)
    .join("");

  inventoryBody.innerHTML = state.items
    .map((i) => {
      const variants = Object.entries(i.variants)
        .map(([v, q]) => `${v}: ${q}`)
        .join("<br>") || "-";
      const total = Object.values(i.variants).reduce((a, b) => a + b, 0);
      const custom = Object.entries(i.custom)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ") || "-";
      return `<tr>
        <td>${escapeHtml(i.name)}</td>
        <td>${escapeHtml(i.sku)}</td>
        <td>${escapeHtml(i.category)}</td>
        <td>${variants}</td>
        <td>${total}</td>
        <td>${escapeHtml(custom)}</td>
      </tr>`;
    })
    .join("");

  movementLog.innerHTML = state.movements
    .map(
      (m) =>
        `<li>${new Date(m.at).toLocaleString("es-MX")} — ${m.type === "in" ? "Entrada" : "Salida"} ${m.qty} | ${escapeHtml(m.itemName)} (${escapeHtml(m.variant)}) | rol: ${escapeHtml(m.role)}</li>`
    )
    .join("");
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], movements: [] };
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      movements: Array.isArray(parsed.movements) ? parsed.movements : []
    };
  } catch {
    return { items: [], movements: [] };
  }
}

function exportExcel() {
  const rows = [];
  for (const item of state.items) {
    const custom = JSON.stringify(item.custom);
    const variants = Object.entries(item.variants);
    if (!variants.length) {
      rows.push({ ...baseRow(item), variant: "", stock: 0, custom });
      continue;
    }
    variants.forEach(([variant, stock]) => {
      rows.push({ ...baseRow(item), variant, stock, custom });
    });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, "inventario_mac.xlsx");
}

function importExcel(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const wb = XLSX.read(data, { type: "array" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const bySku = new Map();

    for (const row of rows) {
      const sku = String(row.sku || "").trim();
      if (!sku) continue;
      if (!bySku.has(sku)) {
        bySku.set(sku, {
          id: crypto.randomUUID(),
          name: String(row.name || "Item").trim(),
          sku,
          category: String(row.category || "Mac").trim(),
          cost: Number(row.cost || 0),
          notes: String(row.notes || "").trim(),
          custom: safeJson(row.custom),
          variants: {}
        });
      }
      const item = bySku.get(sku);
      const variant = String(row.variant || "").trim();
      if (variant) item.variants[variant] = Number(row.stock || 0);
    }

    state.items = [...bySku.values()];
    persistAndRender();
  };
  reader.readAsArrayBuffer(file);
}

function baseRow(item) {
  return {
    name: item.name,
    sku: item.sku,
    category: item.category,
    cost: item.cost,
    notes: item.notes
  };
}

function backupJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  downloadBlob(blob, "inventario_backup.json");
}

function restoreJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(String(e.target.result));
      state.items = Array.isArray(parsed.items) ? parsed.items : [];
      state.movements = Array.isArray(parsed.movements) ? parsed.movements : [];
      persistAndRender();
    } catch {
      alert("JSON inválido");
    }
  };
  reader.readAsText(file);
}

function shareWhatsApp() {
  const lines = state.items.map((item) => {
    const total = Object.values(item.variants).reduce((a, b) => a + b, 0);
    return `• ${item.name} (${item.sku}): ${total}`;
  });
  const text = `Inventario Mac actual:\n${lines.join("\n")}`;
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function safeJson(raw) {
  if (typeof raw === "object" && raw !== null) return raw;
  try {
    return JSON.parse(String(raw || "{}"));
  } catch {
    return {};
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) {
  themeColor.value = savedTheme;
  document.documentElement.style.setProperty("--accent", savedTheme);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

render();
