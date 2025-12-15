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
    "Avoid large attachments, compress them or share cloud links instead",
    "Unsubscribe from unnecessary newsletters",
    "Delete spam and old emails regularly",
    "Reduce CC usage when sending emails",
    "Avoid sending multiple follow-up emails in short time",
  ],
};

const CO2_EQUIVALENCE_MAP = [
  {
    threshold: 30,
    texts: [
      "30 g CO₂ ≈ driving a car for about 200 meters",
      "30 g CO₂ ≈ warming up a car engine on a cold morning",
    ],
  },
  {
    threshold: 25,
    text: "25 g CO₂ ≈ washing a small load of clothes",
  },
  {
    threshold: 20,
    text: "20 g CO₂ ≈ taking a hot shower for a few minutes",
  },
  {
    threshold: 15,
    text: "15 g CO₂ ≈ using an electric oven for 10 minutes",
  },
  {
    threshold: 12,
    text: "12 g CO₂ ≈ using a hair dryer for 5 minutes",
  },
  {
    threshold: 10,
    text: "10 g CO₂ ≈ making two slices of toast",
  },
  {
    threshold: 7,
    text: "7 g CO₂ ≈ using an elevator instead of stairs",
  },
  {
    threshold: 5,
    text: "5 g CO₂ ≈ keeping the fridge door open for 1 minute",
  },
  {
    threshold: 3,
    text: "3 g CO₂ ≈ 1 minute of LED lighting",
  },
  {
    threshold: 1,
    texts: [
      "1 g CO₂ ≈ washing hands with warm water for 30 seconds",
      "1 g CO₂ ≈ using a microwave for 30 seconds",
    ],
  },
];

async function loadTodayCO2(countryCode) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `daily_${countryCode}_${today}`;
  const data = await chrome.storage.local.get(key);
  const total = data[key] || 0;
  document.getElementById("co2Value").textContent = total.toFixed(2);
  renderCO2Equivalence(total);
}

document.addEventListener("DOMContentLoaded", () => {
  const countrySelect = document.getElementById("countrySelect");

  chrome.storage.sync.get(["countryCode"], async (res) => {
    const code = res.countryCode || "DE";
    countrySelect.value = code;

    loadTodayCO2(code);

    const intensity = await chrome.runtime.sendMessage({
      type: "GET_INTENSITY",
      countryCode: code,
    });
    updateCarbonStatus(intensity);
  });

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
    badge.textContent = `Moderate Carbon`;
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

function renderCO2Equivalence(totalGrams) {
  const el = document.getElementById("co2EquivalenceText");
  if (!el) return;

  const match = CO2_EQUIVALENCE_MAP.find(
    (item) => totalGrams >= item.threshold
  );

  if (!match) {
    el.textContent = "";
    return;
  }

  if (match.text) {
    el.textContent = match.text;
    return;
  }

  if (Array.isArray(match.texts) && match.texts.length > 0) {
    if (match.texts.length === 1) {
      el.textContent = match.texts[0];
    } else {
      const randomIndex = Math.floor(Math.random() * match.texts.length);
      el.textContent = match.texts[randomIndex];
    }
    return;
  }

  el.textContent = "";
}
