// Site-specific selectors for detecting user prompts
export const SITE_CONFIGS = {
    'chatgpt.com': {
        promptSelector: '[data-testid^="conversation-turn-"]', // User turns usually have specific IDs or data attributes
        isUserMessage: (el) => el.querySelector('div[data-message-author-role="user"]'),
        scrollContainer: 'main div.scrollbar-trigger' || 'main'
    },
    'claude.ai': {
        promptSelector: '.font-claude-message', 
        isUserMessage: (el) => el.innerText.includes('User') || el.classList.contains('user-message'), // Placeholders for now
        scrollContainer: '.overflow-y-auto'
    },
    'gemini.google.com': {
        promptSelector: 'user-query',
        isUserMessage: () => true, // Gemini uses custom elements for queries
        scrollContainer: 're-over-scroll-container'
    }
};

export function getCurrentSiteConfig() {
    const host = window.location.hostname;
    for (const domain in SITE_CONFIGS) {
        if (host.includes(domain)) return SITE_CONFIGS[domain];
    }
    return null;
}
