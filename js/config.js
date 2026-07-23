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
  whatsappNumber: "91XXXXXXXXXX",

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

  // Password to open admin.html (the product dashboard). This is a casual
  // deterrent only, NOT real security — anyone who can view this file's
  // source can read it. Change it to something only you know, and don't
  // reuse a password you use elsewhere.
  adminPassword: "dhundhun123"
};

function waLink(message) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encoded}`;
}
