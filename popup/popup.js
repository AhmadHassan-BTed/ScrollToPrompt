/**
 * ScrollToPrompt — Popup Script
 * Controls extension state and displays platform info.
 */

document.addEventListener('DOMContentLoaded', () => {
  const toggle     = document.getElementById('enableToggle');
  const statusDot  = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const platformText = document.getElementById('platformText');
  const promptCount  = document.getElementById('promptCount');
  const markerCount  = document.getElementById('markerCount');
  const chips        = document.querySelectorAll('.chip');

  // Load saved state
  chrome.storage.local.get(['enabled'], (data) => {
    const enabled = data.enabled !== false; // default true
    toggle.checked = enabled;
    updateUI(enabled);
  });

  // Toggle handler
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({ enabled });
    updateUI(enabled);

    // Send toggle to background → content scripts
    chrome.runtime.sendMessage({ type: 'stp-toggle', enabled });
  });

  function updateUI(enabled) {
    statusDot.classList.toggle('off', !enabled);
    statusText.textContent = enabled ? 'Active' : 'Disabled';
  }

  // Detect current tab's platform
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const url = tabs[0].url || '';

    let platform = null;
    if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
      platform = 'chatgpt';
      platformText.textContent = 'ChatGPT detected';
    } else if (url.includes('claude.ai')) {
      platform = 'claude';
      platformText.textContent = 'Claude detected';
    } else if (url.includes('gemini.google.com')) {
      platform = 'gemini';
      platformText.textContent = 'Gemini detected';
    } else {
      platformText.textContent = 'Not on a supported site';
      promptCount.textContent = '—';
      markerCount.textContent = '—';
    }

    // Highlight active chip
    chips.forEach(chip => {
      if (chip.dataset.platform === platform) {
        chip.classList.add('active');
      }
    });

    // Try to get prompt count from the page
    if (platform && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'stp-get-info' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // Content script may not be ready yet
          promptCount.textContent = '—';
          markerCount.textContent = '—';
          return;
        }
        promptCount.textContent = response.prompts || '0';
        markerCount.textContent = response.markers || '0';
      });
    }
  });
});
