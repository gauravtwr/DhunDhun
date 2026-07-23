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
  return `
    <article class="product-card${outOfStock ? " is-out-of-stock" : ""}" data-type="${p.type}" data-audiences="${p.audiences.join(",")}">
      <div class="product-thumb" style="background:${bg}">
        ${tagLabel ? `<span class="${tagClass}">${tagLabel}</span>` : ""}
        <span aria-hidden="true">${icon}</span>
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

/* ---------- Shop page setup ---------- */

function initShopPage() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  const tabs = document.querySelectorAll(".tab-btn");
  const typeSelect = document.getElementById("type-filter");

  // Populate type filter options from data
  const types = Array.from(new Set(PRODUCTS.map((p) => p.type))).sort();
  types.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });

  function apply() {
    const activeTab = document.querySelector(".tab-btn.active");
    const audience = activeTab ? activeTab.getAttribute("data-audience") : "all";
    const type = typeSelect.value;
    let list = PRODUCTS;
    if (audience !== "all") list = list.filter((p) => p.audiences.includes(audience));
    if (type !== "all") list = list.filter((p) => p.type === type);
    renderProducts("product-grid", list);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      apply();
    });
  });

  typeSelect.addEventListener("change", apply);

  // Pre-select audience tab from ?audience= URL param (used by home page category links)
  const preset = getUrlParam("audience");
  if (preset) {
    const match = document.querySelector(`.tab-btn[data-audience="${preset}"]`);
    if (match) {
      tabs.forEach((t) => t.classList.remove("active"));
      match.classList.add("active");
    }
  }

  apply();
}

/* ---------- Home page featured products ---------- */

function initFeaturedProducts() {
  const el = document.getElementById("featured-grid");
  if (!el) return;
  const featured = PRODUCTS.filter((p) => p.tag === "Bestseller" || p.tag === "New").slice(0, 8);
  renderProducts("featured-grid", featured);
}

document.addEventListener("DOMContentLoaded", () => {
  initShopPage();
  initFeaturedProducts();
});
