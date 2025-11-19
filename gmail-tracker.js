// gmail-tracker.js
// Gmail mail-sent toast'ını yakalar: “Message sent” / “Gönderildi” vb.

const targetNode = document.body;

// Gmail sürekli DOM değiştiriyor, mutation observer en garantisi
const observer = new MutationObserver(() => {
  const toast = document.querySelector('div[role="alert"]');

  if (toast) {
    const text = toast.innerText.toLowerCase();

    // Tüm dillerde çalışacak şekilde birkaç common kelime kontrol ediyorum
    if (
      text.includes("sent") ||        // English
      text.includes("gönderildi") ||  // Turkish
      text.includes("enviado") ||     // Spanish/Portuguese
      text.includes("inviato") ||     // Italian
      text.includes("gesendet")       // German
    ) {
      chrome.runtime.sendMessage({ type: "EMAIL_SENT" });
    }
  }
});

observer.observe(targetNode, { childList: true, subtree: true });
