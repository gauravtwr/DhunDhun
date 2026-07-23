/*
  DhunDhun admin dashboard logic.
  ------------------------------------------------------------
  Products are edited against a working copy kept in this browser's
  localStorage (seeded from PRODUCTS in products-data.js the first time).
  Nothing here talks to a server — when you're done making changes,
  use "Export Updated File" to download a new products-data.js and
  replace the one in your project, then redeploy your site.
*/

const STORAGE_KEY = "dhundhun_admin_catalog";
const AUTH_KEY = "dhundhun_admin_auth";

let catalog = [];
let editingId = null;

/* ---------- Auth gate ---------- */

function initAuthGate() {
  const gate = document.getElementById("auth-gate");
  const dashboard = document.getElementById("dashboard");
  const form = document.getElementById("auth-form");
  const input = document.getElementById("auth-password");
  const error = document.getElementById("auth-error");

  function unlock() {
    gate.style.display = "none";
    dashboard.style.display = "block";
    initDashboard();
  }

  if (sessionStorage.getItem(AUTH_KEY) === "true") {
    unlock();
    return;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value === SITE_CONFIG.adminPassword) {
      sessionStorage.setItem(AUTH_KEY, "true");
      unlock();
    } else {
      error.style.display = "block";
      input.value = "";
      input.focus();
    }
  });
}

document.getElementById("logout-btn")?.addEventListener("click", () => {
  sessionStorage.removeItem(AUTH_KEY);
  window.location.reload();
});

/* ---------- Catalog storage ---------- */

function loadCatalog() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not parse saved catalog, falling back to file defaults.", e);
    }
  }
  return PRODUCTS.map((p) => ({ ...p }));
}

function saveCatalog() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
}

function isOutOfStockRow(p) {
  return typeof p.quantity === "number" && p.quantity <= 0;
}

/* ---------- Dashboard init ---------- */

function initDashboard() {
  catalog = loadCatalog();
  populateAudienceCheckboxes();
  refreshCategoryDatalist();
  renderStats();
  renderTable();

  document.getElementById("product-form").addEventListener("submit", handleFormSubmit);
  document.getElementById("cancel-edit-btn").addEventListener("click", exitEditMode);
  document.getElementById("export-btn").addEventListener("click", exportCatalog);
  document.getElementById("copy-btn").addEventListener("click", copyCatalogCode);
  document.getElementById("reset-btn").addEventListener("click", resetToFileDefaults);
  document.getElementById("search-input").addEventListener("input", renderTable);
}

function populateAudienceCheckboxes() {
  const wrap = document.getElementById("audience-checkboxes");
  wrap.innerHTML = Object.entries(AUDIENCE_LABELS)
    .map(
      ([key, label]) => `
      <label class="chip-checkbox">
        <input type="checkbox" name="audience" value="${key}"> ${label}
      </label>`
    )
    .join("");
}

function refreshCategoryDatalist() {
  const list = document.getElementById("category-list");
  const types = Array.from(new Set(catalog.map((p) => p.type))).sort();
  list.innerHTML = types.map((t) => `<option value="${t}"></option>`).join("");
}

/* ---------- Stats ---------- */

function renderStats() {
  const total = catalog.length;
  const outOfStock = catalog.filter(isOutOfStockRow).length;
  const inStock = total - outOfStock;
  const categories = new Set(catalog.map((p) => p.type)).size;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-instock").textContent = inStock;
  document.getElementById("stat-outofstock").textContent = outOfStock;
  document.getElementById("stat-categories").textContent = categories;
}

/* ---------- Table ---------- */

