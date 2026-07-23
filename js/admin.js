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
let currentImages = [];
let extraCategories = new Set();

/* A product may have the legacy singular "image" field (old data) or the
   newer "images" array. This always returns an array, oldest-safe. */
function getProductImages(p) {
  if (p.images && p.images.length) return p.images;
  if (p.image) return [p.image];
  return [];
}

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const hash = await sha256Hex(input.value);
    if (hash === SITE_CONFIG.adminPasswordHash) {
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
  document.getElementById("search-input").addEventListener("input", () => {
    adminPageState.page = 1;
    renderTable();
  });
  document.getElementById("admin-page-size-select").addEventListener("change", (e) => {
    adminPageState.pageSize = e.target.value === "all" ? "all" : parseInt(e.target.value, 10);
    adminPageState.page = 1;
    renderTable();
  });

  document.getElementById("f-image").addEventListener("change", handleImageSelect);

  initCategoryControls();
}

/* ---------- Product photo (compressed to a data URL, no server needed) ---------- */

function compressImage(file, maxDimension, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function handleImageSelect() {
  const fileInput = document.getElementById("f-image");
  const files = Array.from(fileInput.files);
  if (!files.length) return;
  Promise.all(files.map((file) => compressImage(file, 900, 0.82))).then((dataUrls) => {
    currentImages.push(...dataUrls);
    renderImageStrip();
    fileInput.value = "";
  });
}

function renderImageStrip() {
  const strip = document.getElementById("f-image-strip");
  strip.innerHTML = currentImages
    .map(
      (src, i) => `
      <div class="image-thumb">
        <img src="${src}" alt="Product photo ${i + 1}">
        <button type="button" class="image-thumb-remove" data-index="${i}" title="Remove photo">✕</button>
      </div>`
    )
    .join("");
  strip.querySelectorAll(".image-thumb-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentImages.splice(parseInt(btn.getAttribute("data-index"), 10), 1);
      renderImageStrip();
    });
  });
}

