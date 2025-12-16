const API_KEY = "dRXqUx1JTzl28nnSaBZ7";
const BASE_URL = "https://api.electricitymaps.com/v3"; //  Electricity maps forecast api
// CO2_total = CO2_device(current country) + CO2_network(current country) + CO2_datacenter (Frankfurt/Finland/Ireland)

async function fetchForecastIntensity(zone) {
  try {
    const url = `${BASE_URL}/carbon-intensity/forecast?zone=${zone}`;

    const response = await fetch(url, {
      headers: {
        "auth-token": API_KEY,
      },
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

async function fetchDatacenterIntensity(zone) {
  return await fetchForecastIntensity(zone);
}

const COUNTRY_PROFILES = {
  DE: {
    energyIntensityKWhPerGB: 0.15,
    datacenterZone: "DE",
  },
  CZ: {
    energyIntensityKWhPerGB: 0.15,
    datacenterZone: "DE",
  },
  IS: {
    energyIntensityKWhPerGB: 0.1,
    datacenterZone: "FI",
  },
};

const BASE_CO2_PER_EMAIL_GRAMS = 0.3;

let currentCountryCode = "IS";

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

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}


async function addEmissionByActivity(type, amount) {
  const {
    emissionsByActivity = {},
    emissionsByActivityDate
  } = await chrome.storage.local.get([
    "emissionsByActivity",
    "emissionsByActivityDate"
  ]);

  const today = getTodayDateString();

  // gün değiştiyse reset
  if (emissionsByActivityDate !== today) {
    emissionsByActivity.download = 0;
    emissionsByActivity.youtube = 0;
    emissionsByActivity.spotify = 0;
    emissionsByActivity.gmail = 0;
  }

  emissionsByActivity[type] =
    (emissionsByActivity[type] || 0) + amount;

  await chrome.storage.local.set({
    emissionsByActivity,
    emissionsByActivityDate: today,
  });
}



//forecast for downloading

chrome.storage.sync.get(["countryCode"], async (res) => {
  if (res.countryCode && COUNTRY_PROFILES[res.countryCode]) {
    currentCountryCode = res.countryCode;
    console.log("Using country profile:", currentCountryCode);
  } else {
    console.log("Using default country profile: DE");
    currentCountryCode = "DE";
  }

  const forecast = await fetchForecastIntensity(currentCountryCode);
});

function estimateCO2_g(bytes) {
  const profile = getCurrentProfile();
  const gb = bytesToGB(bytes);
  const energyKWh = gb * profile.energyIntensityKWhPerGB;
  const deviceCO2 = energyKWh * profile.co2Intensity_gPerKWh;

  const networkCO2 = energyKWh * 0.2 * profile.co2Intensity_gPerKWh;

  const datacenterCO2 =
    energyKWh *
    0.2 *
    (profile.datacenterCo2Intensity_gPerKWh || profile.co2Intensity_gPerKWh);

  return deviceCO2 + networkCO2 + datacenterCO2;
}

const STREAMING_KWH_PER_HOUR = 0.077;

function estimateStreamingCO2_g(seconds) {
  const hours = seconds / 3600;
  const profile = getCurrentProfile();
  const energyKWh = hours * STREAMING_KWH_PER_HOUR;

  const deviceCO2 =
    energyKWh * profile.co2Intensity_gPerKWh;

  const networkCO2 =
    energyKWh * 0.2 * profile.co2Intensity_gPerKWh;

  const datacenterCO2 =
    energyKWh *
    0.2 *
    (profile.datacenterCo2Intensity_gPerKWh ||
     profile.co2Intensity_gPerKWh);

  return deviceCO2 + networkCO2 + datacenterCO2;
}


const SPOTIFY_GB_PER_SECOND = 0.000025;

function estimateSpotifyCO2_g(seconds) {
  const profile = getCurrentProfile();
  const gb = SPOTIFY_GB_PER_SECOND * seconds;
  const energyKWh = gb * profile.energyIntensityKWhPerGB;

  const deviceCO2 =
    energyKWh * profile.co2Intensity_gPerKWh;

  const networkCO2 =
    energyKWh * 0.2 * profile.co2Intensity_gPerKWh;

  const datacenterCO2 =
    energyKWh *
    0.2 *
    (profile.datacenterCo2Intensity_gPerKWh ||
     profile.co2Intensity_gPerKWh);

  return deviceCO2 + networkCO2 + datacenterCO2;
}


function bytesToGB(bytes) {
  return bytes / 1024 ** 3;
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

    await chrome.storage.local.set({
      lastActivity: {
        type: "download",
        timestamp: Date.now(),
      },
    });

    const url =
      downloadMap.get(delta.id)?.url || item.finalUrl || item.url || "";
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
      co2_g: Number(co2_g.toFixed(3)),
    };

    await logEvent(log);

    await addEmissionByActivity("download", log.co2_g);

    const key = getTodayKey();
    const { [key]: current = 0 } = await chrome.storage.local.get(key);
    await chrome.storage.local.set({ [key]: current + log.co2_g });

    await chrome.action.openPopup();
  } catch (err) {
  } finally {
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
  if (message.type === "YOUTUBE_WATCH") {
    chrome.storage.local.set({
      lastActivity: {
        type: "youtube",
        timestamp: Date.now(),
      },
    });

    const seconds = message.seconds || 0;
    if (seconds <= 0) return;

    const added = estimateStreamingCO2_g(seconds);
    addEmissionByActivity("youtube", added);
    const key = getTodayKey();

    chrome.storage.local.get([key], (result) => {
      const updated = (result[key] || 0) + added;
      chrome.storage.local.set({ [key]: updated });
    });
  }

  // Spotify
  if (message.type === "SPOTIFY_PLAY") {
    chrome.storage.local.set({
      lastActivity: {
        type: "spotify",
        timestamp: Date.now(),
      },
    });

    const seconds = message.seconds || 0;
    if (seconds <= 0) return;

    const added = estimateSpotifyCO2_g(seconds);
    addEmissionByActivity("spotify", added);

    const key = getTodayKey();

    chrome.storage.local.get([key], (result) => {
      const updated = (result[key] || 0) + added;
      chrome.storage.local.set({ [key]: updated });
    });
  }

  if (message.type === "SET_COUNTRY") {
    const code = message.countryCode;

    if (COUNTRY_PROFILES[code]) {
      currentCountryCode = code;
      chrome.storage.sync.set({ countryCode: code });

      // device + datacenter + network
      fetchForecastIntensity(code).then(async (intensity) => {
        if (intensity !== null) {
          COUNTRY_PROFILES[code].co2Intensity_gPerKWh = intensity;
          console.log("Grid intensity updated for", code, ":", intensity);
        }


        const dcZone = COUNTRY_PROFILES[code].datacenterZone;

        if (dcZone) {
          const dcIntensity = await fetchForecastIntensity(dcZone);

          if (dcIntensity !== null) {
            COUNTRY_PROFILES[code].datacenterCo2Intensity_gPerKWh = dcIntensity;
            console.log(
              "Datacenter intensity updated for",
              dcZone,
              ":",
              dcIntensity
            );
          }
        }
      });

      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Unknown country code" });
    }

    return true;
  }
});

//email
async function handleEmailSent() {
  await chrome.storage.local.set({
    lastActivity: {
      type: "gmail",
      timestamp: Date.now(),
    },
  });

  const key = getTodayKey();

  const result = await chrome.storage.local.get({
    totalCo2Grams: 0,
    [key]: 0,
  });

  const newTotal = result.totalCo2Grams + BASE_CO2_PER_EMAIL_GRAMS;
  const newDaily = result[key] + BASE_CO2_PER_EMAIL_GRAMS;

  await chrome.storage.local.set({
    totalCo2Grams: newTotal,
    [key]: newDaily,
  });

  await logEvent({
    timestamp: new Date().toISOString(),
    activity: "EMAIL",
    domain: "mail.google.com",
    co2_g: BASE_CO2_PER_EMAIL_GRAMS,
  });

  await addEmissionByActivity("gmail", BASE_CO2_PER_EMAIL_GRAMS);


  return {
    totalCo2Grams: newTotal,
    dailyCo2Grams: newDaily,
  };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ events: [] });
  console.log("Green Extension installed and initialized.");
});
