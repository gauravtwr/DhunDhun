/*
  DhunDhun site configuration.
  ------------------------------------------------------------
  EDIT THIS FILE FIRST. Everything here is a placeholder until you
  swap in your real details. Every page reads from this file, so you
  only need to update it in one place.
*/

const SITE_CONFIG = {
  brandName: "DhunDhun",
  tagline: "Cute gifts for every heart, Korean & Japanese style",

  // Replace with your real WhatsApp business number, country code first, no + or spaces.
  // Example: "919812345678" for an Indian number 98123 45678
  whatsappNumber: "919718158864",

  // Social links — replace with your real handles. Leave "" to hide a link.
  social: {
    instagram: "https://www.instagram.com/gt_gifts/",
    facebook: "",
    pinterest: "",
    youtube: ""
  },

  email: "hello@dhundhun.example",

  // Shown on the Contact and Corporate Gifting pages.
  location: "India",

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
  // Default password right now is: DhunDhun@2026 — change it immediately
  // using the "Change Password" panel inside admin.html, since this
  // default is visible to anyone reading this file.
  adminPasswordHash: "6af04e41b16102f1b41678c23dba1785db4c56c817801833043cd41c147c3728"
};

async function sha256Hex(text) {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function waLink(message) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encoded}`;
}