function clearImageStrip() {
  currentImages = [];
  document.getElementById("f-image").value = "";
  renderImageStrip();
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

function refreshCategoryDatalist(selectedValue) {
  const select = document.getElementById("f-category");
  const toSelect = selectedValue !== undefined ? selectedValue : select.value;
  const types = Array.from(new Set([...catalog.map((p) => p.type), ...extraCategories])).sort();
  select.innerHTML =
    `<option value="" disabled ${!toSelect ? "selected" : ""}>Choose a category…</option>` +
    types.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  if (types.includes(toSelect)) select.value = toSelect;
}

function initCategoryControls() {
  const toggleBtn = document.getElementById("toggle-new-category-btn");
  const row = document.getElementById("new-category-row");
  const input = document.getElementById("new-category-input");

  toggleBtn.addEventListener("click", () => {
    const showing = row.style.display === "flex";
    row.style.display = showing ? "none" : "flex";
    if (!showing) input.focus();
  });

  document.getElementById("confirm-new-category-btn").addEventListener("click", () => {
    const name = input.value.trim();
    if (!name) return;
    extraCategories.add(name);
    refreshCategoryDatalist(name);
    row.style.display = "none";
    input.value = "";
  });
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

const adminPageState = { page: 1, pageSize: 20 };

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
    renderAdminPagination(0, 1, adminPageState.pageSize);
    return;
  }

  const pageSize = adminPageState.pageSize === "all" ? Math.max(rows.length, 1) : adminPageState.pageSize;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (adminPageState.page > totalPages) adminPageState.page = totalPages;
  if (adminPageState.page < 1) adminPageState.page = 1;
  const start = (adminPageState.page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  tbody.innerHTML = pageRows
    .map((p) => {
      const outOfStock = isOutOfStockRow(p);
      const images = getProductImages(p);
      return `
      <tr>
        <td>
          <div class="row-product-cell">
            ${images.length ? `<img class="row-thumb" src="${images[0]}" alt="">` : `<span class="row-thumb row-thumb-empty">🎀</span>`}
            <div>
              <strong>${escapeHtml(p.name)}</strong>${images.length > 1 ? `<span class="row-photo-count">${images.length} photos</span>` : ""}
              <div class="row-desc">${escapeHtml(p.description || "")}</div>
            </div>
          </div>
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

  renderAdminPagination(rows.length, totalPages, pageSize);
}

function renderAdminPagination(totalItems, totalPages, pageSize) {
  const el = document.getElementById("admin-pagination-controls");
  if (!el) return;
  if (!totalItems) {
    el.innerHTML = "";
    return;
  }

  const page = adminPageState.page;
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(totalItems, page * pageSize);

  const windowSize = 5;
  let startPage = Math.max(1, page - Math.floor(windowSize / 2));
  let endPage = Math.min(totalPages, startPage + windowSize - 1);
  startPage = Math.max(1, endPage - windowSize + 1);

  let numberButtons = "";
  if (startPage > 1) {
    numberButtons += `<button class="page-btn" data-page="1">1</button>`;
    if (startPage > 2) numberButtons += `<span class="page-ellipsis">…</span>`;
  }
  for (let p = startPage; p <= endPage; p++) {
    numberButtons += `<button class="page-btn${p === page ? " active" : ""}" data-page="${p}">${p}</button>`;
  }
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) numberButtons += `<span class="page-ellipsis">…</span>`;
    numberButtons += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }

  el.innerHTML = `
    <div class="pagination-info">Showing ${rangeStart}–${rangeEnd} of ${totalItems} products</div>
    <div class="pagination-buttons">
      <button class="page-btn" data-page="prev" ${page === 1 ? "disabled" : ""}>‹ Prev</button>
      ${numberButtons}
      <button class="page-btn" data-page="next" ${page === totalPages ? "disabled" : ""}>Next ›</button>
    </div>
  `;

  el.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-page");
      if (val === "prev") adminPageState.page -= 1;
      else if (val === "next") adminPageState.page += 1;
      else adminPageState.page = parseInt(val, 10);
      renderTable();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
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

  const productData = { name, type, price, quantity, tag, description, audiences, images: currentImages.length ? [...currentImages] : undefined };

  if (editingId) {
    const idx = catalog.findIndex((p) => p.id === editingId);
    if (idx !== -1) {
      const updated = { ...catalog[idx], ...productData };
      delete updated.image; // legacy singular field, superseded by "images"
      if (!currentImages.length) delete updated.images;
      catalog[idx] = updated;
    }
    exitEditMode();
  } else {
    if (!currentImages.length) delete productData.images;
    catalog.push({ id: "p" + Date.now(), ...productData });
    e.target.reset();
    clearImageStrip();
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

  currentImages = getProductImages(p).slice();
  renderImageStrip();

  document.getElementById("form-title").textContent = `Edit "${p.name}"`;
  document.getElementById("submit-btn").textContent = "Update Product";
  document.getElementById("cancel-edit-btn").style.display = "inline-flex";
  document.getElementById("product-form").scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitEditMode() {
  editingId = null;
  document.getElementById("product-form").reset();
  clearImageStrip();
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
  images: optional array of compressed base64 photos added via the
  dashboard's photo upload, shown as a swipeable gallery on the site.
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

/* ---------- Change password ---------- */

function buildConfigFileContents(newHash) {
  const c = SITE_CONFIG;
  return `/*
  DhunDhun site configuration.
  ------------------------------------------------------------
  EDIT THIS FILE FIRST. Everything here is a placeholder until you
  swap in your real details. Every page reads from this file, so you
  only need to update it in one place.
*/

const SITE_CONFIG = {
  brandName: "${c.brandName}",
  tagline: "${c.tagline}",

  // Replace with your real WhatsApp business number, country code first, no + or spaces.
  // Example: "919812345678" for an Indian number 98123 45678
  whatsappNumber: "${c.whatsappNumber}",

  // Social links — replace with your real handles. Leave "" to hide a link.
  social: {
    instagram: "${c.social.instagram}",
    facebook: "${c.social.facebook}",
    pinterest: "${c.social.pinterest}",
    youtube: "${c.social.youtube}"
  },

  email: "${c.email}",

  // Shown on the Contact and Corporate Gifting pages.
  location: "${c.location}",

  // SHA-256 hash of the password to open admin.html (the product dashboard).
  // This is NOT the same as storing the password in plain text — nobody
  // can read your actual password from this file, only its one-way hash.
  // BUT: because this is a public static site, someone could still try to
  // crack this hash offline (try candidate passwords until one matches),
  // with no rate limit stopping them. So this raises the bar, it does not
  // make the dashboard truly secure. Use a password you don't reuse
  // elsewhere, and treat this dashboard as "hard to stumble into", not
  // "impossible to break into".
  //
  // Generated by the dashboard's "Change Password" panel.
  adminPasswordHash: "${newHash}"
};

async function sha256Hex(text) {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
`;
}

function initChangePassword() {
  const toggleBtn = document.getElementById("change-password-toggle");
  const panel = document.getElementById("change-password-panel");
  const form = document.getElementById("change-password-form");
  const errorEl = document.getElementById("password-form-error");
  const successEl = document.getElementById("password-success");
  const exportPanel = document.getElementById("password-export-panel");
  let pendingHash = null;

  toggleBtn.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.style.display = "none";
    successEl.style.display = "none";
    exportPanel.style.display = "none";

    const current = document.getElementById("cp-current").value;
    const next = document.getElementById("cp-new").value;
    const confirmVal = document.getElementById("cp-confirm").value;

    const currentHash = await sha256Hex(current);
    if (currentHash !== SITE_CONFIG.adminPasswordHash) {
      errorEl.textContent = "Current password is incorrect.";
      errorEl.style.display = "block";
      return;
    }
    if (next.length < 6) {
      errorEl.textContent = "New password must be at least 6 characters.";
      errorEl.style.display = "block";
      return;
    }
    if (next !== confirmVal) {
      errorEl.textContent = "New password and confirmation don't match.";
      errorEl.style.display = "block";
      return;
    }

    pendingHash = await sha256Hex(next);
    SITE_CONFIG.adminPasswordHash = pendingHash;

    successEl.textContent = "Password updated for this browser session. Download the config file below to make it permanent.";
    successEl.style.display = "block";
    exportPanel.style.display = "flex";
    form.reset();
  });

  document.getElementById("export-config-btn").addEventListener("click", () => {
    if (!pendingHash) return;
    const contents = buildConfigFileContents(pendingHash);
    const blob = new Blob([contents], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById("copy-config-btn").addEventListener("click", () => {
    if (!pendingHash) return;
    navigator.clipboard.writeText(buildConfigFileContents(pendingHash)).then(() => {
      const btn = document.getElementById("copy-config-btn");
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = original), 1500);
    });
  });
}

/* ---------- Forgot password (reset without verification, from the lock screen) ---------- */

function initForgotPassword() {
  const link = document.getElementById("forgot-password-link");
  const panel = document.getElementById("forgot-password-panel");
  const errorEl = document.getElementById("fp-error");
  const exportPanel = document.getElementById("fp-export-panel");
  let pendingHash = null;

  link.addEventListener("click", (e) => {
    e.preventDefault();
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  });

  document.getElementById("fp-generate-btn").addEventListener("click", async () => {
    errorEl.style.display = "none";
    exportPanel.style.display = "none";
    pendingHash = null;

    const next = document.getElementById("fp-new").value;
    const confirmVal = document.getElementById("fp-confirm").value;

    if (next.length < 6) {
      errorEl.textContent = "New password must be at least 6 characters.";
      errorEl.style.display = "block";
      return;
    }
    if (next !== confirmVal) {
      errorEl.textContent = "New password and confirmation don't match.";
      errorEl.style.display = "block";
      return;
    }

    pendingHash = await sha256Hex(next);
    exportPanel.style.display = "block";
  });

  document.getElementById("fp-download-btn").addEventListener("click", () => {
    if (!pendingHash) return;
    const contents = buildConfigFileContents(pendingHash);
    const blob = new Blob([contents], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById("fp-copy-btn").addEventListener("click", () => {
    if (!pendingHash) return;
    navigator.clipboard.writeText(buildConfigFileContents(pendingHash)).then(() => {
      const btn = document.getElementById("fp-copy-btn");
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = original), 1500);
    });
  });
}

document.addEventListener("DOMContentLoaded", initAuthGate);
document.addEventListener("DOMContentLoaded", initChangePassword);
document.addEventListener("DOMContentLoaded", initForgotPassword);
