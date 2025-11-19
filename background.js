const CONFIG = {
 // for Germany
  energyIntensityKWhPerGB: 0.15,
  co2Intensity_gPerKWh: 400
};

function bytesToGB(bytes) {
  return bytes / (1024 ** 3);
}

function estimateCO2_g(bytes) {
  const gb = bytesToGB(bytes);
  return gb * CONFIG.energyIntensityKWhPerGB * CONFIG.co2Intensity_gPerKWh;
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
    const today = new Date().toISOString().slice(0, 10);
    const key = `daily_${today}`;
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
  if (message.type === 'EMAIL_SENT') {

    //FIXME: this measurement is a really rough example , TO BE CHANGEDD
    const emissionPerEmail = 0.10; 

    const today = new Date().toISOString().slice(0, 10); 
    const key = `daily_${today}`;

    chrome.storage.local.get([key], (result) => {
      const current = result[key] || 0;
      const updated = current + emissionPerEmail;

      chrome.storage.local.set({ [key]: updated }, () => {
        console.log('CO2 updated for email send:', updated);
      });
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ events: [] });
  console.log("Green Extension installed and initialized.");
});

