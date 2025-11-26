// countries: Germany (DE) и Iceland (IS)
const COUNTRY_PROFILES = {
  DE: { // Germany
    energyIntensityKWhPerGB: 0.15,
    co2Intensity_gPerKWh: 400
  },
  IS: { // Iceland
    //FIXME: this measurement is a really rough example , TO BE CHANGEDD
    energyIntensityKWhPerGB: 0.15,
    co2Intensity_gPerKWh: 8
  }
};

// default country
let currentCountryCode = 'IS';

function getCurrentProfile() {
  return COUNTRY_PROFILES[currentCountryCode] || COUNTRY_PROFILES.DE;
}

// when start script use prevously chosen country
chrome.storage.sync.get(['countryCode'], (res) => {
  if (res.countryCode && COUNTRY_PROFILES[res.countryCode]) {
    currentCountryCode = res.countryCode;
    console.log('Using country profile:', currentCountryCode);
  } else {
    console.log('Using default country profile: DE');
  }
});

function estimateCO2_g(bytes) {
  const profile = getCurrentProfile();
  const gb = bytesToGB(bytes);
  const energyKWh = gb * profile.energyIntensityKWhPerGB;
  return energyKWh * profile.co2Intensity_gPerKWh;
}
// youtube
const STREAMING_KWH_PER_HOUR = 0.077;

function estimateStreamingCO2_g(seconds) {
  const hours = seconds / 3600;
  const profile = getCurrentProfile();
  const energyKWh = hours * STREAMING_KWH_PER_HOUR;
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
  console.log("[Green Extension:]", entry);
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// for tracking downloads
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

  //TODO: Decide -> total or per activity
    // total per *current country* and day
    const key = getTodayKey(); // daily_<country>_<date>
    const { [key]: current = 0 } = await chrome.storage.local.get(key);
    await chrome.storage.local.set({ [key]: current + log.co2_g });


  //FIXME: Popup is not automatically opening up 
    await chrome.action.openPopup();

  } catch (err) {
    console.error("Error processing download:", err);
  } finally {
    downloadMap.delete(delta.id);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1) for EMAIL_SENT
  if (message.type === 'EMAIL_SENT') {
    //FIXME: this measurement is a really rough example , TO BE CHANGEDD
    const emissionPerEmail = 0.10;

    const key = getTodayKey();

    chrome.storage.local.get([key], (result) => {
      const current = result[key] || 0;
      const updated = current + emissionPerEmail;

      chrome.storage.local.set({ [key]: updated }, () => {
        console.log('CO2 updated for email send:', currentCountryCode, updated);
      });
    });
  }
  //  YouTube
  if (message.type === 'YOUTUBE_WATCH') {
    const seconds = message.seconds || 0;
    if (seconds <= 0) return;

    const addedCO2_g = estimateStreamingCO2_g(seconds);
    const key = getTodayKey();

    chrome.storage.local.get([key], (result) => {
      const current = result[key] || 0;
      const updated = current + addedCO2_g;

      chrome.storage.local.set({ [key]: updated }, () => {
        console.log(
            'CO2 updated for YouTube in',
            currentCountryCode,
            ': +',
            addedCO2_g.toFixed(3),
            'g, total =',
            updated.toFixed(3)
        );
      });
    });
  }

  // 2) choose country
  if (message.type === 'SET_COUNTRY') {
    const code = message.countryCode;

    if (COUNTRY_PROFILES[code]) {
      currentCountryCode = code;
      chrome.storage.sync.set({ countryCode: code }, () => {
        console.log('Country changed to:', code);
        sendResponse({ success: true });
      });
    } else {
      console.warn('Unknown country code:', code);
      sendResponse({ success: false, error: 'Unknown country code' });
    }

    return true;
  }
});


chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ events: [] });
  console.log("Green Extension installed and initialized.");
});

