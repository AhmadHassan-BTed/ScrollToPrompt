# Architecture Guide

This document describes the architectural patterns and design decisions behind **ScrollToPrompt**.

## Core Philosophy
The extension is designed to be **unobtrusive, performant, and modular**. We prioritize a "zero-coupling" approach where the core engine doesn't need to know the details of the page it's running on.

## 🧱 Component Architecture

### 1. The Engine (`src/core/Engine.ts`)
The `ScrollToPromptEngine` is the orchestrator. Its responsibilities include:
- **Initialization**: Bootstrapping the extension for a specific platform.
- **Observation**: Monitoring the DOM for changes using `MutationObserver`.
- **Coordination**: Fetching prompts from the adapter and passing them to the UI layer.

### 2. Site Adapters (`src/adapters/`)
We use the **Adapter Pattern** to abstract site-specific DOM logic. Each adapter implements the `SiteAdapter` interface:
```typescript
interface SiteAdapter {
  platform: string;
  getPrompts(): HTMLElement[];
  getScrollContainer(): HTMLElement;
}
```
This allows us to add support for new sites (e.g., Poe, Perplexity) by creating a new adapter without touching the core engine logic.

### 3. UI Component (`src/components/MarkerUI.ts`)
To prevent the host page's CSS from breaking our markers (and vice versa), we use **Shadow DOM**.
- **Isolation**: All styles are encapsulated within the shadow root.
- **Efficiency**: The UI component minimizes layout thrashing by updating markers in a batch.

## 🔄 Data Flow
1. **Bootstrap**: `main.ts` detects the host and instantiates the correct `SiteAdapter`.
2. **Detection**: `Engine` calls `adapter.getPrompts()` to find all user messages.
3. **Mapping**: `Engine` calculates the vertical percentage of each prompt relative to the total scroll height.
4. **Rendering**: `MarkerUI` renders the markers as absolute-positioned elements on the track.

## 🛠 Engineering Practices
- **TypeScript**: Ensuring type safety across the board.
- **Vite + CRXJS**: Modern build pipeline for fast HMR and optimized production bundles.
- **Shadow DOM**: Strong encapsulation for the UI layer.
- **MutationObserver**: Event-driven UI updates instead of expensive polling.

## 🚀 Scaling Strategy
As we add more platforms, the `adapters` directory will grow, but the core engine will remain lightweight. In the future, a **Plugin System** could allow users to define their own detectors for unsupported sites.
