/**
 * NexLoad Cookie Exporter — popup.js v2.0
 * Shows which website cookies are captured, YouTube priority, domain breakdown
 */

const SERVER_URL = "https://nexload-ifas.onrender.com";

// All domains we scan
const ALL_DOMAINS = {
  youtube: {
    label: "YouTube",
    domains: ["youtube.com", ".youtube.com", "www.youtube.com"],
    icon: "▶",
    priority: true,
  },
  google: {
    label: "Google",
    domains: ["accounts.google.com", ".google.com", "google.com"],
    icon: "G",
    priority: false,
  },
  googlevideo: {
    label: "Google Video",
    domains: [".googlevideo.com"],
    icon: "V",
    priority: false,
  },
  ytimg: {
    label: "YouTube Images",
    domains: [".ytimg.com"],
    icon: "I",
    priority: false,
  },
};

// State
let allCookies = [];
let youtubeOnly = true;
let showDetails = false;

// ─── UI Helpers ───
function showToast(msg, isError) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast" + (isError ? " error" : "");
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

function $(id) { return document.getElementById(id); }

// ─── Cookie Scanning ───
async function scanAllCookies() {
  const result = new Map(); // domainKey -> [cookies]

  for (const [key, group] of Object.entries(ALL_DOMAINS)) {
    result.set(key, []);
    for (const domain of group.domains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain });
        for (const c of cookies) {
          const mapKey = `${c.domain}|${c.name}|${c.path}`;
          const existing = result.get(key);
          if (!existing.find(x => `${x.domain}|${x.name}|${x.path}` === mapKey)) {
            existing.push(c);
          }
        }
      } catch (e) {
        console.warn(`[NexLoad] Failed cookies for ${domain}:`, e);
      }
    }
  }

  return result;
}

function getFilteredCookies(domainMap) {
  if (!youtubeOnly) {
    // All cookies flattened
    const all = [];
    for (const cookies of domainMap.values()) all.push(...cookies);
    return all;
  }
  // YouTube only
  return domainMap.get("youtube") || [];
}

// ─── Render ───
function renderStatus(domainMap) {
  const ytCookies = domainMap.get("youtube") || [];
  const dot = $("statusDot");
  const text = $("statusText");

  if (ytCookies.length > 0) {
    dot.className = "status-dot active";
    text.innerHTML = `<strong>${ytCookies.length} YouTube cookie${ytCookies.length > 1 ? "s" : ""}</strong> — ready to export`;
  } else {
    // Check if ANY cookies exist
    let total = 0;
    for (const cookies of domainMap.values()) total += cookies.length;
    if (total > 0) {
      dot.className = "status-dot warning";
      text.innerHTML = `<strong>No YouTube cookies</strong> — ${total} other cookie${total > 1 ? "s" : ""} found`;
    } else {
      dot.className = "status-dot inactive";
      text.innerHTML = "<strong>No cookies found</strong> — log into YouTube first";
    }
  }
}

function renderDomainGrid(domainMap) {
  const grid = $("domainGrid");
  grid.innerHTML = "";

  let hasAny = false;
  for (const [key, group] of Object.entries(ALL_DOMAINS)) {
    const cookies = domainMap.get(key) || [];
    if (cookies.length === 0) continue;
    hasAny = true;

    const badge = document.createElement("div");
    badge.className = `domain-badge ${group.priority ? "youtube" : "other"}`;
    badge.innerHTML = `
      <span>${group.icon}</span>
      <span>${group.label}</span>
      <span class="domain-count">${cookies.length}</span>
    `;
    grid.appendChild(badge);
  }

  if (!hasAny) {
    grid.innerHTML = '<div class="domain-badge none">No cookies detected</div>';
  }
}

function renderCookieDetails(domainMap) {
  const section = $("cookieDetailsSection");
  const list = $("cookieList");

  if (!showDetails) {
    section.style.display = "none";
    return;
  }
  section.style.display = "";

  list.innerHTML = "";
  const cookies = getFilteredCookies(domainMap);

  if (cookies.length === 0) {
    list.innerHTML = '<div class="cookie-item" style="color:#999; justify-content:center;">No cookies to display</div>';
    return;
  }

  // Sort: youtube domains first, then by name
  const sorted = [...cookies].sort((a, b) => {
    const aYt = a.domain.includes("youtube") ? 0 : 1;
    const bYt = b.domain.includes("youtube") ? 0 : 1;
    if (aYt !== bYt) return aYt - bYt;
    return a.name.localeCompare(b.name);
  });

  for (const c of sorted) {
    const item = document.createElement("div");
    item.className = "cookie-item";

    // Expiry status
    let expClass = "session";
    let expText = "session";
    if (c.expirationDate) {
      const now = Date.now() / 1000;
      if (c.expirationDate < now) {
        expClass = "expired";
        expText = "expired";
      } else {
        const days = Math.ceil((c.expirationDate - now) / 86400);
        expClass = "active";
        expText = `${days}d`;
      }
    }

    // Domain label
    let domainLabel = c.domain;
    for (const [, group] of Object.entries(ALL_DOMAINS)) {
      if (group.domains.includes(c.domain)) {
        domainLabel = group.label;
        break;
      }
    }

    const isYouTube = c.domain.includes("youtube");

    item.innerHTML = `
      <span class="cookie-name" title="${c.name}">${isYouTube ? "▶ " : ""}${c.name}</span>
      <span class="cookie-domain">${domainLabel}</span>
      <span class="cookie-exp ${expClass}">${expText}</span>
    `;
    list.appendChild(item);
  }
}

