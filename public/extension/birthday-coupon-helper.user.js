// ==UserScript==
// @name         מתנת יום הולדת — תזכורת הטבות אוטומטית
// @namespace    https://birthday-coupon.github.io/Birthday-Coupon/
// @version      1.0.0
// @description  מזהה אוטומטית חנויות עם הטבת יום הולדת באתר מתנת יום הולדת ומקפיץ התראה עדינה עם קישור ישיר להטבה (פרטיות מלאה — התאמת דומיין מקומית בלבד).
// @author       Birthday Coupon IL
// @match        *://*/*
// @exclude      *://birthday-coupon.github.io/*
// @exclude      *://localhost:*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      kpcrugqbsegjvjcbsdyn.supabase.co
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const SITE_BASE = "https://birthday-coupon.github.io/Birthday-Coupon";
  const SUPABASE_RPC_URL = "https://kpcrugqbsegjvjcbsdyn.supabase.co/rest/v1/rpc/get_extension_store_feed";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwY3J1Z3Fic2VnanZqY2JzZHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzMTc5MDIsImV4cCI6MjExMDg5MzkwMn0.5rADDI1qN4QAq4CTWeD2cRV75sRVupRlmssHzsOG4Hw";

  const CACHE_KEY = "bg_store_feed_cache_v1";
  const DISMISSED_KEY = "bg_dismissed_map_v1";
  const MUTED_KEY = "bg_muted_domains_v1";
  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  if (window.top !== window.self) return; // Skip iframes

  const currentHost = window.location.hostname.toLowerCase().replace(/^www\./, "");

  function matchesDomain(hostname, storeDomains) {
    if (!Array.isArray(storeDomains)) return false;
    return storeDomains.some((d) => {
      const clean = String(d || "").toLowerCase().replace(/^www\./, "");
      if (!clean) return false;
      return hostname === clean || hostname.endsWith("." + clean);
    });
  }

  function isMuted(host) {
    const muted = GM_getValue(MUTED_KEY, []);
    return Array.isArray(muted) && muted.includes(host);
  }

  function isDismissedRecently(slug) {
    const map = GM_getValue(DISMISSED_KEY, {});
    const until = map && map[slug];
    return typeof until === "number" && Date.now() < until;
  }

  function dismissFor24Hours(slug) {
    const map = GM_getValue(DISMISSED_KEY, {});
    map[slug] = Date.now() + DISMISS_TTL_MS;
    GM_setValue(DISMISSED_KEY, map);
  }

  function muteHostForever(host) {
    const muted = GM_getValue(MUTED_KEY, []);
    if (!muted.includes(host)) {
      muted.push(host);
      GM_setValue(MUTED_KEY, muted);
    }
  }

  function fetchFeed(callback) {
    const cached = GM_getValue(CACHE_KEY, null);
    if (cached && cached.fetchedAt && Date.now() - cached.fetchedAt < CACHE_TTL_MS && Array.isArray(cached.stores)) {
      callback(cached.stores);
      return;
    }

    GM_xmlhttpRequest({
      method: "POST",
      url: SUPABASE_RPC_URL,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      data: "{}",
      onload: function (res) {
        try {
          if (res.status >= 200 && res.status < 300) {
            const stores = JSON.parse(res.responseText);
            if (Array.isArray(stores)) {
              GM_setValue(CACHE_KEY, { fetchedAt: Date.now(), stores });
              callback(stores);
              return;
            }
          }
        } catch (e) {
          // Fallback to stale cache if available
        }
        if (cached && Array.isArray(cached.stores)) {
          callback(cached.stores);
        }
      },
      onerror: function () {
        if (cached && Array.isArray(cached.stores)) {
          callback(cached.stores);
        }
      },
    });
  }

  function renderToast(store) {
    if (document.getElementById("bg-birthday-coupon-host")) return;

    const hostEl = document.createElement("div");
    hostEl.id = "bg-birthday-coupon-host";
    hostEl.style.cssText = "position:fixed;bottom:20px;left:20px;z-index:2147483647;";
    document.body.appendChild(hostEl);

    const shadow = hostEl.attachShadow({ mode: "open" });
    const hasActive = Number(store.active_benefits_count) > 0;
    const storeUrl = `${SITE_BASE}/stores/${encodeURIComponent(store.slug)}/?utm_source=tampermonkey`;

    const headline = hasActive
      ? `🎉 יש כרגע ${store.active_benefits_count} הטבות יום הולדת פעילות ב-${store.name_he}!`
      : `🎂 ל-${store.name_he} יש הטבת יום הולדת באתר מתנת יום הולדת`;

    const ctaText = hasActive ? "לצפייה וקבלת ההטבה ←" : "להצטרפות להמתנה / פרסום הטבה ←";

    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif; }
        .card {
          direction: rtl;
          width: 328px;
          background: linear-gradient(145deg, #ffffff 0%, #f6f0ff 100%);
          border: 1.5px solid #dfd2fb;
          border-radius: 22px;
          padding: 16px;
          color: #241938;
          box-shadow: 0 20px 44px -14px rgba(75, 46, 131, 0.34), 0 4px 12px rgba(0, 0, 0, 0.08);
          animation: bgSlideUp 0.28s ease-out;
        }
        @keyframes bgSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          color: #4b2e83;
          background: #efe7fe;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .close {
          border: none;
          background: transparent;
          color: #6b5a8e;
          font-size: 16px;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 999px;
          line-height: 1;
        }
        .close:hover { background: #efe7fe; color: #241938; }
        .title {
          margin: 10px 0 6px;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.4;
          color: #241938;
        }
        .badge {
          display: inline-block;
          background: #fef3c7;
          color: #4a3204;
          font-size: 12px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .cta {
          display: block;
          width: 100%;
          text-align: center;
          text-decoration: none;
          background: linear-gradient(180deg, #5d3ca3 0%, #4b2e83 100%);
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 14px;
          border-radius: 999px;
          box-shadow: 0 8px 18px -6px rgba(75, 46, 131, 0.5);
        }
        .cta:hover { filter: brightness(1.08); }
        .footer {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          color: #6b5a8e;
        }
        .mute {
          border: none;
          background: none;
          color: #6b5a8e;
          font-size: 10px;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
        }
        .mute:hover { color: #241938; }
      </style>
      <div class="card" role="dialog" aria-label="הטבת יום הולדת זמינה">
        <div class="top">
          <span class="brand">🎁 מתנת יום הולדת</span>
          <button type="button" class="close" id="bg-close" title="הסתר ל-24 שעות" aria-label="סגור">✕</button>
        </div>
        <p class="title">${headline}</p>
        <span class="badge">✨ ${store.discount_value}</span>
        <a class="cta" href="${storeUrl}" target="_blank" rel="noopener noreferrer">${ctaText}</a>
        <div class="footer">
          <span>לוח קהילתי • אין קשר רשמי לחנות</span>
          <button type="button" class="mute" id="bg-mute">אל תציג כאן שוב</button>
        </div>
      </div>
    `;

    shadow.getElementById("bg-close").addEventListener("click", () => {
      dismissFor24Hours(store.slug);
      hostEl.remove();
    });

    shadow.getElementById("bg-mute").addEventListener("click", () => {
      muteHostForever(currentHost);
      hostEl.remove();
    });
  }

  if (isMuted(currentHost)) return;

  fetchFeed((stores) => {
    const matched = stores.find((s) => matchesDomain(currentHost, s.domains));
    if (!matched) return;
    if (isDismissedRecently(matched.slug)) return;
    renderToast(matched);
  });
})();
