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
    ? `<img class="thumb-img" data-index="0" src="${escapeHtmlAttr(images[0])}" alt="${escapeHtmlAttr(p.name)}" loading="lazy">`
    : `<span aria-hidden="true">${icon}</span>`;

  const galleryNav =
    images.length > 1
      ? `
      <button type="button" class="thumb-nav thumb-nav-prev" data-action="prev-image" aria-label="Previous photo">‹</button>
      <button type="button" class="thumb-nav thumb-nav-next" data-action="next-image" aria-label="Next photo">›</button>
      <div class="thumb-dots">${images.map((_, i) => `<span class="thumb-dot${i === 0 ? " active" : ""}"></span>`).join("")}</div>`
      : "";

  const photoActions = images.length
    ? `
      <div class="photo-actions">
        <button type="button" class="photo-action-btn" data-action="download-image" title="Download photo">⬇</button>
        <button type="button" class="photo-action-btn" data-action="share-image" title="Share photo">📤</button>
      </div>`
    : "";

  return `
    <article class="product-card${outOfStock ? " is-out-of-stock" : ""}" data-id="${p.id}" data-type="${p.type}" data-audiences="${p.audiences.join(",")}">
      <div class="product-thumb${images.length ? " has-image" : ""}" style="background:${bg}">
        ${tagLabel ? `<span class="${tagClass}">${tagLabel}</span>` : ""}
        ${photoActions}
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
    } else if (action === "download-image") {
      downloadProductImage(images[currentIndex], product.name);
    } else if (action === "share-image") {
      shareProductImage(product, images[currentIndex]);
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

  const catalogBtn = document.getElementById("catalog-pdf-btn");
  if (catalogBtn) {
    catalogBtn.addEventListener("click", () => generateCatalogPDF(catalogBtn));
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

/* ---------- Downloadable PDF catalog ---------- */

function getActiveFilterLabel() {
  const parts = [];
  if (shopFilterState.audience !== "all") parts.push(AUDIENCE_LABELS[shopFilterState.audience] || shopFilterState.audience);
  if (shopFilterState.type !== "all") parts.push(shopFilterState.type);
  return parts.length ? parts.join(" · ") : "All Products";
}

function dataUrlImageFormat(dataUrl) {
  const match = dataUrl.match(/^data:image\/(\w+);/);
  const ext = match ? match[1].toLowerCase() : "jpeg";
  if (ext === "png") return "PNG";
  if (ext === "webp") return "WEBP";
  return "JPEG";
}

function instagramHandleLabel() {
  const url = SITE_CONFIG.social.instagram || "";
  const match = url.match(/instagram\.com\/([^/?]+)/i);
  return match ? `@${match[1]}` : url;
}

async function generateCatalogPDF(triggerBtn) {
  const list = getShopFilteredList();
  if (!list.length) {
    alert("No products match the current filter, so there's nothing to put in the catalog.");
    return;
  }

  const originalLabel = triggerBtn ? triggerBtn.textContent : null;
  if (triggerBtn) {
    triggerBtn.textContent = "Generating…";
    triggerBtn.disabled = true;
    // Let the browser paint the "Generating…" state before the (synchronous,
    // potentially slow for large catalogs) PDF layout loop blocks the thread.
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 14;
    const filterLabel = getActiveFilterLabel();

    const CORAL = [255, 111, 145];
    const LAVENDER = [198, 169, 247];
    const INK = [58, 46, 57];
    const INK_SOFT = [111, 96, 112];
    const MUTED = [138, 127, 136];

    function drawHeader(isFirstPage) {
      const bandHeight = isFirstPage ? 32 : 20;
      doc.setFillColor(...CORAL);
      doc.rect(0, 0, pageWidth, bandHeight, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(isFirstPage ? 22 : 14);
      doc.text(SITE_CONFIG.brandName, margin, isFirstPage ? 16 : 13);
      if (isFirstPage) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(SITE_CONFIG.tagline, margin, 24);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(isFirstPage ? 11 : 9);
      doc.text("Product Catalog", pageWidth - margin, isFirstPage ? 14 : 11, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(filterLabel, pageWidth - margin, isFirstPage ? 20 : 16, { align: "right" });
      return bandHeight;
    }

    function drawFooter(pageNum) {
      doc.setDrawColor(...LAVENDER);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      doc.setFontSize(8);
      doc.setTextColor(...INK_SOFT);
      doc.setFont("helvetica", "normal");
      const contact = `WhatsApp +${SITE_CONFIG.whatsappNumber}   ·   Instagram ${instagramHandleLabel()}`;
      doc.text(contact, margin, pageHeight - 8);
      doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }

    function drawPlaceholder(x, y, w, h, p) {
      doc.setFillColor(255, 214, 232);
      doc.roundedRect(x, y, w, h, 3, 3, "F");
      doc.setTextColor(...INK_SOFT);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const label = doc.splitTextToSize(p.type || "DhunDhun", w - 6);
      doc.text(label, x + w / 2, y + h / 2, { align: "center" });
    }

    const cols = 3;
    const gutter = 6;
    const cellWidth = (pageWidth - margin * 2 - gutter * (cols - 1)) / cols;
    const imageHeight = cellWidth;
    const textBlockHeight = 20;
    const rowHeight = imageHeight + textBlockHeight;

    let page = 1;
    let y = drawHeader(true) + 8;
    let col = 0;

    for (let i = 0; i < list.length; i++) {
      if (y + rowHeight > pageHeight - 18) {
        drawFooter(page);
        doc.addPage();
        page += 1;
        y = drawHeader(false) + 8;
        col = 0;
      }

      const p = list[i];
      const x = margin + col * (cellWidth + gutter);
      const images = getProductImages(p);
      const outOfStock = isOutOfStock(p);

      if (images.length) {
        try {
          doc.addImage(images[0], dataUrlImageFormat(images[0]), x, y, cellWidth, imageHeight);
        } catch (err) {
          drawPlaceholder(x, y, cellWidth, imageHeight, p);
        }
      } else {
        drawPlaceholder(x, y, cellWidth, imageHeight, p);
      }

      if (outOfStock) {
        doc.setFillColor(...MUTED);
        doc.rect(x, y + imageHeight - 6, cellWidth, 6, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.text("OUT OF STOCK", x + cellWidth / 2, y + imageHeight - 2, { align: "center" });
      }

      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      const nameLines = doc.splitTextToSize(p.name, cellWidth).slice(0, 2);
      doc.text(nameLines, x, y + imageHeight + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...CORAL);
      doc.text(`Rs. ${p.price}`, x, y + imageHeight + 5 + nameLines.length * 4 + 3);

      col += 1;
      if (col >= cols) {
        col = 0;
        y += rowHeight;
      }
    }

    drawFooter(page);

    const safeLabel = filterLabel.replace(/[^a-z0-9]+/gi, "-");
    doc.save(`DhunDhun-Catalog-${safeLabel}.pdf`);
  } finally {
    if (triggerBtn) {
      triggerBtn.textContent = originalLabel;
      triggerBtn.disabled = false;
    }
  }
}
