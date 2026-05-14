import { ScrollToPromptEngine } from '../core/Engine';
import { ChatGPTAdapter, ClaudeAdapter, GeminiAdapter } from '../adapters/Platforms';

function bootstrap() {
  const host = window.location.hostname;
  let adapter;

  if (host.includes('chatgpt.com')) {
    adapter = new ChatGPTAdapter();
  } else if (host.includes('claude.ai')) {
    adapter = new ClaudeAdapter();
  } else if (host.includes('gemini.google.com')) {
    adapter = new GeminiAdapter();
  }

  if (adapter) {
    const engine = new ScrollToPromptEngine(adapter);
    engine.init();
  }
}

if (document.readyState === 'complete') {
  bootstrap();
} else {
  window.addEventListener('load', bootstrap);
}
