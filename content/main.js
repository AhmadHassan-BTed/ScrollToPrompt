/**
 * ScrollToPrompt — Content Script
 * Detects user prompts in AI chat interfaces and renders
 * navigable markers on a custom scrollbar overlay.
 */

(() => {
  'use strict';

  /* ─────────── Constants ─────────── */
  const DEBOUNCE_MS   = 200;
  const POLL_MS       = 1500;   // fallback polling interval
  const MARKER_WIDTH  = 12;
  const TRACK_WIDTH   = 18;
  const TAG           = '[ScrollToPrompt]';

  /* ─────────── Platform Adapters ─────────── */

  /**
   * Each adapter returns:
   *   platform        — display name
   *   getPrompts()    — NodeList/Array of user-message elements
   *   getScrollContainer() — the scrollable ancestor
   *   getPromptText(el)    — extract preview text from a prompt element
   */

  const adapters = {

    /* ── ChatGPT ── */
    chatgpt: {
      platform: 'ChatGPT',
      match: () => location.hostname.includes('chatgpt.com') || location.hostname.includes('chat.openai.com'),

      getPrompts() {
        // Primary: data-message-author-role attribute
        let els = document.querySelectorAll('[data-message-author-role="user"]');
        if (els.length) return Array.from(els);

        // Fallback: the "human" turn containers
        els = document.querySelectorAll('div[data-testid^="conversation-turn-"] .whitespace-pre-wrap');
        if (els.length) {
          // filter to every other (user turns)
          return Array.from(els).filter((_, i) => i % 2 === 0);
        }

        // Fallback: look for the user message class patterns
        els = document.querySelectorAll('.text-base [data-message-author-role="user"], .agent-turn');
        return Array.from(els);
      },

      getScrollContainer() {
        // ChatGPT uses a <main> with an inner scrollable div
        const candidates = [
          'main .overflow-y-auto',
          'main [class*="react-scroll-to-bottom"]',
          'main .flex-1.overflow-hidden .overflow-y-auto',
          '[role="presentation"]',
          'main',
        ];
        for (const sel of candidates) {
          const el = document.querySelector(sel);
          if (el && el.scrollHeight > el.clientHeight) return el;
        }
        return document.documentElement;
      },

      getPromptText(el) {
        const inner = el.querySelector('.whitespace-pre-wrap') || el;
        return inner.textContent?.trim() || '';
      }
    },

    /* ── Claude ── */
    claude: {
      platform: 'Claude',
      match: () => location.hostname.includes('claude.ai'),

      getPrompts() {
        // Primary: data-testid human turn  
        let els = document.querySelectorAll('[data-testid="user-message"]');
        if (els.length) return Array.from(els);

        // Fallback: class-based human messages
        els = document.querySelectorAll('.font-user-message, .font-user');
        if (els.length) return Array.from(els);

        // Fallback: role-based approach
        els = document.querySelectorAll('[data-is-streaming] .human-turn, div[class*="human"]');
        if (els.length) return Array.from(els);

        // Broad fallback: content blocks with "Human" role
        els = document.querySelectorAll('.contents .prose');
        // Keep only even indices (human turns alternate with assistant)
        return Array.from(els).filter((_, i) => i % 2 === 0);
      },

      getScrollContainer() {
        const candidates = [
          '.flex-1.overflow-y-auto',
          '[class*="thread-content"]',
          'main .overflow-y-auto',
          '.overflow-y-auto',
          'main',
        ];
        for (const sel of candidates) {
          const el = document.querySelector(sel);
          if (el && el.scrollHeight > el.clientHeight) return el;
        }
        return document.documentElement;
      },

      getPromptText(el) {
        return el.textContent?.trim() || '';
      }
    },

    /* ── Gemini ── */
    gemini: {
      platform: 'Gemini',
      match: () => location.hostname.includes('gemini.google.com'),

      getPrompts() {
        // Primary: query chips / user message containers
        let els = document.querySelectorAll('user-query, .user-query, [data-message-author="user"]');
        if (els.length) return Array.from(els);

        // Fallback: query text blocks
        els = document.querySelectorAll('.query-text, .user-query-content, .query-content');
        if (els.length) return Array.from(els);

        // Fallback: conversation turn approach
        els = document.querySelectorAll('message-content[data-is-user="true"], .conversation-container .query');
        if (els.length) return Array.from(els);

        // Broad: all rich-text user turns
        els = document.querySelectorAll('.chat-history .query-text, .prompt-container');
        return Array.from(els);
      },

      getScrollContainer() {
        const candidates = [
          '.chat-history',
          'main .overflow-y-auto',
          '.conversation-container',
          'infinite-scroller',
          'main',
        ];
        for (const sel of candidates) {
          const el = document.querySelector(sel);
          if (el && el.scrollHeight > el.clientHeight) return el;
        }
        return document.documentElement;
      },

      getPromptText(el) {
        const inner = el.querySelector('.query-text') || el;
        return inner.textContent?.trim() || '';
      }
    },
  };


  /* ─────────── Detect Platform ─────────── */
  function detectAdapter() {
    for (const key of Object.keys(adapters)) {
      if (adapters[key].match()) return adapters[key];
    }
    return null;
  }


  /* ─────────── Marker UI (Shadow DOM) ─────────── */

  class MarkerTrack {
    constructor() {
      this.host = document.createElement('div');
      this.host.id = 'stp-root';
      this.shadow = this.host.attachShadow({ mode: 'closed' });

      // Inject styles
      const style = document.createElement('style');
      style.textContent = this._css();
      this.shadow.appendChild(style);

      // Track element
      this.track = document.createElement('div');
      this.track.className = 'stp-track';
      this.shadow.appendChild(this.track);

      // Tooltip
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'stp-tooltip';
      this.shadow.appendChild(this.tooltip);

      // Viewport indicator (shows current visible region)
      this.viewport = document.createElement('div');
      this.viewport.className = 'stp-viewport';
      this.track.appendChild(this.viewport);

      // Active marker index
      this.activeIdx = -1;

      document.body.appendChild(this.host);
    }

    _css() {
      return `
        /* ── Host ── */
        :host {
          position: fixed;
          top: 0;
          right: 0;
          width: ${TRACK_WIDTH}px;
          height: 100vh;
          z-index: 2147483647;
          pointer-events: none;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        /* ── Track ── */
        .stp-track {
          position: relative;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            180deg,
            rgba(120, 120, 140, 0.04) 0%,
            rgba(120, 120, 140, 0.07) 50%,
            rgba(120, 120, 140, 0.04) 100%
          );
          border-left: 1px solid rgba(120, 120, 140, 0.1);
          transition: background 0.25s ease, width 0.2s ease;
          pointer-events: auto;
          cursor: default;
        }
        .stp-track:hover {
          background: linear-gradient(
            180deg,
            rgba(120, 120, 140, 0.08) 0%,
            rgba(120, 120, 140, 0.14) 50%,
            rgba(120, 120, 140, 0.08) 100%
          );
        }

        /* ── Viewport Indicator ── */
        .stp-viewport {
          position: absolute;
          right: 0;
          width: 100%;
          background: rgba(100, 160, 255, 0.06);
          border-left: 2px solid rgba(100, 160, 255, 0.15);
          transition: top 0.15s ease, height 0.15s ease;
          pointer-events: none;
        }

        /* ── Markers ── */
        .stp-marker {
          position: absolute;
          right: 2px;
          width: ${MARKER_WIDTH}px;
          height: 5px;
          border-radius: 3px;
          cursor: pointer;
          pointer-events: auto;
          transition: transform 0.18s cubic-bezier(.4,0,.2,1),
                      background 0.18s ease,
                      box-shadow 0.18s ease,
                      width 0.18s ease;
          z-index: 2;
        }
        .stp-marker:hover {
          transform: scaleX(1.5) scaleY(1.3);
          z-index: 3;
        }
        .stp-marker.stp-active {
          transform: scaleX(1.8) scaleY(1.5);
          z-index: 4;
        }

        /* ── Color Themes ── */
        /* Light mode */
        .stp-marker {
          background: linear-gradient(135deg, #6C8CFF 0%, #A78BFA 100%);
          box-shadow: 0 0 4px rgba(108, 140, 255, 0.3);
        }
        .stp-marker:hover {
          background: linear-gradient(135deg, #818CF8 0%, #C084FC 100%);
          box-shadow: 0 0 8px rgba(108, 140, 255, 0.5);
        }
        .stp-marker.stp-active {
          background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
        }

        /* Marker number badge */
        .stp-marker-num {
          position: absolute;
          right: ${MARKER_WIDTH + 6}px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 9px;
          font-weight: 700;
          color: rgba(100, 120, 180, 0.6);
          opacity: 0;
          transition: opacity 0.15s ease;
          pointer-events: none;
          white-space: nowrap;
        }
        .stp-track:hover .stp-marker-num {
          opacity: 1;
        }

        /* ── Tooltip ── */
        .stp-tooltip {
          position: fixed;
          right: ${TRACK_WIDTH + 10}px;
          max-width: 260px;
          padding: 8px 12px;
          background: rgba(20, 20, 35, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #e8e8f0;
          font-size: 11px;
          line-height: 1.45;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          opacity: 0;
          pointer-events: none;
          transform: translateX(6px);
          transition: opacity 0.2s ease, transform 0.2s ease;
          z-index: 2147483647;
          word-break: break-word;
        }
        .stp-tooltip.stp-visible {
          opacity: 1;
          transform: translateX(0);
        }
        .stp-tooltip-header {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #A78BFA;
          margin-bottom: 4px;
        }

        /* ── Dark Mode Overrides ── */
        @media (prefers-color-scheme: dark) {
          .stp-track {
            background: linear-gradient(
              180deg,
              rgba(200, 200, 220, 0.03) 0%,
              rgba(200, 200, 220, 0.06) 50%,
              rgba(200, 200, 220, 0.03) 100%
            );
            border-left-color: rgba(200, 200, 220, 0.08);
          }
          .stp-track:hover {
            background: linear-gradient(
              180deg,
              rgba(200, 200, 220, 0.06) 0%,
              rgba(200, 200, 220, 0.12) 50%,
              rgba(200, 200, 220, 0.06) 100%
            );
          }
          .stp-viewport {
            background: rgba(130, 180, 255, 0.05);
            border-left-color: rgba(130, 180, 255, 0.12);
          }
          .stp-marker {
            background: linear-gradient(135deg, #818CF8 0%, #C084FC 100%);
            box-shadow: 0 0 6px rgba(129, 140, 248, 0.35);
          }
          .stp-marker:hover {
            background: linear-gradient(135deg, #A78BFA 0%, #E879F9 100%);
            box-shadow: 0 0 12px rgba(167, 139, 250, 0.5);
          }
          .stp-marker.stp-active {
            background: linear-gradient(135deg, #FBBF24 0%, #FB923C 100%);
            box-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
          }
          .stp-marker-num {
            color: rgba(160, 170, 220, 0.5);
          }
        }

        /* ── Glow pulse for newly appeared prompts ── */
        @keyframes stp-pulse {
          0%   { box-shadow: 0 0 4px rgba(108,140,255,0.3); }
          50%  { box-shadow: 0 0 14px rgba(108,140,255,0.6); }
          100% { box-shadow: 0 0 4px rgba(108,140,255,0.3); }
        }
        .stp-marker.stp-new {
          animation: stp-pulse 0.8s ease-in-out 2;
        }
      `;
    }

    /**
     * markers: Array of { ratio (0-1), text, index (1-based) }
     * viewportTop, viewportHeight: 0-1 ratios for the viewport indicator
     */
    update(markers, viewportTop, viewportHeight, onMarkerClick) {
      // Preserve existing markers where possible (keyed by index)
      const existingMap = new Map();
      this.track.querySelectorAll('.stp-marker-wrap').forEach(wrap => {
        existingMap.set(wrap.dataset.idx, wrap);
      });

      const usedKeys = new Set();
      markers.forEach(m => {
        const key = String(m.index);
        usedKeys.add(key);

        let wrap = existingMap.get(key);
        let marker, badge;

        if (wrap) {
          // Update position
          marker = wrap.querySelector('.stp-marker');
          badge = wrap.querySelector('.stp-marker-num');
        } else {
          // Create new
          wrap = document.createElement('div');
          wrap.className = 'stp-marker-wrap';
          wrap.dataset.idx = key;
          wrap.style.position = 'absolute';
          wrap.style.right = '0';
          wrap.style.width = '100%';

          marker = document.createElement('div');
          marker.className = 'stp-marker stp-new';
          // Remove the pulse animation after it plays
          marker.addEventListener('animationend', () => marker.classList.remove('stp-new'));

          badge = document.createElement('div');
          badge.className = 'stp-marker-num';

          wrap.appendChild(badge);
          wrap.appendChild(marker);
          this.track.appendChild(wrap);
        }

        wrap.style.top = `${m.ratio * 100}%`;
        badge.textContent = m.index;

        // Click → scroll to prompt
        marker.onclick = () => onMarkerClick(m.index - 1);

        // Tooltip on hover
        marker.onmouseenter = (e) => {
          this.tooltip.innerHTML = `
            <div class="stp-tooltip-header">Prompt #${m.index}</div>
            <div>${this._truncate(m.text, 120)}</div>
          `;
          this.tooltip.style.top = `${e.clientY - 20}px`;
          this.tooltip.classList.add('stp-visible');
        };
        marker.onmouseleave = () => {
          this.tooltip.classList.remove('stp-visible');
        };
      });

      // Remove stale markers
      existingMap.forEach((wrap, key) => {
        if (!usedKeys.has(key)) wrap.remove();
      });

      // Update viewport indicator
      this.viewport.style.top = `${viewportTop * 100}%`;
      this.viewport.style.height = `${viewportHeight * 100}%`;
    }

    setActive(idx) {
      this.track.querySelectorAll('.stp-marker').forEach(m => m.classList.remove('stp-active'));
      const wrap = this.track.querySelector(`.stp-marker-wrap[data-idx="${idx + 1}"]`);
      if (wrap) wrap.querySelector('.stp-marker')?.classList.add('stp-active');
      this.activeIdx = idx;
    }

    destroy() {
      this.host.remove();
    }

    _truncate(str, max) {
      if (!str) return '(empty)';
      return str.length > max ? str.slice(0, max) + '…' : str;
    }
  }


  /* ─────────── Engine ─────────── */

  class ScrollToPromptEngine {
    constructor(adapter) {
      this.adapter = adapter;
      this.ui = new MarkerTrack();
      this._lastPromptCount = 0;
      this._observer = null;
      this._scrollHandler = null;
      this._pollTimer = null;
      this._resizeHandler = null;
      this._debounceTimer = null;
      this._enabled = true;
    }

    init() {
      console.log(`${TAG} Active on ${this.adapter.platform}`);

      // Listen for scroll to update viewport indicator
      this._scrollHandler = () => this._debouncedRender();
      window.addEventListener('scroll', this._scrollHandler, true);

      // Resize
      this._resizeHandler = () => this._debouncedRender();
      window.addEventListener('resize', this._resizeHandler);

      // Keyboard navigation: Alt+↑ / Alt+↓ to jump between prompts
      document.addEventListener('keydown', (e) => {
        if (!this._enabled) return;
        if (e.altKey && e.key === 'ArrowUp') {
          e.preventDefault();
          this.jumpToPrev();
        } else if (e.altKey && e.key === 'ArrowDown') {
          e.preventDefault();
          this.jumpToNext();
        }
      });

      // MutationObserver for DOM changes
      this._observer = new MutationObserver(() => this._debouncedRender());
      this._observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: false,
        attributes: false,
      });

      // Fallback polling (some sites use virtual scrolling)
      this._pollTimer = setInterval(() => this.render(), POLL_MS);

      // Initial render (with small delay for DOM hydration)
      setTimeout(() => this.render(), 500);
      setTimeout(() => this.render(), 2000);
    }

    _debouncedRender() {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this.render(), DEBOUNCE_MS);
    }

    render() {
      if (!this._enabled) return;

      const container = this.adapter.getScrollContainer();
      if (!container) return;

      const prompts = this.adapter.getPrompts();
      if (!prompts.length && this._lastPromptCount === 0) return;

      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const scrollTop = container === document.documentElement
        ? (window.pageYOffset || document.documentElement.scrollTop)
        : container.scrollTop;

      // Build marker data
      const markers = [];
      prompts.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        let absoluteTop;

        if (container === document.documentElement) {
          absoluteTop = rect.top + window.pageYOffset;
        } else {
          const containerRect = container.getBoundingClientRect();
          absoluteTop = rect.top - containerRect.top + container.scrollTop;
        }

        const ratio = scrollHeight > 0 ? Math.min(Math.max(absoluteTop / scrollHeight, 0), 1) : 0;

        markers.push({
          ratio,
          text: this.adapter.getPromptText(el),
          index: i + 1,
        });
      });

      // Viewport indicator
      const viewportTop = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      const viewportHeight = scrollHeight > 0 ? clientHeight / scrollHeight : 1;

      this.ui.update(markers, viewportTop, viewportHeight, (idx) => this.scrollToPrompt(idx));

      this._prompts = prompts;
      this._lastPromptCount = prompts.length;
    }

    scrollToPrompt(idx) {
      const prompts = this._prompts || this.adapter.getPrompts();
      if (idx < 0 || idx >= prompts.length) return;
      prompts[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.ui.setActive(idx);
    }

    jumpToNext() {
      const prompts = this._prompts || this.adapter.getPrompts();
      if (!prompts.length) return;
      const next = Math.min((this.ui.activeIdx ?? -1) + 1, prompts.length - 1);
      this.scrollToPrompt(next);
    }

    jumpToPrev() {
      const prompts = this._prompts || this.adapter.getPrompts();
      if (!prompts.length) return;
      const prev = Math.max((this.ui.activeIdx ?? prompts.length) - 1, 0);
      this.scrollToPrompt(prev);
    }

    toggle(enabled) {
      this._enabled = enabled;
      this.ui.host.style.display = enabled ? '' : 'none';
    }

    destroy() {
      if (this._observer) this._observer.disconnect();
      if (this._pollTimer) clearInterval(this._pollTimer);
      if (this._scrollHandler) window.removeEventListener('scroll', this._scrollHandler, true);
      if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
      this.ui.destroy();
    }
  }


  /* ─────────── Bootstrap ─────────── */

  function boot() {
    const adapter = detectAdapter();
    if (!adapter) {
      console.log(`${TAG} No supported platform detected on ${location.hostname}`);
      return;
    }

    const engine = new ScrollToPromptEngine(adapter);
    engine.init();

    // Listen for messages from popup / background
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'stp-toggle') {
          engine.toggle(msg.enabled);
        }
        if (msg.type === 'stp-get-info') {
          const prompts = adapter.getPrompts();
          sendResponse({
            prompts: prompts.length,
            markers: prompts.length,
            platform: adapter.platform,
          });
        }
        return true; // keep channel open for async response
      });
    }
  }

  // Wait for DOM to be ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 300);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(boot, 300));
  }

})();
