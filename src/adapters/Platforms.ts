import { SiteAdapter } from '../core/Engine';

export class ChatGPTAdapter implements SiteAdapter {
  platform = 'ChatGPT';

  getPrompts(): HTMLElement[] {
    let els = document.querySelectorAll('[data-message-author-role="user"]');
    if (els.length) return Array.from(els) as HTMLElement[];

    els = document.querySelectorAll('div[data-testid^="conversation-turn-"] .whitespace-pre-wrap');
    if (els.length) {
      return Array.from(els).filter((_, i) => i % 2 === 0) as HTMLElement[];
    }

    els = document.querySelectorAll('.text-base [data-message-author-role="user"], .agent-turn');
    return Array.from(els) as HTMLElement[];
  }

  getScrollContainer(): HTMLElement {
    const candidates = [
      'main .overflow-y-auto',
      'main [class*="react-scroll-to-bottom"]',
      'main .flex-1.overflow-hidden .overflow-y-auto',
      '[role="presentation"]',
      'main',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el && el.scrollHeight > el.clientHeight + 1) return el;
    }
    return document.documentElement;
  }
}

export class ClaudeAdapter implements SiteAdapter {
  platform = 'Claude';

  getPrompts(): HTMLElement[] {
    const selectors = [
      '[data-testid="user-message"]',
      '.font-user-message',
      '.font-user',
      'div[class*="human"]'
    ];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length) return Array.from(els) as HTMLElement[];
    }
    const prose = document.querySelectorAll('.contents .prose');
    return Array.from(prose).filter((_, i) => i % 2 === 0) as HTMLElement[];
  }

  getScrollContainer(): HTMLElement {
    const candidates = [
      '.flex-1.overflow-y-auto',
      '[class*="thread-content"]',
      'main .overflow-y-auto',
      '.overflow-y-auto',
      'main',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el && el.scrollHeight > el.clientHeight + 1) return el;
    }
    return document.documentElement;
  }
}

export class GeminiAdapter implements SiteAdapter {
  platform = 'Gemini';

  getPrompts(): HTMLElement[] {
    const selectors = [
      'user-query',
      '.user-query',
      '[data-message-author="user"]',
      '.query-text',
      '.user-query-content',
      'message-content[data-is-user="true"]'
    ];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length) return Array.from(els) as HTMLElement[];
    }
    return [];
  }

  getScrollContainer(): HTMLElement {
    const candidates = [
      '.chat-history',
      'main .overflow-y-auto',
      '.conversation-container',
      'infinite-scroller',
      'main',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el && el.scrollHeight > el.clientHeight + 1) return el;
    }
    return document.documentElement;
  }
}

export class PerplexityAdapter implements SiteAdapter {
  platform = 'Perplexity';

  getPrompts(): HTMLElement[] {
    const selectors = [
      '[data-testid="user-message"]',
      '.prose[dir="auto"]',
      'div[class*="UserMessage"]',
      '.whitespace-pre-wrap'
    ];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length) return Array.from(els) as HTMLElement[];
    }
    return [];
  }

  getScrollContainer(): HTMLElement {
    const candidates = [
      'main .overflow-y-auto',
      '[class*="scroll"]',
      'main',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el && el.scrollHeight > el.clientHeight + 1) return el;
    }
    return document.documentElement;
  }
}

export class GrokAdapter implements SiteAdapter {
  platform = 'Grok';

  getPrompts(): HTMLElement[] {
    const selectors = [
      '[data-testid="user-message"]',
      'div[class*="user"]',
      'div[class*="human"]',
      '.whitespace-pre-wrap'
    ];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length) return Array.from(els) as HTMLElement[];
    }
    return [];
  }

  getScrollContainer(): HTMLElement {
    const candidates = [
      'main .overflow-y-auto',
      '[class*="scroll"]',
      'main',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el && el.scrollHeight > el.clientHeight + 1) return el;
    }
    return document.documentElement;
  }
}
