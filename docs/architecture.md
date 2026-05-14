# Architecture Guide: ScrollToPrompt

This document describes the architectural patterns and design decisions behind **ScrollToPrompt**.

## Core Philosophy
The extension is designed to be **an evolution of the native scrollbar**. We prioritize an unobtrusive, elegant, and intelligent enhancement over a bulky minimap.

## 🧱 Component Architecture

### 1. MarkerUI (`src/components/MarkerUI.ts`)
This is the core renderer class.
- **Shadow DOM Isolation**: The entire custom scrollbar UI is encased in an isolated Shadow DOM to avoid CSS conflicts with the host website.
- **Native Scrolling Masking**: Hides the native scrollbar with dynamically injected CSS rules matching the specific container (`scrollbar-width: none`, `::-webkit-scrollbar { display: none }`).
- **Drag & Click Math**: Custom JS mimics native dragging and track-clicking accurately.
- **Marker Compression**: If there are hundreds of prompts (e.g., long chat), markers compress visually and merge into density bars so they never overlap awkwardly or crash the DOM.
- **Auto-Hide & Edge Zones**: Uses native-feeling hover detection and edge-zone detection (within 40px of screen edge) to gracefully fade in and out.
- **Hover Transitions**: Changes dimensions and opacity of track and markers contextually based on user interactions.

### 2. The Engine (`src/core/Engine.ts`)
The `Engine` manages the extension lifecycle:
- **Initialization**: Automatically polling until the chat container hydrates, then initializing the custom scrollbar on it.
- **Observation**: Monitors the DOM (`MutationObserver`) for newly added messages or prompt streaming.
- **Routing**: `MutationObserver` specifically for single-page app (SPA) navigations, destroying and recreating the scrollbar when changing chats.

### 3. Site Adapters (`src/adapters/Platforms.ts`)
Implemented as static classes implementing the `SiteAdapter` interface:
- Exposes `getPrompts()` returning an array of DOM elements representing the user's input.
- Exposes `getScrollContainer()` returning the scrollable view (handling quirks across multiple frameworks).
- Supports: ChatGPT, Claude, Gemini, Perplexity, and Grok.

### 4. Background Service Worker (`src/background/index.ts`)
- Handles global state broadcast and installation lifecycles.
- Re-broadcasts settings changes across all active tabs using `chrome.tabs.sendMessage`.

### 5. Settings Popup (`src/popup/`)
- **UI System**: Premium, dark-themed, glassmorphism-inspired UI with CSS-only toggle switches, range sliders, and dynamic chips.
- **Communication**: Queries active tabs to fetch live statistics on the number of prompts in the current conversation.
- **Sync**: Automatically persists user preferences via `chrome.storage.sync` which hot-reloads within the content scripts.

## 🛠 Engineering Decisions
- **TypeScript & Vite**: Strict typing for robustness and Vite/CRXJS for a fast, modern build pipeline producing a Manifest V3 extension.
- **Debounced Rendering**: Layout thrashing is eliminated by debouncing DOM scans to 120ms intervals.
- **`requestAnimationFrame`**: Dragging and scrolling use `rAF` to guarantee smooth, 60fps movement.
- **Reduced Motion Support**: Listens to `@media (prefers-reduced-motion: reduce)` to disable transitions for accessibility.

## 🚀 Scalability
Adding a new AI platform takes ~20 lines of code by adding a new adapter class in `Platforms.ts` and wiring it into `main.ts`.
