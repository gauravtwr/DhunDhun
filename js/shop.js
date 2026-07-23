/* Product rendering, placeholder art, and filtering for the shop page + home page featured strip. */

const TYPE_ICON = {
  "Bags": "👜",
  "Stationery": "✏️",
  "Keychains": "🔑",
  "Desk Decor": "💡",
  "Art Supplies": "🎨",
  "Toys & Collectibles": "🧸",
  "Gifts": "🎁",
  "Corporate": "💼"
};

const TYPE_BG = {
  "Bags": "var(--pink)",
  "Stationery": "var(--mint)",
  "Keychains": "var(--lavender)",
  "Desk Decor": "var(--pink)",
  "Art Supplies": "var(--lavender)",
  "Toys & Collectibles": "var(--mint)",
  "Gifts": "var(--pink)",
  "Corporate": "var(--lavender)"
};

function isOutOfStock(p) {
  return typeof p.quantity === "number" && p.quantity <= 0;
}

function escapeHtmlAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function productCardHTML(p) {
  const icon = TYPE_ICON[p.type] || "🎀";
  const bg = TYPE_BG[p.type] || "var(--pink)";
  const outOfStock = isOutOfStock(p);
  const message = `Hi ${SITE_CONFIG.brandName}! I'd like to order "${p.name}" (₹${p.price}). Is it available?`;
  const tagLabel = outOfStock ? "Out of Stock" : p.tag;
  const tagClass = outOfStock ? "product-tag out-of-stock" : "product-tag";
  const orderControl = outOfStock
    ? `<span class="product-order-btn disabled">Out of Stock</span>`
    : `<a class="product-order-btn" href="${waLink(message)}" target="_blank" rel="noopener"><span>💬</span> Order</a>`;
  const thumbInner = p.image
    ? `<img src="${escapeHtmlAttr(p.image)}" alt="${escapeHtmlAttr(p.name)}" loading="lazy">`
    : `<span aria-hidden="true">${icon}</span>`;
  return `
    <article class="product-card${outOfStock ? " is-out-of-stock" : ""}" data-type="${p.type}" data-audiences="${p.audiences.join(",")}">
      <div class="product-thumb${p.image ? " has-image" : ""}" style="background:${bg}">
        ${tagLabel ? `<span class="${tagClass}">${tagLabel}</span>` : ""}
        ${thumbInner}
      </div>
      <div class="product-body">
        <span class="product-type">${p.type}</span>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.description}</p>
        <div class="product-footer">
          <span class="product-price">₹${p.price}</span>
          ${orderControl}
        </div>
      </div>
    </article>`;
}

function renderProducts(containerId, list) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="results-empty">No products match this filter yet — try another category, or <a href="contact.html#custom-request" style="color:var(--coral-deep); font-weight:700;">request a custom gift</a>.</div>`;
    return;
  }
  el.innerHTML = list.map(productCardHTML).join("");
}

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ---------- Shop page setup (with pagination) ---------- */

const shopFilterState = { audience: "all", type: "all" };
const shopPageState = { page: 1, pageSize: 20 };

function getShopFilteredList() {
  let list = PRODUCTS;
  if (shopFilterState.audience !== "all") list = list.filter((p) => p.audiences.includes(shopFilterState.audience));
  if (shopFilterState.type !== "all") list = list.filter((p) => p.type === shopFilterState.type);
  return list;
}

function renderShopGrid() {
  const list = getShopFilteredList();
  const pageSize = shopPageState.pageSize === "all" ? Math.max(list.length, 1) : shopPageState.pageSize;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  if (shopPageState.page > totalPages) shopPageState.page = totalPages;
  if (shopPageState.page < 1) shopPageState.page = 1;

  const start = (shopPageState.page - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  renderProducts("product-grid", pageItems);
  renderShopPagination(list.length, totalPages, pageSize);
}

function renderShopPagination(totalItems, totalPages, pageSize) {
  const el = document.getElementById("pagination-controls");
  if (!el) return;
  if (!totalItems) {
    el.innerHTML = "";
    return;
  }

  const page = shopPageState.page;
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
      if (val === "prev") shopPageState.page -= 1;
      else if (val === "next") shopPageState.page += 1;
      else shopPageState.page = parseInt(val, 10);
      renderShopGrid();
      document.getElementById("product-grid").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initShopPage() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  const tabs = document.querySelectorAll(".tab-btn");
  const typeSelect = document.getElementById("type-filter");
  const pageSizeSelect = document.getElementById("page-size-select");

  // Populate type filter options from data
  const types = Array.from(new Set(PRODUCTS.map((p) => p.type))).sort();
  types.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      shopFilterState.audience = tab.getAttribute("data-audience");
      shopPageState.page = 1;
      renderShopGrid();
    });
  });

  typeSelect.addEventListener("change", () => {
    shopFilterState.type = typeSelect.value;
    shopPageState.page = 1;
    renderShopGrid();
  });

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", () => {
      shopPageState.pageSize = pageSizeSelect.value === "all" ? "all" : parseInt(pageSizeSelect.value, 10);
      shopPageState.page = 1;
      renderShopGrid();
    });
  }

  // Pre-select audience tab from ?audience= URL param (used by home page category links)
  const preset = getUrlParam("audience");
  if (preset) {
    const match = document.querySelector(`.tab-btn[data-audience="${preset}"]`);
    if (match) {
      tabs.forEach((t) => t.classList.remove("active"));
      match.classList.add("active");
      shopFilterState.audience = preset;
    }
  }

  renderShopGrid();
}

/* ---------- Home page featured products ---------- */

function initFeaturedProducts() {
  const el = document.getElementById("featured-grid");
  if (!el) return;
  // Most recently added products live at the end of the catalog array —
  // take from the end first so newly added items always surface here,
  // instead of always showing the same original bestsellers.
  const tagged = PRODUCTS.filter((p) => p.tag === "Bestseller" || p.tag === "New");
  const featured = tagged.slice(-8).reverse();
  renderProducts("featured-grid", featured);
}

document.addEventListener("DOMContentLoaded", () => {
  initShopPage();
  initFeaturedProducts();
});
