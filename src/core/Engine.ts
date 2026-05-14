import { MarkerUI } from '../components/MarkerUI';

export interface SiteAdapter {
  platform: string;
  getPrompts(): HTMLElement[];
  getScrollContainer(): HTMLElement;
}

export class ScrollToPromptEngine {
  private adapter: SiteAdapter;
  private ui: MarkerUI;

  constructor(adapter: SiteAdapter) {
    this.adapter = adapter;
    this.ui = new MarkerUI();
  }

  public init() {
    console.log(`[ScrollToPrompt] Initializing for ${this.adapter.platform}`);
    this.startObservation();
    this.render();
  }

  private startObservation() {
    const observer = new MutationObserver(() => this.render());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', () => this.render());
  }

  public render() {
    const prompts = this.adapter.getPrompts();
    const scrollContainer = this.adapter.getScrollContainer();
    const scrollHeight = scrollContainer.scrollHeight;

    const markers = prompts.map(prompt => {
      const rect = prompt.getBoundingClientRect();
      const scrollTop = scrollContainer.scrollTop || window.pageYOffset;
      const absoluteTop = rect.top + scrollTop;
      const positionRatio = (absoluteTop / scrollHeight) * 100;

      return {
        top: positionRatio,
        onClick: () => prompt.scrollIntoView({ behavior: 'smooth', block: 'center' })
      };
    });

    this.ui.update(markers);
  }
}
