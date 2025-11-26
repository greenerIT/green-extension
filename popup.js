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
  chrome.storage.sync.get(['countryCode'], (res) => {
    const code = res.countryCode || 'IS'; //default
    countrySelect.value = code;
    loadTodayCO2(code);
  });

  // 2
  countrySelect.addEventListener('change', () => {
    const code = countrySelect.value;
    chrome.storage.sync.set({ countryCode: code });

    chrome.runtime.sendMessage(
        { type: 'SET_COUNTRY', countryCode: code },
        () => {}
    );

    loadTodayCO2(code);
  });
});
