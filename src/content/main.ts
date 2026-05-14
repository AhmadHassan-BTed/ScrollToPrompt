import { ScrollToPromptEngine } from '../core/Engine';
import { ChatGPTAdapter, ClaudeAdapter, GeminiAdapter, PerplexityAdapter, GrokAdapter } from '../adapters/Platforms';

function bootstrap() {
  if ((window as any).__STP_LOADED__) return;
  (window as any).__STP_LOADED__ = true;

  const host = window.location.hostname;
  let adapter;

  if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) {
    adapter = new ChatGPTAdapter();
  } else if (host.includes('claude.ai')) {
    adapter = new ClaudeAdapter();
  } else if (host.includes('gemini.google.com')) {
    adapter = new GeminiAdapter();
  } else if (host.includes('perplexity.ai')) {
    adapter = new PerplexityAdapter();
  } else if (host.includes('grok.com') || (host.includes('x.com') && window.location.pathname.includes('/grok'))) {
    adapter = new GrokAdapter();
  }

  if (adapter) {
    const engine = new ScrollToPromptEngine(adapter);
    engine.init();
  } else {
    console.log('[ScrollToPrompt] No supported platform detected.');
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(bootstrap, 400);
} else {
  window.addEventListener('DOMContentLoaded', () => setTimeout(bootstrap, 400));
}
