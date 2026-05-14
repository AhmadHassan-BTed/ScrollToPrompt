# Architecture Overview

ScrollToPrompt is built as a lightweight browser extension using Manifest V3. The goal is to provide a seamless navigation experience without impacting the performance of the AI chat interfaces.

## Core Components

### 1. Content Script (`src/content/`)
The content script is the heart of the extension. It runs in the context of the supported chat pages.

- **Detector Engine**: Uses site-specific CSS selectors to identify user prompts.
- **Marker UI**: A custom overlay injected into the page that mirrors the scrollbar.
- **Scroll Sync**: Keeps markers positioned correctly relative to the scrollable container.

### 2. Site Configurations
Site-specific logic is decoupled from the main engine. This allows adding support for new platforms (e.g., Poe, Perplexity) by simply adding a new configuration object.

### 3. Messaging (Future)
For cross-tab synchronization or settings persistence, a background script will be introduced to handle `chrome.storage` updates.

## Design Decisions

- **Zero Dependencies**: To ensure maximum compatibility and speed, the extension uses vanilla JavaScript and CSS.
- **MutationObserver**: Instead of polling, the extension uses `MutationObserver` to respond to DOM changes (new messages, page transitions) efficiently.
- **Shadow DOM (Planned)**: To prevent site styles from leaking into the marker bar, we plan to use Shadow DOM for the UI components.

## Data Flow

1. Page Load -> Initialize `ScrollToPrompt` class.
2. Detect Platform -> Load site-specific selectors.
3. Observe DOM -> Scan for prompts.
4. Render Markers -> Map prompt vertical positions to the marker bar.
5. Click Event -> Trigger `scrollIntoView` for the target element.
