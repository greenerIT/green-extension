// contentScript.js

// To avoid attaching multiple listeners to the same button
const observedButtons = new WeakSet();

/**
 * Try to find Gmail "Send" buttons in the current DOM and attach click listeners.
 * This is somewhat heuristic because Gmail's internal classes can change.
 */
function attachSendButtonListeners() {
  // Common Gmail send button selector:
  // role="button" and data-tooltip containing "Send" (and some localized versions).
  const possibleSelectors = [
    'div[role="button"][data-tooltip*="Send"]',   // English
    'div[role="button"][data-tooltip*="Gönder"]', // Turkish
    'div[role="button"][data-tooltip*="Senden"]'  // German
  ];

  const buttons = document.querySelectorAll(possibleSelectors.join(","));

  buttons.forEach((btn) => {
    if (!observedButtons.has(btn)) {
      observedButtons.add(btn);

      btn.addEventListener("click", () => {
        // We assume that if the user clicks "Send" here, an email is actually sent.
        chrome.runtime.sendMessage({ type: "EMAIL_SENT" }, (response) => {
          // Optional: you can log or show small info in console
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

/**
 * Because Gmail is a single-page app and dynamically updates the DOM,
 * we use a MutationObserver to keep looking for send buttons.
 */
function observeDomForSendButtons() {
  const observer = new MutationObserver(() => {
    attachSendButtonListeners();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial attempt when script first runs
  attachSendButtonListeners();
}

// Start observation once DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", observeDomForSendButtons);
} else {
  observeDomForSendButtons();
}
