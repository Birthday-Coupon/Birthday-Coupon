const SITE_BASE = "https://birthday-coupon.github.io/Birthday-Coupon";
const listEl = document.getElementById("storeList");
const searchEl = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");

let allStores = [];

function render(query = "") {
  const q = query.trim().toLowerCase();
  const filtered = allStores.filter((s) => {
    if (!q) return true;
    return `${s.name_he} ${s.slug} ${s.discount_value}`.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;font-size:12px;color:#6b5a8e;padding:16px;">לא נמצאו חנויות</div>';
    return;
  }

  listEl.innerHTML = filtered
    .map((s) => {
      const count = Number(s.active_benefits_count || 0);
      const pillClass = count > 0 ? "pill pill-active" : "pill pill-empty";
      const pillText = count > 0 ? `${count} פעילות` : "המתנה";
      const url = `${SITE_BASE}/stores/${encodeURIComponent(s.slug)}/?utm_source=chrome_popup`;
      return `
        <a class="item" href="${url}" target="_blank" rel="noopener noreferrer">
          <div>
            <div class="name">${s.name_he}</div>
            <div class="disc">${s.discount_value}</div>
          </div>
          <span class="${pillClass}">${pillText}</span>
        </a>
      `;
    })
    .join("");
}

async function load(forceRefresh = false) {
  if (forceRefresh) {
    listEl.textContent = "מרענן נתונים...";
    const resp = await chrome.runtime.sendMessage({ type: "REFRESH_FEED" }).catch(() => null);
    if (resp && Array.isArray(resp.stores)) {
      allStores = resp.stores;
      render(searchEl.value);
      return;
    }
  }
  const data = await chrome.storage.local.get(["bg_store_feed"]);
  if (data.bg_store_feed && Array.isArray(data.bg_store_feed.stores)) {
    allStores = data.bg_store_feed.stores;
    render(searchEl.value);
  } else {
    await load(true);
  }
}

searchEl.addEventListener("input", () => render(searchEl.value));
refreshBtn.addEventListener("click", () => void load(true));

void load(false);
