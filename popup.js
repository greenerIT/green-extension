async function loadTodayCO2() {
  const today = new Date().toISOString().slice(0, 10);
  const key = `daily_${today}`;
  const data = await chrome.storage.local.get(key);
  const total = data[key] || 0;
  document.getElementById("co2Value").textContent = total.toFixed(2);
}

document.addEventListener("DOMContentLoaded", loadTodayCO2);

