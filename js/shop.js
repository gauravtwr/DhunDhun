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

/* A product may have the legacy singular "image" field (old data) or the
   newer "images" array. This always returns an array, oldest-safe. */
function getProductImages(p) {
  if (p.images && p.images.length) return p.images;
  if (p.image) return [p.image];
  return [];
}

function productCardHTML(p) {
  const icon = TYPE_ICON[p.type] || "🎀";
  const bg = TYPE_BG[p.type] || "var(--pink)";
  const outOfStock = isOutOfStock(p);
  const images = getProductImages(p);
  const message = `Hi ${SITE_CONFIG.brandName}! I'd like to order "${p.name}" (₹${p.price}). Is it available?`;
  const tagLabel = outOfStock ? "Out of Stock" : p.tag;
  const tagClass = outOfStock ? "product-tag out-of-stock" : "product-tag";
  const orderControl = outOfStock
    ? `<span class="product-order-btn disabled">Out of Stock</span>`
    : `<a class="product-order-btn" href="${waLink(message)}" target="_blank" rel="noopener"><span>💬</span> Order</a>`;

  const thumbInner = images.length
    ? `<img class="thumb-img" data-action="open-lightbox" data-index="0" src="${escapeHtmlAttr(images[0])}" alt="${escapeHtmlAttr(p.name)}" loading="lazy">`
    : `<span aria-hidden="true">${icon}</span>`;

  const galleryNav =
    images.length > 1
      ? `
      <button type="button" class="thumb-nav thumb-nav-prev" data-action="prev-image" aria-label="Previous photo">‹</button>
      <button type="button" class="thumb-nav thumb-nav-next" data-action="next-image" aria-label="Next photo">›</button>
      <div class="thumb-dots">${images.map((_, i) => `<span class="thumb-dot${i === 0 ? " active" : ""}"></span>`).join("")}</div>`
      : "";

  return `
    <article class="product-card${outOfStock ? " is-out-of-stock" : ""}" data-id="${p.id}" data-type="${p.type}" data-audiences="${p.audiences.join(",")}">
      <div class="product-thumb${images.length ? " has-image clickable" : ""}" style="background:${bg}">
        ${tagLabel ? `<span class="${tagClass}">${tagLabel}</span>` : ""}
        ${thumbInner}
        ${galleryNav}
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
  wireProductGridActions(containerId);
}

/* ---------- Photo gallery, download, share (event delegation so it survives re-renders) ---------- */

const wiredProductGrids = new Set();

function wireProductGridActions(containerId) {
  if (wiredProductGrids.has(containerId)) return;
  const el = document.getElementById(containerId);
  if (!el) return;
  wiredProductGrids.add(containerId);

  el.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const card = btn.closest(".product-card");
    if (!card) return;
    const product = PRODUCTS.find((p) => p.id === card.getAttribute("data-id"));
    if (!product) return;

    const images = getProductImages(product);
    const imgEl = card.querySelector(".thumb-img");
    const action = btn.getAttribute("data-action");
    const currentIndex = imgEl ? parseInt(imgEl.getAttribute("data-index"), 10) || 0 : 0;

    if (action === "prev-image" || action === "next-image") {
      if (!imgEl || images.length < 2) return;
      const nextIndex =
        action === "prev-image" ? (currentIndex - 1 + images.length) % images.length : (currentIndex + 1) % images.length;
      imgEl.setAttribute("data-index", nextIndex);
      imgEl.src = images[nextIndex];
      card.querySelectorAll(".thumb-dot").forEach((dot, i) => dot.classList.toggle("active", i === nextIndex));
    } else if (action === "open-lightbox") {
      openLightbox(product, currentIndex);
    }
  });
}

function downloadProductImage(dataUrl, name) {
  if (!dataUrl) return;
  const mimeMatch = dataUrl.match(/^data:image\/(\w+);/);
  const ext = mimeMatch ? mimeMatch[1] : "jpg";
  const safeName = name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${safeName}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function shareProductImage(product, dataUrl) {
  if (!dataUrl) return;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const ext = blob.type.split("/")[1] || "jpg";
    const file = new File([blob], `${product.name}.${ext}`, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: product.name,
        text: `Check out "${product.name}" from ${SITE_CONFIG.brandName}! ₹${product.price}`
      });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return; // user cancelled the native share sheet
  }
  // Fallback for browsers without file-sharing support: open the image so it can be saved/shared manually
  window.open(dataUrl, "_blank");
  alert("Direct sharing isn't supported on this browser. The photo opened in a new tab — you can save or share it manually from there.");
}

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ---------- Image lightbox: view, download, share photo, share link ---------- */

let lightboxProduct = null;
let lightboxIndex = 0;

function ensureLightbox() {
  if (document.getElementById("image-lightbox")) return;

  const overlay = document.createElement("div");
  overlay.id = "image-lightbox";
  overlay.className = "lightbox-overlay";
  overlay.style.display = "none";
  overlay.innerHTML = `
    <div class="lightbox-content">
      <button type="button" class="lightbox-close" id="lightbox-close" aria-label="Close">✕</button>
      <div class="lightbox-image-wrap">
        <button type="button" class="thumb-nav thumb-nav-prev" id="lightbox-prev" aria-label="Previous photo">‹</button>
        <img id="lightbox-img" src="" alt="">
        <button type="button" class="thumb-nav thumb-nav-next" id="lightbox-next" aria-label="Next photo">›</button>
      </div>
      <div class="thumb-dots" id="lightbox-dots"></div>
      <div class="lightbox-info">
        <h3 id="lightbox-name"></h3>
        <p id="lightbox-price"></p>
      </div>
      <div class="lightbox-actions">
        <button type="button" class="btn btn-secondary" id="lightbox-download">⬇ Download</button>
        <button type="button" class="btn btn-secondary" id="lightbox-share">📤 Share Photo</button>
        <button type="button" class="btn btn-primary" id="lightbox-copy-link">🔗 Share Link</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeLightbox();
  });
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  document.getElementById("lightbox-prev").addEventListener("click", () => stepLightbox(-1));
  document.getElementById("lightbox-next").addEventListener("click", () => stepLightbox(1));
  document.getElementById("lightbox-download").addEventListener("click", () => {
    const images = getProductImages(lightboxProduct);
    downloadProductImage(images[lightboxIndex], lightboxProduct.name);
  });
  document.getElementById("lightbox-share").addEventListener("click", () => {
    const images = getProductImages(lightboxProduct);
    shareProductImage(lightboxProduct, images[lightboxIndex]);
  });
  document.getElementById("lightbox-copy-link").addEventListener("click", (e) => shareProductLink(lightboxProduct, e.currentTarget));

  document.addEventListener("keydown", (e) => {
    if (overlay.style.display === "none") return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });
}

