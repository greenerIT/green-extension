const GREEN_SUGGESTIONS = {
  download: [
    "Batch your downloads instead of downloading files one by one",
    "Delete unnecessary files after downloading to reduce storage footprint",
    "Avoid re-downloading files you already have stored locally",
    "Compress files before downloading when possible",
    "Prefer Wi-Fi over mobile data for large downloads",
  ],

  youtube: [
    "Lower video quality to 720p to reduce energy usage",
    "Avoid auto-play and stop videos when not actively watching",
    "Prefer shorter videos when possible",
    "Download videos instead of streaming repeatedly",
    "Close background tabs playing videos",
  ],

  spotify: [
    "Download playlists instead of streaming repeatedly",
    "Disable auto-play to avoid unnecessary streaming",
    "Prefer audio-only content over video podcasts",
    "Use offline mode when listening to saved music",
    "Close the app when not actively listening",
  ],

  gmail: [
    "Avoid large attachments, share cloud links instead",
    "Unsubscribe from unnecessary newsletters",
    "Delete spam and old emails regularly",
    "Reduce CC usage when sending emails",
    "Avoid sending multiple follow-up emails in short time",
  ],
};

async function loadTodayCO2(countryCode) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `daily_${countryCode}_${today}`;
  const data = await chrome.storage.local.get(key);
  const total = data[key] || 0;
  document.getElementById("co2Value").textContent = total.toFixed(2);
}

document.addEventListener("DOMContentLoaded", () => {
  const countrySelect = document.getElementById("countrySelect");

  // chosen country
  chrome.storage.sync.get(["countryCode"], async (res) => {
    const code = res.countryCode || "IS";
    countrySelect.value = code;

    loadTodayCO2(code);

    const intensity = await chrome.runtime.sendMessage({
      type: "GET_INTENSITY",
      countryCode: code,
    });
    updateCarbonStatus(intensity);
  });

  // 2
  countrySelect.addEventListener("change", async () => {
    const code = countrySelect.value;
    chrome.storage.sync.set({ countryCode: code });

    chrome.runtime.sendMessage(
      { type: "SET_COUNTRY", countryCode: code },
      () => {}
    );

    loadTodayCO2(code);

    const intensity = await chrome.runtime.sendMessage({
      type: "GET_INTENSITY",
      countryCode: code,
    });
    updateCarbonStatus(intensity);
  });
});

function updateCarbonStatus(intensity) {
  const badge = document.getElementById("carbonStatus");

  if (intensity === null) {
    badge.textContent = "No Data";
    badge.className = "carbon-badge";
    return;
  }

  // (${intensity} g/kWh)
  if (intensity < 150) {
    badge.textContent = `Low Carbon`;
    badge.className = "carbon-badge low";
  } else if (intensity < 350) {
    badge.textContent = `Moderate`;
    badge.className = "carbon-badge medium";
  } else {
    badge.textContent = `High Carbon`;
    badge.className = "carbon-badge high";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["lastActivity"], (res) => {
    if (!res.lastActivity) return;

    const activityType = res.lastActivity.type?.toLowerCase();
    const suggestions = GREEN_SUGGESTIONS[activityType];
    if (!suggestions || suggestions.length === 0) return;

    const randomIndex = Math.floor(Math.random() * suggestions.length);
    const randomSuggestion = suggestions[randomIndex];

    const tipEl = document.getElementById("greenTip");
    if (!tipEl) return;

    tipEl.textContent = randomSuggestion;
    tipEl.classList.add("show");
  });
});
