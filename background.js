
const API_KEY = "dRXqUx1JTzl28nnSaBZ7";
const BASE_URL = "https://api.electricitymaps.com/v3"; //  Electricity maps forecast api


async function fetchForecastIntensity(zone) {
  try {
    const url = `${BASE_URL}/carbon-intensity/forecast?zone=${zone}`;

    const response = await fetch(url, {
      headers: {
        "auth-token": API_KEY
      }
    });

    if (!response.ok) {
      console.warn("Forecast API error:", await response.text());
      return null;
    }

    const data = await response.json();
    return data?.forecast?.[0]?.carbonIntensity || null;

  } catch (err) {
    console.error("Forecast fetch error:", err);
    return null;
  }
}


const COUNTRY_PROFILES = {
  DE: { 
    energyIntensityKWhPerGB: 0.15,
  },
  IS: { 
    energyIntensityKWhPerGB: 0.10,
  },
  CZ: { 
    energyIntensityKWhPerGB: 0.15,
  }
};


const BASE_CO2_PER_EMAIL_GRAMS = 0.3;

let currentCountryCode = 'IS';

function getCurrentProfile() {
  return COUNTRY_PROFILES[currentCountryCode] || COUNTRY_PROFILES.DE;
}



chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_INTENSITY") {
    fetchForecastIntensity(msg.countryCode).then((intensity) => {
      sendResponse(intensity);
    });
    return true; 
  }
});


//forecast for downloading

chrome.storage.sync.get(['countryCode'], async (res) => {
  if (res.countryCode && COUNTRY_PROFILES[res.countryCode]) {
    currentCountryCode = res.countryCode;
    console.log('Using country profile:', currentCountryCode);
  } else {
    console.log('Using default country profile: DE');
    currentCountryCode = "DE";
  }

  const forecast = await fetchForecastIntensity(currentCountryCode);
  
});



function estimateCO2_g(bytes) {
  const profile = getCurrentProfile();
  const gb = bytesToGB(bytes);
  const energyKWh = gb * profile.energyIntensityKWhPerGB;
  return energyKWh * profile.co2Intensity_gPerKWh;
}

const STREAMING_KWH_PER_HOUR = 0.077;

function estimateStreamingCO2_g(seconds) {
  const hours = seconds / 3600;
  const profile = getCurrentProfile();
  const energyKWh = hours * STREAMING_KWH_PER_HOUR;
  return energyKWh * profile.co2Intensity_gPerKWh;
}

const SPOTIFY_GB_PER_SECOND = 0.000025;

function estimateSpotifyCO2_g(seconds) {
  const profile = getCurrentProfile();
  const gb = SPOTIFY_GB_PER_SECOND * seconds;
  const energyKWh = gb * profile.energyIntensityKWhPerGB;
  return energyKWh * profile.co2Intensity_gPerKWh;
}

function bytesToGB(bytes) {
  return bytes / (1024 ** 3);
}

function getTodayKey() {
  const today = new Date().toISOString().slice(0, 10);
  return `daily_${currentCountryCode}_${today}`;
}


async function logEvent(entry) {
  const { events = [] } = await chrome.storage.local.get("events");
  events.push(entry);
  await chrome.storage.local.set({ events });
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}


const downloadMap = new Map();

chrome.downloads.onCreated.addListener((item) => {
  if (!item || !item.id) return;
  downloadMap.set(item.id, { url: item.finalUrl || item.url || "" });
});

chrome.downloads.onChanged.addListener(async (delta) => {
  if (!delta.state || delta.state.current !== "complete") return;

  try {
    const [item] = await chrome.downloads.search({ id: delta.id });
    if (!item) return;

    const url = downloadMap.get(delta.id)?.url || item.finalUrl || item.url || "";
    const domain = getDomain(url);

    if (!domain.includes("google")) return;

    const totalBytes = item.totalBytes || item.bytesReceived || 0;
    if (totalBytes <= 0) return;

    const co2_g = estimateCO2_g(totalBytes);

    const log = {
      timestamp: new Date().toISOString(),
      activity: "DOWNLOAD",
      domain,
      filename: item.filename,
      bytes: totalBytes,
      co2_g: Number(co2_g.toFixed(3))
    };

    await logEvent(log);

    const key = getTodayKey();
    const { [key]: current = 0 } = await chrome.storage.local.get(key);
    await chrome.storage.local.set({ [key]: current + log.co2_g });

    await chrome.action.openPopup();

  } catch (err) {} 
  finally {
    downloadMap.delete(delta.id);
  }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  if (message.type === "EMAIL_SENT") {
    handleEmailSent()
      .then((updatedData) => sendResponse({ success: true, data: updatedData }))
      .catch((err) => sendResponse({ success: false, error: err.toString() }));
    return true;
  }

  // YouTube
  if (message.type === 'YOUTUBE_WATCH') {
    const seconds = message.seconds || 0;
    if (seconds <= 0) return;

    const added = estimateStreamingCO2_g(seconds);
    const key = getTodayKey();

    chrome.storage.local.get([key], (result) => {
      const updated = (result[key] || 0) + added;
      chrome.storage.local.set({ [key]: updated });
    });
  }

  // Spotify
  if (message.type === "SPOTIFY_PLAY") {
    const seconds = message.seconds || 0;
    if (seconds <= 0) return;

    const added = estimateSpotifyCO2_g(seconds);
    const key = getTodayKey();

    chrome.storage.local.get([key], (result) => {
      const updated = (result[key] || 0) + added;
      chrome.storage.local.set({ [key]: updated });
    });
  }


  if (message.type === 'SET_COUNTRY') {
    const code = message.countryCode;

    if (COUNTRY_PROFILES[code]) {
      currentCountryCode = code;
      chrome.storage.sync.set({ countryCode: code });

      fetchForecastIntensity(code).then((intensity) => {
        if (intensity !== null) {
          COUNTRY_PROFILES[code].co2Intensity_gPerKWh = intensity;
          console.log("Forecast updated for", code, ":", intensity);
        }
      });

      sendResponse({ success: true });

    } else {
      sendResponse({ success: false, error: 'Unknown country code' });
    }

    return true;
  }
});

//email
async function handleEmailSent() {
  const key = getTodayKey();

  const result = await chrome.storage.local.get({
    totalCo2Grams: 0,
    [key]: 0
  });

  const newTotal = result.totalCo2Grams + BASE_CO2_PER_EMAIL_GRAMS;
  const newDaily = result[key] + BASE_CO2_PER_EMAIL_GRAMS;

  await chrome.storage.local.set({
    totalCo2Grams: newTotal,
    [key]: newDaily
  });

  await logEvent({
    timestamp: new Date().toISOString(),
    activity: "EMAIL",
    domain: "mail.google.com",
    co2_g: BASE_CO2_PER_EMAIL_GRAMS
  });

  return {
    totalCo2Grams: newTotal,
    dailyCo2Grams: newDaily
  };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ events: [] });
  console.log("Green Extension installed and initialized.");
});
