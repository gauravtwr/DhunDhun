/* Shared behaviour across all pages: mobile nav, WhatsApp float button, footer socials/year. */

document.addEventListener("DOMContentLoaded", () => {
  // Mobile nav toggle
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
      toggle.textContent = links.classList.contains("open") ? "✕" : "☰";
    });
    links.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.textContent = "☰";
      });
    });
  }

  // Floating WhatsApp button
  const waFloat = document.getElementById("wa-float-btn");
  if (waFloat) {
    waFloat.href = waLink(`Hi ${SITE_CONFIG.brandName}! I'd like to know more about your gifts.`);
  }

  // Any element with data-wa-message becomes a WhatsApp link
  document.querySelectorAll("[data-wa-message]").forEach((el) => {
    el.href = waLink(el.getAttribute("data-wa-message"));
  });

  // Social links driven by config: elements marked data-social="instagram|facebook|pinterest|youtube"
  document.querySelectorAll("[data-social]").forEach((el) => {
    const key = el.getAttribute("data-social");
    const url = SITE_CONFIG.social[key];
    if (url) {
      el.href = url;
      el.target = "_blank";
      el.rel = "noopener";
    } else {
      el.style.display = "none";
    }
  });

  // Mailto links driven by config
  document.querySelectorAll("[data-mailto-subject]").forEach((el) => {
    const subject = encodeURIComponent(el.getAttribute("data-mailto-subject"));
    const body = encodeURIComponent(el.getAttribute("data-mailto-body") || "");
    el.href = `mailto:${SITE_CONFIG.email}?subject=${subject}&body=${body}`;
  });

  document.querySelectorAll("[data-email-text]").forEach((el) => {
    el.textContent = SITE_CONFIG.email;
  });

  document.querySelectorAll("[data-brand-name]").forEach((el) => {
    el.textContent = SITE_CONFIG.brandName;
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
