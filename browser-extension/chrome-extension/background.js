const SUPABASE_RPC_URL =
  "https://kpcrugqbsegjvjcbsdyn.supabase.co/rest/v1/rpc/get_extension_store_feed";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwY3J1Z3Fic2VnanZqY2JzZHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzMTc5MDIsImV4cCI6MjExMDg5MzkwMn0.5rADDI1qN4QAq4CTWeD2cRV75sRVupRlmssHzsOG4Hw";

const ALARM_NAME = "refresh_birthday_store_feed";

async function refreshStoreFeed() {
  try {
    const res = await fetch(SUPABASE_RPC_URL, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!res.ok) return null;
    const stores = await res.json();
    if (Array.isArray(stores)) {
      await chrome.storage.local.set({
        bg_store_feed: { fetchedAt: Date.now(), stores },
      });
      return stores;
    }
  } catch (err) {
    console.warn("[BirthdayCoupon] Feed refresh failed:", err);
  }
  return null;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 30 });
  void refreshStoreFeed();
});

chrome.runtime.onStartup.addListener(() => {
  void refreshStoreFeed();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    void refreshStoreFeed();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "REFRESH_FEED") {
    refreshStoreFeed().then((stores) => sendResponse({ ok: Boolean(stores), stores }));
    return true;
  }
  if (msg && msg.type === "SET_BADGE" && sender.tab && sender.tab.id) {
    const count = Number(msg.count || 0);
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: count > 0 ? String(count) : "🎁",
    });
    chrome.action.setBadgeBackgroundColor({
      tabId: sender.tab.id,
      color: count > 0 ? "#4b2e83" : "#f6d469",
    });
  }
  return false;
});
