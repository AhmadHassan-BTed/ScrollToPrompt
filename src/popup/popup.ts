document.addEventListener('DOMContentLoaded', async () => {
  const els = {
    enabled: document.getElementById('enabled') as HTMLInputElement,
    markerColor: document.getElementById('markerColor') as HTMLInputElement,
    colorHex: document.getElementById('colorHex') as HTMLElement,
    markerOpacity: document.getElementById('markerOpacity') as HTMLInputElement,
    opacityVal: document.getElementById('opacityVal') as HTMLElement,
    scrollbarWidth: document.getElementById('scrollbarWidth') as HTMLInputElement,
    widthVal: document.getElementById('widthVal') as HTMLElement,
    side: document.getElementById('side') as HTMLSelectElement,
    autoHide: document.getElementById('autoHide') as HTMLInputElement,
    animations: document.getElementById('animations') as HTMLInputElement,
    themeSync: document.getElementById('themeSync') as HTMLInputElement,

    dot: document.getElementById('dot') as HTMLElement,
    statusLbl: document.getElementById('statusLbl') as HTMLElement,
    platformLbl: document.getElementById('platformLbl') as HTMLElement,
    platformName: document.getElementById('platformName') as HTMLElement,
    promptCount: document.getElementById('promptCount') as HTMLElement,
    chips: document.querySelectorAll('.chip') as NodeListOf<HTMLElement>
  };

  const defaults = {
    enabled: true,
    markerColor: '#a78bfa',
    markerOpacity: 0.45,
    scrollbarWidth: 8,
    side: 'right',
    autoHide: true,
    animations: true,
    themeSync: true
  };

  let currentSettings = { ...defaults };

  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const data = await chrome.storage.sync.get(defaults);
      currentSettings = { ...defaults, ...data };
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  function updateUI() {
    els.enabled.checked = currentSettings.enabled;
    els.markerColor.value = currentSettings.markerColor;
    els.colorHex.textContent = currentSettings.markerColor.toLowerCase();
    els.markerOpacity.value = currentSettings.markerOpacity.toString();
    els.opacityVal.textContent = Math.round(currentSettings.markerOpacity * 100) + '%';
    els.scrollbarWidth.value = currentSettings.scrollbarWidth.toString();
    els.widthVal.textContent = currentSettings.scrollbarWidth + 'px';
    els.side.value = currentSettings.side;
    els.autoHide.checked = currentSettings.autoHide;
    els.animations.checked = currentSettings.animations;
    els.themeSync.checked = currentSettings.themeSync;

    els.dot.className = currentSettings.enabled ? 'dot' : 'dot off';
    els.statusLbl.textContent = currentSettings.enabled ? 'Active' : 'Disabled';
  }
  updateUI();

  const save = (key: string, val: any) => {
    (currentSettings as any)[key] = val;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ [key]: val });
    }
    updateUI();
  };

  els.enabled.addEventListener('change', (e) => save('enabled', (e.target as HTMLInputElement).checked));
  els.markerColor.addEventListener('input', (e) => save('markerColor', (e.target as HTMLInputElement).value));
  els.markerOpacity.addEventListener('input', (e) => save('markerOpacity', parseFloat((e.target as HTMLInputElement).value)));
  els.scrollbarWidth.addEventListener('input', (e) => save('scrollbarWidth', parseInt((e.target as HTMLInputElement).value, 10)));
  els.side.addEventListener('change', (e) => save('side', (e.target as HTMLSelectElement).value));
  els.autoHide.addEventListener('change', (e) => save('autoHide', (e.target as HTMLInputElement).checked));
  els.animations.addEventListener('change', (e) => save('animations', (e.target as HTMLInputElement).checked));
  els.themeSync.addEventListener('change', (e) => save('themeSync', (e.target as HTMLInputElement).checked));

  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      const url = tabs[0].url || '';

      let platform: string | null = null;
      if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) platform = 'chatgpt';
      else if (url.includes('claude.ai')) platform = 'claude';
      else if (url.includes('gemini.google.com')) platform = 'gemini';
      else if (url.includes('perplexity.ai')) platform = 'perplexity';
      else if (url.includes('grok.com') || (url.includes('x.com') && url.includes('/grok'))) platform = 'grok';

      if (platform) {
        els.platformLbl.textContent = platform.charAt(0).toUpperCase() + platform.slice(1) + ' detected';
        els.platformName.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
      } else {
        els.platformLbl.textContent = 'Not on a supported site';
        els.platformName.textContent = '—';
      }

      els.chips.forEach((chip: HTMLElement) => {
        if (chip.dataset.p === platform) chip.classList.add('on');
        else chip.classList.remove('on');
      });

      if (platform && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'stp-get-info' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            els.promptCount.textContent = '—';
            return;
          }
          els.promptCount.textContent = response.prompts?.toString() || '0';
        });
      }
    });
  }
});
