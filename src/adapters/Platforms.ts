import { SiteAdapter } from '../core/Engine';

export class ChatGPTAdapter implements SiteAdapter {
  platform = 'ChatGPT';

  getPrompts(): HTMLElement[] {
    return Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
  }

  getScrollContainer(): HTMLElement {
    return document.querySelector('main div.overflow-y-auto') || document.documentElement;
  }
}

export class ClaudeAdapter implements SiteAdapter {
  platform = 'Claude';

  getPrompts(): HTMLElement[] {
    return Array.from(document.querySelectorAll('.font-user'));
  }

  getScrollContainer(): HTMLElement {
    return document.querySelector('.flex-1.overflow-y-auto') || document.documentElement;
  }
}

export class GeminiAdapter implements SiteAdapter {
  platform = 'Gemini';

  getPrompts(): HTMLElement[] {
    return Array.from(document.querySelectorAll('.user-query-content'));
  }

  getScrollContainer(): HTMLElement {
    return document.querySelector('.chat-history') || document.documentElement;
  }
}
