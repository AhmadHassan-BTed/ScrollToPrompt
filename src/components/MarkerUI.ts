export class MarkerUI {
  private container: HTMLElement;
  private shadow: ShadowRoot;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'scroll-to-prompt-root';
    this.shadow = this.container.attachShadow({ mode: 'closed' });
    this.injectStyles();
    document.body.appendChild(this.container);
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        position: fixed;
        top: 0;
        right: 0;
        width: 14px;
        height: 100vh;
        z-index: 2147483647;
        pointer-events: none;
      }
      .track {
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.05);
        transition: background 0.2s ease;
      }
      .track:hover {
        background: rgba(0, 0, 0, 0.1);
        pointer-events: auto;
      }
      .marker {
        position: absolute;
        right: 2px;
        width: 10px;
        height: 4px;
        background: #4a9eff;
        border-radius: 2px;
        cursor: pointer;
        pointer-events: auto;
        transition: transform 0.15s ease, background 0.15s ease;
      }
      .marker:hover {
        transform: scaleX(1.4);
        background: #2188ff;
      }
      @media (prefers-color-scheme: dark) {
        .track { background: rgba(255, 255, 255, 0.05); }
        .track:hover { background: rgba(255, 255, 255, 0.1); }
        .marker { background: #00e5ff; }
        .marker:hover { background: #fff; }
      }
    `;
    this.shadow.appendChild(style);
  }

  public update(markers: { top: number; onClick: () => void }[]) {
    const track = document.createElement('div');
    track.className = 'track';
    
    markers.forEach(m => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.top = `${m.top}%`;
      el.onclick = m.onClick;
      track.appendChild(el);
    });

    // Efficiently swap the track
    const oldTrack = this.shadow.querySelector('.track');
    if (oldTrack) this.shadow.removeChild(oldTrack);
    this.shadow.appendChild(track);
  }
}
