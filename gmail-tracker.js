const observedButtons = new WeakSet();

function attachSendButtonListeners() {

  const possibleSelectors = [
    'div[role="button"][data-tooltip*="Send"]',   
    'div[role="button"][data-tooltip*="Gönder"]', 
    'div[role="button"][data-tooltip*="Senden"]'  
  ];

  const buttons = document.querySelectorAll(possibleSelectors.join(","));

  buttons.forEach((btn) => {
    if (!observedButtons.has(btn)) {
      observedButtons.add(btn);

      btn.addEventListener("click", () => {

        chrome.runtime.sendMessage({ type: "EMAIL_SENT" }, (response) => {

          if (response && response.success) {
            console.log("Email CO2 updated:", response.data);
          } else {
            console.warn("Failed to update email CO2 stats", response?.error);
          }
        });
      });
    }
  });
}


function observeDomForSendButtons() {
  const observer = new MutationObserver(() => {
    attachSendButtonListeners();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });


  attachSendButtonListeners();
}


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", observeDomForSendButtons);
} else {
  observeDomForSendButtons();
}