function openLightbox(product, index) {
  const images = getProductImages(product);
  if (!images.length) return;
  ensureLightbox();
  lightboxProduct = product;
  lightboxIndex = index >= 0 && index < images.length ? index : 0;
  renderLightbox();
  document.getElementById("image-lightbox").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const overlay = document.getElementById("image-lightbox");
  if (!overlay) return;
  overlay.style.display = "none";
  document.body.style.overflow = "";
}

function stepLightbox(delta) {
  if (!lightboxProduct) return;
  const images = getProductImages(lightboxProduct);
  if (images.length < 2) return;
  lightboxIndex = (lightboxIndex + delta + images.length) % images.length;
  renderLightbox();
}

function renderLightbox() {
  if (!lightboxProduct) return;
  const images = getProductImages(lightboxProduct);
  const outOfStock = isOutOfStock(lightboxProduct);

  document.getElementById("lightbox-img").src = images[lightboxIndex];
  document.getElementById("lightbox-img").alt = lightboxProduct.name;
  document.getElementById("lightbox-name").textContent = lightboxProduct.name;
  document.getElementById("lightbox-price").innerHTML = outOfStock
    ? `₹${lightboxProduct.price} · <span class="lightbox-oos">Out of Stock</span>`
    : `₹${lightboxProduct.price}`;

  const multi = images.length > 1;
  document.getElementById("lightbox-prev").style.display = multi ? "flex" : "none";
  document.getElementById("lightbox-next").style.display = multi ? "flex" : "none";
  document.getElementById("lightbox-dots").innerHTML = multi
    ? images.map((_, i) => `<span class="thumb-dot${i === lightboxIndex ? " active" : ""}"></span>`).join("")
    : "";
}

function buildProductShareUrl(product) {
  const base = window.location.pathname.replace(/[^/]*$/, "") + "shop.html";
  const shareUrl = new URL(base, window.location.origin);
  shareUrl.searchParams.set("product", product.id);
  return shareUrl.toString();
}

async function shareProductLink(product, triggerBtn) {
  const shareUrl = buildProductShareUrl(product);
  const shareData = {
    title: product.name,
    text: `Check out "${product.name}" from ${SITE_CONFIG.brandName}! ₹${product.price}`,
    url: shareUrl
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return; // user cancelled the native share sheet
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    flashButtonLabel(triggerBtn, "Link Copied!");
  } catch (err) {
    window.prompt("Copy this link:", shareUrl);
  }
}

function flashButtonLabel(btn, message) {
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = message;
  setTimeout(() => (btn.textContent = original), 1500);
}

function openLightboxFromUrl() {
  const productId = getUrlParam("product");
  if (!productId) return;
  const product = PRODUCTS.find((p) => p.id === productId);
  if (product) openLightbox(product, 0);
}

document.addEventListener("DOMContentLoaded", openLightboxFromUrl);

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
