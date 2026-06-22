/**
 * NexLoad Cookie Exporter — content.js
 * Injected into NexLoad pages — auto-uploads cookies when requested by popup
 */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "UPLOAD_COOKIES" && msg.cookies) {
    // Auto-fill the cookies upload in Settings
    uploadCookies(msg.cookies);
    sendResponse({ ok: true });
  }
});

async function uploadCookies(cookieContent) {
  try {
    // Click Settings button if not open
    const settingsBtn = document.querySelector('[title="Settings"], button:has(svg.lucide-settings)');
    if (settingsBtn) settingsBtn.click();

    // Wait for settings modal
    await new Promise((r) => setTimeout(r, 500));

    // Try to find and call the API directly
    const res = await fetch("/api/cookies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cookies: cookieContent }),
    });
    const data = await res.json();

    if (res.ok) {
      showNotification("Cookies uploaded! YouTube downloads enabled.", "success");
    } else {
      showNotification("Upload failed: " + data.error, "error");
    }
  } catch (err) {
    showNotification("Upload failed: " + err.message, "error");
  }
}

function showNotification(message, type) {
  const el = document.createElement("div");
  el.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 99999;
    padding: 12px 20px; font-size: 12px; font-weight: 600;
    letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: opacity 0.3s;
    ${type === "success"
      ? "background: #22c55e; color: white;"
      : "background: #ef4444; color: white;"
    }
  `;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