function renderAll(domainMap) {
  renderStatus(domainMap);
  renderDomainGrid(domainMap);
  renderCookieDetails(domainMap);
}

// ─── Netscape Format ───
function cookieToNetscape(c) {
  const domain = c.domain.startsWith(".") ? c.domain : "." + c.domain;
  const flag = domain.startsWith(".") ? "TRUE" : "FALSE";
  const secure = c.secure ? "TRUE" : "FALSE";
  const expires = c.expirationDate ? Math.floor(c.expirationDate) : 0;
  return `${domain}\t${flag}\t${c.path}\t${secure}\t${expires}\t${c.name}\t${c.value}`;
}

function buildCookieFile(cookies) {
  const deduped = new Map();
  for (const c of cookies) {
    const key = `${c.domain}|${c.name}|${c.path}`;
    deduped.set(key, c);
  }
  const lines = [
    "# Netscape HTTP Cookie File",
    "# Generated by NexLoad Cookie Exporter v2.0",
    "# https://github.com/abir2afridi/NexLoad",
    "",
  ];
  for (const c of deduped.values()) {
    lines.push(cookieToNetscape(c));
  }
  return lines.join("\n");
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Init ───
(async () => {
  try {
    const domainMap = await scanAllCookies();
    allCookies = [];
    for (const cookies of domainMap.values()) allCookies.push(...cookies);

    renderAll(domainMap);

    // YouTube-only toggle
    const ytToggle = $("youtubeOnlyToggle");
    ytToggle.addEventListener("click", () => {
      youtubeOnly = !youtubeOnly;
      ytToggle.className = "toggle" + (youtubeOnly ? " on" : "");
      renderAll(domainMap);
    });

    // Show details toggle
    const detailToggle = $("showDetailsToggle");
    detailToggle.addEventListener("click", () => {
      showDetails = !showDetails;
      detailToggle.className = "toggle" + (showDetails ? " on" : "");
      renderAll(domainMap);
    });

    // Export YouTube only
    $("exportYoutubeBtn").addEventListener("click", () => {
      const ytCookies = domainMap.get("youtube") || [];
      if (ytCookies.length === 0) {
        showToast("No YouTube cookies — log into YouTube first", true);
        return;
      }
      const file = buildCookieFile(ytCookies);
      downloadFile(file, "youtube-cookies.txt");
      showToast(`youtube-cookies.txt downloaded (${ytCookies.length} cookies)`);
    });

    // Export All
    $("exportAllBtn").addEventListener("click", () => {
      if (allCookies.length === 0) {
        showToast("No cookies found", true);
        return;
      }
      const file = buildCookieFile(allCookies);
      downloadFile(file, "all-cookies.txt");
      showToast(`all-cookies.txt downloaded (${allCookies.length} cookies)`);
    });

    // Upload YouTube to NexLoad
    $("uploadBtn").addEventListener("click", async () => {
      const ytCookies = domainMap.get("youtube") || [];
      if (ytCookies.length === 0) {
        showToast("No YouTube cookies — log into YouTube first", true);
        return;
      }

      const btn = $("uploadBtn");
      btn.disabled = true;
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="20"/></svg> Uploading...`;

      const file = buildCookieFile(ytCookies);

      try {
        const res = await fetch(`${SERVER_URL}/api/cookies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookies: file }),
        });
        const data = await res.json();

        if (res.ok) {
          showToast(`Uploaded ${ytCookies.length} YouTube cookies!`);
        } else {
          showToast("Failed: " + (data.error || "Unknown error"), true);
        }
      } catch (e) {
        showToast("Server unreachable — try again later", true);
        console.error("Upload failed:", e);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload YouTube to NexLoad`;
      }
    });

  } catch (err) {
    $("statusText").innerHTML = `<strong>Error</strong> — ${err.message}`;
    $("statusDot").className = "status-dot inactive";
    console.error("[NexLoad] Extension error:", err);
  }
})();
