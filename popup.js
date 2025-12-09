async function loadTodayCO2(countryCode) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `daily_${countryCode}_${today}`;
  const data = await chrome.storage.local.get(key);
  const total = data[key] || 0;
  document.getElementById("co2Value").textContent = total.toFixed(2);
}

document.addEventListener("DOMContentLoaded", () => {
  const countrySelect = document.getElementById('countrySelect');

  // chosen country
chrome.storage.sync.get(['countryCode'], async (res) => {
  const code = res.countryCode || 'IS';
  countrySelect.value = code;

  loadTodayCO2(code);


  const intensity = await chrome.runtime.sendMessage({ type: "GET_INTENSITY", countryCode: code });
  updateCarbonStatus(intensity);
});

  // 2
  countrySelect.addEventListener('change', async () => {
  const code = countrySelect.value;
  chrome.storage.sync.set({ countryCode: code });

  chrome.runtime.sendMessage(
      { type: 'SET_COUNTRY', countryCode: code },
      () => {}
  );

  loadTodayCO2(code);

  const intensity = await chrome.runtime.sendMessage({ type: "GET_INTENSITY", countryCode: code });
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
  } 
  else if (intensity < 350) {
    badge.textContent = `Moderate`;
    badge.className = "carbon-badge medium";
  }
  else {
    badge.textContent = `High Carbon`;
    badge.className = "carbon-badge high";
  }
}
