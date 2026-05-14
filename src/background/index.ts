/**
 * Background script for ScrollToPrompt.
 * Handles cross-tab synchronization and state persistence.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ScrollToPrompt] Extension installed');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'stp-toggle') {
    // Broadcast to all matching tabs
    chrome.tabs.query({
      url: [
        'https://chatgpt.com/*',
        'https://chat.openai.com/*',
        'https://claude.ai/*',
        'https://gemini.google.com/*',
        'https://www.perplexity.ai/*',
        'https://perplexity.ai/*',
        'https://grok.com/*',
        'https://x.com/i/grok*'
      ]
    }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
      });
    });
    sendResponse({ ok: true });
  }
  return true;
});