function renderTable() {
  const tbody = document.getElementById("product-table-body");
  const query = document.getElementById("search-input").value.trim().toLowerCase();

  let rows = catalog;
  if (query) {
    rows = rows.filter(
      (p) => p.name.toLowerCase().includes(query) || p.type.toLowerCase().includes(query)
    );
  }

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No products match your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((p) => {
      const outOfStock = isOutOfStockRow(p);
      return `
      <tr>
        <td>
          <strong>${escapeHtml(p.name)}</strong>
          <div class="row-desc">${escapeHtml(p.description || "")}</div>
        </td>
        <td>${escapeHtml(p.type)}</td>
        <td>${p.audiences.map((a) => AUDIENCE_LABELS[a] || a).join(", ")}</td>
        <td>₹${p.price}</td>
        <td>${p.quantity}</td>
        <td><span class="status-badge ${outOfStock ? "status-out" : "status-in"}">${outOfStock ? "Out of Stock" : "In Stock"}</span></td>
        <td class="row-actions">
          <button class="icon-btn" data-action="edit" data-id="${p.id}" title="Edit">✏️</button>
          <button class="icon-btn" data-action="delete" data-id="${p.id}" title="Delete">🗑️</button>
        </td>
      </tr>`;
    })
    .join("");

  tbody.querySelectorAll("[data-action='edit']").forEach((btn) =>
    btn.addEventListener("click", () => enterEditMode(btn.getAttribute("data-id")))
  );
  tbody.querySelectorAll("[data-action='delete']").forEach((btn) =>
    btn.addEventListener("click", () => deleteProduct(btn.getAttribute("data-id")))
  );
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Form: add / edit ---------- */

function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("f-name").value.trim();
  const type = document.getElementById("f-category").value.trim();
  const price = parseFloat(document.getElementById("f-price").value);
  const quantity = parseInt(document.getElementById("f-quantity").value, 10);
  const tag = document.getElementById("f-tag").value;
  const description = document.getElementById("f-description").value.trim();
  const audiences = Array.from(
    document.querySelectorAll("#audience-checkboxes input[name='audience']:checked")
  ).map((el) => el.value);

  const errorEl = document.getElementById("form-error");
  if (!name || !type || audiences.length === 0 || isNaN(price) || price < 0 || isNaN(quantity) || quantity < 0) {
    errorEl.textContent = "Please fill in product name, category, at least one audience, a valid price, and a valid quantity (0 or more).";
    errorEl.style.display = "block";
    return;
  }
  errorEl.style.display = "none";

  const productData = { name, type, price, quantity, tag, description, audiences };

  if (editingId) {
    const idx = catalog.findIndex((p) => p.id === editingId);
    if (idx !== -1) catalog[idx] = { ...catalog[idx], ...productData };
    exitEditMode();
  } else {
    catalog.push({ id: "p" + Date.now(), ...productData });
    e.target.reset();
  }

  saveCatalog();
  refreshCategoryDatalist();
  renderStats();
  renderTable();
}

function enterEditMode(id) {
  const p = catalog.find((p) => p.id === id);
  if (!p) return;
  editingId = id;

  document.getElementById("f-name").value = p.name;
  document.getElementById("f-category").value = p.type;
  document.getElementById("f-price").value = p.price;
  document.getElementById("f-quantity").value = p.quantity;
  document.getElementById("f-tag").value = p.tag || "";
  document.getElementById("f-description").value = p.description || "";

  document.querySelectorAll("#audience-checkboxes input[name='audience']").forEach((el) => {
    el.checked = p.audiences.includes(el.value);
  });

  document.getElementById("form-title").textContent = `Edit "${p.name}"`;
  document.getElementById("submit-btn").textContent = "Update Product";
  document.getElementById("cancel-edit-btn").style.display = "inline-flex";
  document.getElementById("product-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitEditMode() {
  editingId = null;
  document.getElementById("product-form").reset();
  document.getElementById("form-title").textContent = "Add a New Product";
  document.getElementById("submit-btn").textContent = "Add Product";
  document.getElementById("cancel-edit-btn").style.display = "none";
  document.getElementById("form-error").style.display = "none";
}

function deleteProduct(id) {
  const p = catalog.find((p) => p.id === id);
  if (!p) return;
  if (!confirm(`Delete "${p.name}"? This only removes it from your working catalog in this browser.`)) return;
  catalog = catalog.filter((p) => p.id !== id);
  if (editingId === id) exitEditMode();
  saveCatalog();
  refreshCategoryDatalist();
  renderStats();
  renderTable();
}

/* ---------- Export ---------- */

function buildFileContents() {
  const header = `/*
  DhunDhun product catalog.
  ------------------------------------------------------------
  Generated by the admin dashboard (admin.html). Replace the old
  js/products-data.js in your project with this file, then redeploy
  your site so visitors see these changes.

  audiences: "kids" | "students" | "loved-ones" | "artists" | "everyone" | "corporate"
  type: a short category label used for the type filter on the shop page.
  quantity: units in stock. 0 or less shows an "Out of Stock" tag on the site.
*/

`;
  const productsBlock = `const PRODUCTS = ${JSON.stringify(catalog, null, 2)};\n\n`;
  const audienceBlock = `const AUDIENCE_LABELS = ${JSON.stringify(AUDIENCE_LABELS, null, 2)};\n`;
  return header + productsBlock + audienceBlock;
}

function exportCatalog() {
  const contents = buildFileContents();
  const blob = new Blob([contents], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products-data.js";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyCatalogCode() {
  const contents = buildFileContents();
  navigator.clipboard.writeText(contents).then(() => {
    const btn = document.getElementById("copy-btn");
    const original = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = original), 1500);
  });
}

function resetToFileDefaults() {
  if (!confirm("Discard all changes made in this dashboard and reload the original products-data.js? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_KEY);
  catalog = PRODUCTS.map((p) => ({ ...p }));
  saveCatalog();
  refreshCategoryDatalist();
  renderStats();
  renderTable();
  exitEditMode();
}

document.addEventListener("DOMContentLoaded", initAuthGate);
