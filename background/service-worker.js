/**
 * ScrollToPrompt — Background Service Worker
 * Handles extension lifecycle and messaging.
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[ScrollToPrompt] Installed:', details.reason);

  // Set default state
  chrome.storage.local.set({ enabled: true });
});

// Relay toggle messages from popup to content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'stp-toggle') {
    // Broadcast to all matching tabs
    chrome.tabs.query({
      url: [
        'https://chatgpt.com/*',
        'https://chat.openai.com/*',
        'https://claude.ai/*',
        'https://gemini.google.com/*'
      ]
    }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
      });
    });
    sendResponse({ ok: true });
  }
  return true;
});
