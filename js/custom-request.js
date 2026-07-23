/* Custom Gift Request: local image preview + prefilled WhatsApp / email hand-off.
   No backend/file storage — the photo never leaves the browser automatically,
   so the customer attaches it manually in the chat/email that opens. */

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("cr-image");
  const uploadBox = document.getElementById("cr-upload-box");
  const previewWrap = document.getElementById("image-preview-wrap");
  const previewImg = document.getElementById("image-preview");
  const previewName = document.getElementById("preview-filename");

  if (!fileInput) return;

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewName.textContent = file.name;
      previewWrap.classList.add("show");
    };
    reader.readAsDataURL(file);
  });

  function buildSummary() {
    const name = document.getElementById("cr-name").value.trim() || "Not provided";
    const contact = document.getElementById("cr-contact").value.trim() || "Not provided";
    const description = document.getElementById("cr-description").value.trim() || "No description added";
    const hasImage = fileInput.files.length > 0;
    return { name, contact, description, hasImage };
  }

  const waBtn = document.getElementById("cr-send-whatsapp");
  const emailBtn = document.getElementById("cr-send-email");

  waBtn.addEventListener("click", () => {
    const { name, contact, description, hasImage } = buildSummary();
    let message = `Hi ${SITE_CONFIG.brandName}! I'm looking for a custom gift.\nName: ${name}\nContact: ${contact}\nWhat I'm looking for: ${description}`;
    message += hasImage ? "\n\n(I'm attaching a reference photo in this chat.)" : "";
    window.open(waLink(message), "_blank");
    if (hasImage) {
      alert("WhatsApp is opening in a new tab. Please attach your reference photo in the chat before sending!");
    }
  });

  emailBtn.addEventListener("click", () => {
    const { name, contact, description, hasImage } = buildSummary();
    const subject = encodeURIComponent(`Custom Gift Request from ${name}`);
    let body = `Name: ${name}\nContact: ${contact}\nWhat I'm looking for: ${description}`;
    body += hasImage ? "\n\n(Reference photo attached separately.)" : "";
    window.location.href = `mailto:${SITE_CONFIG.email}?subject=${subject}&body=${encodeURIComponent(body)}`;
    if (hasImage) {
      alert("Your email app is opening. Please attach your reference photo before sending!");
    }
  });
});
