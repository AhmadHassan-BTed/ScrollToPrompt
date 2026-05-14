export class MarkerUI {
  private container: HTMLElement;
  private host!: HTMLElement;
  private shadow!: ShadowRoot;
  private track!: HTMLElement;
  private thumb!: HTMLElement;
  private markerLayer!: HTMLElement;
  private nativeStyle: HTMLStyleElement | null = null;
  
  private markers: { ratio: number; density: number }[] = [];
  private destroyed: boolean = false;
  private isDragging: boolean = false;
  private isHovering: boolean = false;
  private hideTimer: number | null = null;
  private raf: number | null = null;
  private ro: ResizeObserver | null = null;
  private mql: MediaQueryList;

  // Settings
  private cfg = {
    enabled: true,
    markerColor: '#a78bfa',
    markerOpacity: 0.45,
    scrollbarWidth: 8,
    hoverWidth: 14,
    autoHide: true,
    autoHideDelay: 1400,
    side: 'right',
    animations: true,
    themeSync: true
  };

  private boundOnScroll: () => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnThemeChange: () => void;
  private boundOnStorageChange!: (changes: { [key: string]: chrome.storage.StorageChange }) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Load settings from storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(this.cfg, (data) => {
        this.cfg = { ...this.cfg, ...data };
        this.buildDOM();
        this.hideNativeScrollbar();
        this.bindEvents();
        this.updateGeometry();
        this.updateThumb();
        this.show();
      });

      this.boundOnStorageChange = (changes) => {
        let changed = false;
        for (const [k, { newValue }] of Object.entries(changes)) {
          if (k in this.cfg) {
            (this.cfg as any)[k] = newValue;
            changed = true;
          }
        }
        if (changed) {
          this.rebuild();
        }
      };
      chrome.storage.onChanged.addListener(this.boundOnStorageChange);
    } else {
      // Fallback if not in extension context
      this.buildDOM();
      this.hideNativeScrollbar();
      this.bindEvents();
      this.updateGeometry();
      this.updateThumb();
      this.show();
    }

    this.boundOnScroll = () => { this.scheduleFrame(); this.show(); };
    this.boundOnMouseMove = (e) => {
      if (this.isDragging) return;
      const fromRight = window.innerWidth - e.clientX;
      const fromLeft = e.clientX;
      const near = this.cfg.side === 'right' ? fromRight < 40 : fromLeft < 40;
      if (near && !this.isHovering) this.show();
    };
    this.boundOnThemeChange = () => this.rebuild();
    this.mql = window.matchMedia('(prefers-color-scheme: dark)');
  }

  private isDarkTheme() {
    if (!this.cfg.themeSync) return true; // Default to dark if sync disabled
    if (this.mql.matches) return true;
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/\d+/g);
    if (m) {
      const lum = (0.299 * parseInt(m[0]) + 0.587 * parseInt(m[1]) + 0.114 * parseInt(m[2]));
      return lum < 128;
    }
    return false;
  }

  private buildDOM() {
    if (this.host) return;

    this.host = document.createElement('div');
    this.host.id = 'stp-host';
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = this.getCSS();
    this.shadow.appendChild(style);

    this.track = document.createElement('div');
    this.track.className = `track ${this.cfg.side === 'left' ? 'left' : ''}`;

    this.markerLayer = document.createElement('div');
    this.markerLayer.className = 'markers';
    this.track.appendChild(this.markerLayer);

    this.thumb = document.createElement('div');
    this.thumb.className = 'thumb';
    this.track.appendChild(this.thumb);

    this.shadow.appendChild(this.track);
    document.body.appendChild(this.host);
  }

  private getCSS() {
    const w = this.cfg.scrollbarWidth;
    const hw = this.cfg.hoverWidth;
    const mc = this.cfg.markerColor;
    const mo = this.cfg.markerOpacity;
    const anim = this.cfg.animations;
    const dur = anim ? '0.25s' : '0s';
    const durFast = anim ? '0.15s' : '0s';
    const isDark = this.isDarkTheme();

    return `
      :host { position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none; }
      .track {
        position: fixed; top: 0; right: 0;
        width: ${w}px; height: 100vh;
        pointer-events: auto; cursor: default;
        opacity: 0;
        transition: opacity ${dur} ease, width ${dur} ease;
        contain: layout style;
      }
      .track.left { right: auto; left: 0; }
      .track.visible { opacity: 1; }
      .track:hover { width: ${hw}px; }
      .track::before {
        content: ''; position: absolute; inset: 0;
        background: transparent;
        transition: background ${dur} ease;
      }
      .track:hover::before {
        background: ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
      }
      .thumb {
        position: absolute; right: 1px; left: 1px;
        min-height: 36px; border-radius: 9999px;
        background: ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'};
        transition: background ${durFast} ease;
        z-index: 3; cursor: default;
      }
      .thumb:hover, .thumb.active {
        background: ${isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.32)'};
      }
      .markers { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
      .mk {
        position: absolute; left: 1px; right: 1px;
        height: 3px; border-radius: 1.5px;
        background: ${mc}; opacity: ${mo};
        transition: opacity ${durFast} ease, box-shadow ${durFast} ease;
      }
      .mk.glow { opacity: ${Math.min(mo + 0.25, 0.85)}; box-shadow: 0 0 5px ${mc}44; }
      .track:hover .mk { opacity: ${Math.min(mo + 0.12, 0.75)}; }
      .track:hover .mk.glow { opacity: ${Math.min(mo + 0.35, 0.95)}; }
      @media (prefers-reduced-motion: reduce) {
        .track, .thumb, .mk { transition: none !important; }
      }
    `;
  }

  private hideNativeScrollbar() {
    if (this.nativeStyle) this.nativeStyle.remove();
    this.nativeStyle = document.createElement('style');
    this.nativeStyle.id = 'stp-hide-native';

    const id = this.container.id ? `#${CSS.escape(this.container.id)}` : null;
    const cls = this.container.classList.length ? `.${Array.from(this.container.classList).map(CSS.escape).join('.')}` : '';
    const sel = id || cls || this.container.tagName.toLowerCase();

    this.nativeStyle.textContent = `
      ${sel} { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      ${sel}::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    `;
    document.head.appendChild(this.nativeStyle);
  }

  private bindEvents() {
    this.container.addEventListener('scroll', this.boundOnScroll, { passive: true });
    
    this.thumb.addEventListener('mousedown', (e) => this.startDrag(e));
    this.track.addEventListener('mousedown', (e) => {
      if (e.target === this.thumb || this.isDragging) return;
      this.clickToScroll(e);
    });

    this.track.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.container.scrollBy({ top: e.deltaY, left: 0 });
    }, { passive: false });

    this.track.addEventListener('mouseenter', () => {
      this.isHovering = true; this.show();
      if (this.hideTimer) clearTimeout(this.hideTimer);
    });
    this.track.addEventListener('mouseleave', () => {
      this.isHovering = false;
      if (!this.isDragging) this.scheduleHide();
    });

    document.addEventListener('mousemove', this.boundOnMouseMove, { passive: true });

    this.ro = new ResizeObserver(() => { this.updateGeometry(); this.scheduleFrame(); });
    this.ro.observe(this.container);

    this.mql.addEventListener('change', this.boundOnThemeChange);
  }

  private startDrag(e: MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    this.isDragging = true;
    this.thumb.classList.add('active');
    
    const startY = e.clientY;
    const startScroll = this.container.scrollTop;
    const trackH = this.track.getBoundingClientRect().height;

    const onMove = (e: MouseEvent) => {
      const dy = e.clientY - startY;
      this.container.scrollTop = startScroll + (dy / trackH) * this.container.scrollHeight;
    };
    const onUp = () => {
      this.isDragging = false;
      this.thumb.classList.remove('active');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this.scheduleHide();
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private clickToScroll(e: MouseEvent) {
    const rect = this.track.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const target = ratio * (this.container.scrollHeight - this.container.clientHeight);
    this.container.scrollTo({ top: target, behavior: this.cfg.animations ? 'smooth' : 'auto' });
  }

  private updateGeometry() {
    if (!this.track) return;
    const r = this.container.getBoundingClientRect();
    this.track.style.top = `${Math.max(r.top, 0)}px`;
    this.track.style.height = `${Math.min(r.height, window.innerHeight - Math.max(r.top, 0))}px`;
    
    if (this.cfg.side === 'right') {
      this.track.style.right = `${Math.max(window.innerWidth - r.right, 0)}px`;
      this.track.style.left = 'auto';
    } else {
      this.track.style.left = `${Math.max(r.left, 0)}px`;
      this.track.style.right = 'auto';
    }
  }

  private updateThumb() {
    if (!this.track || !this.thumb) return;
    const { scrollTop, scrollHeight, clientHeight } = this.container;
    if (scrollHeight <= clientHeight) { this.track.style.opacity = '0'; return; }

    const trackH = parseFloat(this.track.style.height) || this.track.getBoundingClientRect().height;
    const thumbH = Math.max((clientHeight / scrollHeight) * trackH, 36);
    const maxTop = trackH - thumbH;
    const ratio = scrollTop / (scrollHeight - clientHeight);
    
    this.thumb.style.height = `${thumbH}px`;
    this.thumb.style.top = `${ratio * maxTop}px`;

    this.updateMarkerGlow(scrollTop, clientHeight, scrollHeight);
  }

  private scheduleFrame() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = null;
      this.updateThumb();
    });
  }

  public updateMarkers(ratios: number[]) {
    this.markers = this.compressMarkers(ratios);
    const existing = this.markerLayer.children;
    const need = this.markers.length;

    while (existing.length > need) this.markerLayer.lastChild?.remove();
    while (existing.length < need) {
      const mk = document.createElement('div');
      mk.className = 'mk';
      this.markerLayer.appendChild(mk);
    }

    for (let i = 0; i < need; i++) {
      const el = existing[i] as HTMLElement;
      el.style.top = `${this.markers[i].ratio * 100}%`;
      if (this.markers[i].density > 1) {
        el.style.height = `${Math.min(3 + this.markers[i].density, 8)}px`;
      }
    }
  }

  private compressMarkers(ratios: number[]) {
    if (!ratios.length) return [];
    const sorted = ratios.map(r => ({ ratio: r, density: 1 })).sort((a, b) => a.ratio - b.ratio);
    const trackH = parseFloat(this.track?.style.height || '0') || window.innerHeight;
    const minGap = 4 / trackH;

    const out = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const last = out[out.length - 1];
      if (sorted[i].ratio - last.ratio < minGap) {
        last.ratio = (last.ratio * last.density + sorted[i].ratio) / (last.density + 1);
        last.density++;
      } else {
        out.push(sorted[i]);
      }
    }
    return out;
  }

  private updateMarkerGlow(scrollTop: number, clientH: number, scrollH: number) {
    const vpTop = scrollTop / scrollH;
    const vpBot = (scrollTop + clientH) / scrollH;
    const els = this.markerLayer.children;
    for (let i = 0; i < els.length && i < this.markers.length; i++) {
      const r = this.markers[i].ratio;
      const inView = r >= vpTop - 0.02 && r <= vpBot + 0.02;
      els[i].classList.toggle('glow', inView);
    }
  }

  public show() {
    if (!this.cfg.enabled || !this.track) return;
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.track.classList.add('visible');
    this.scheduleHide();
  }

  private scheduleHide() {
    if (!this.cfg.autoHide || this.isHovering || this.isDragging) return;
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      if (!this.isHovering && !this.isDragging && this.track) {
        this.track.classList.remove('visible');
      }
    }, this.cfg.autoHideDelay);
  }

  private rebuild() {
    if (this.shadow) {
      const style = this.shadow.querySelector('style');
      if (style) style.textContent = this.getCSS();
    }
    if (this.track) {
      this.track.className = `track ${this.cfg.side === 'left' ? 'left' : ''}`;
    }
    this.updateGeometry();
    this.updateThumb();
  }

  public toggle(enabled: boolean) {
    this.cfg.enabled = enabled;
    if (this.host) this.host.style.display = enabled ? '' : 'none';
    if (enabled) { this.updateGeometry(); this.scheduleFrame(); this.show(); }
  }

  public getContainer() { return this.container; }
  public isDestroyed() { return this.destroyed; }

  public destroy() {
    this.destroyed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.hideTimer) clearTimeout(this.hideTimer);
    
    this.container.removeEventListener('scroll', this.boundOnScroll);
    document.removeEventListener('mousemove', this.boundOnMouseMove);
    this.mql.removeEventListener('change', this.boundOnThemeChange);
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.removeListener(this.boundOnStorageChange);
    }

    if (this.ro) this.ro.disconnect();
    if (this.nativeStyle) this.nativeStyle.remove();
    if (this.host) this.host.remove();
  }
}
