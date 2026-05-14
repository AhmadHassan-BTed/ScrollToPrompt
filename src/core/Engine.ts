import { MarkerUI } from '../components/MarkerUI';
import { Logger } from '../utils/Logger';

export interface SiteAdapter {
  platform: string;
  getPrompts(): HTMLElement[];
  getScrollContainer(): HTMLElement | null;
}

const DEBOUNCE_MS = 120;
const POLL_MS = 2000;

export class ScrollToPromptEngine {
  private adapter: SiteAdapter;
  private ui: MarkerUI | null = null;
  private _observer: MutationObserver | null = null;
  private _navObserver: MutationObserver | null = null;
  private _pollTimer: number | null = null;
  private _debounceTimer: number | null = null;
  private _lastUrl: string = location.href;
  private _containerAttempts: number = 0;

  constructor(adapter: SiteAdapter) {
    this.adapter = adapter;
    Logger.debug('Engine constructed for adapter:', adapter.platform);
  }

  public init() {
    Logger.info(`[ScrollToPrompt] Active on ${this.adapter.platform}`);
    this._findContainerAndInit();

    // Listen for messages from popup
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
        Logger.debug('Received message in Engine:', msg);
        if (msg.type === 'stp-toggle') {
          if (this.ui) this.ui.toggle(msg.enabled);
        }
        if (msg.type === 'stp-get-info') {
          const prompts = this.adapter.getPrompts();
          sendResponse({ prompts: prompts.length, platform: this.adapter.platform });
        }
        return true;
      });
    }
  }

  private _findContainerAndInit() {
    const ct = this.adapter.getScrollContainer();
    if (ct) {
      Logger.debug('Scroll container found', ct);
      this._initScrollbar(ct);
    } else {
      this._containerAttempts++;
      Logger.debug(`Scroll container not found, attempt ${this._containerAttempts}`);
      if (this._containerAttempts < 20) {
        setTimeout(() => this._findContainerAndInit(), 500);
      } else {
        Logger.error('Failed to find scroll container after 20 attempts.');
      }
    }
  }

  private _initScrollbar(container: HTMLElement) {
    Logger.info('Initializing MarkerUI for scrollbar overlay');
    if (this.ui) this.ui.destroy();
    
    // We will initialize the MarkerUI with the target container
    this.ui = new MarkerUI(container);
    this._scan();
    this._startObserving(container);
    
    if (this._pollTimer) clearInterval(this._pollTimer);
    this._pollTimer = window.setInterval(() => this._debouncedScan(), POLL_MS);
    this._watchNavigation();
  }

  private _scan() {
    if (!this.ui || this.ui.isDestroyed()) return;
    
    const ct = this.ui.getContainer();
    const prompts = this.adapter.getPrompts();
    
    if (!prompts.length) {
      Logger.debug('No prompts found during scan');
      this.ui.updateMarkers([]);
      return;
    }

    const scrollH = ct.scrollHeight;
    const ctRect = ct.getBoundingClientRect();
    const scrollTop = ct.scrollTop;

    const ratios = prompts.map(el => {
      const r = el.getBoundingClientRect();
      const absTop = r.top - ctRect.top + scrollTop;
      return Math.min(Math.max(absTop / scrollH, 0), 1);
    });

    Logger.debug(`Scan complete. Found ${prompts.length} prompts. Updating markers...`, ratios);
    this.ui.updateMarkers(ratios);
  }

  private _debouncedScan() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = window.setTimeout(() => this._scan(), DEBOUNCE_MS);
  }

  private _startObserving(container: HTMLElement) {
    if (this._observer) this._observer.disconnect();
    this._observer = new MutationObserver((mutations) => {
      // Logger.debug('DOM Mutation detected', mutations.length); // Excluded to avoid spam
      this._debouncedScan();
    });
    this._observer.observe(container, { childList: true, subtree: true });
    Logger.debug('Started observing DOM mutations on container');
  }

  private _watchNavigation() {
    const check = () => {
      if (location.href !== this._lastUrl) {
        Logger.info(`URL changed from ${this._lastUrl} to ${location.href}. Re-initializing...`);
        this._lastUrl = location.href;
        this._containerAttempts = 0;
        setTimeout(() => {
          const ct = this.adapter.getScrollContainer();
          if (ct && ct !== this.ui?.getContainer()) this._initScrollbar(ct);
          else this._scan();
        }, 800);
      }
    };
    if (this._navObserver) this._navObserver.disconnect();
    this._navObserver = new MutationObserver(check);
    this._navObserver.observe(document.body, { childList: true, subtree: true });
  }
}
