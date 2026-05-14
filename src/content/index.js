/**
 * ScrollToPrompt - Main Content Script
 */

const CONFIG = {
    'chatgpt.com': {
        promptSelector: '[data-message-author-role="user"]',
        scrollContainer: 'main div.overflow-y-auto'
    },
    'claude.ai': {
        promptSelector: '.font-user', // Placeholder
        scrollContainer: '.flex-1.overflow-y-auto'
    },
    'gemini.google.com': {
        promptSelector: '.user-query-content',
        scrollContainer: '.chat-history'
    }
};

class ScrollToPrompt {
    constructor() {
        this.config = this.getSiteConfig();
        if (!this.config) return;

        this.markers = [];
        this.markerBar = null;
        this.init();
    }

    getSiteConfig() {
        const host = window.location.hostname;
        for (const domain in CONFIG) {
            if (host.includes(domain)) return CONFIG[domain];
        }
        return null;
    }

    init() {
        this.createMarkerBar();
        this.observePrompts();
        this.updateMarkers();
        
        // Listen for scroll events to keep markers in sync if needed
        window.addEventListener('resize', () => this.updateMarkers());
    }

    createMarkerBar() {
        this.markerBar = document.createElement('div');
        this.markerBar.id = 'scroll-to-prompt-bar';
        document.body.appendChild(this.markerBar);
    }

    observePrompts() {
        const observer = new MutationObserver(() => {
            this.updateMarkers();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    updateMarkers() {
        const prompts = document.querySelectorAll(this.config.promptSelector);
        this.markerBar.innerHTML = '';
        
        const scrollHeight = document.documentElement.scrollHeight;
        const viewHeight = window.innerHeight;

        prompts.forEach((prompt, index) => {
            const rect = prompt.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const absoluteTop = rect.top + scrollTop;
            
            const positionRatio = absoluteTop / scrollHeight;
            
            const marker = document.createElement('div');
            marker.className = 'prompt-marker';
            marker.style.top = `${positionRatio * 100}%`;
            marker.title = `Prompt ${index + 1}`;
            
            marker.onclick = () => {
                prompt.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
            
            this.markerBar.appendChild(marker);
        });
    }
}

// Initialize when ready
if (document.readyState === 'complete') {
    new ScrollToPrompt();
} else {
    window.addEventListener('load', () => new ScrollToPrompt());
}
