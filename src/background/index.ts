/**
 * Background script for ScrollToPrompt.
 * Handles cross-tab synchronization and state persistence.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ScrollToPrompt] Extension installed');
});
