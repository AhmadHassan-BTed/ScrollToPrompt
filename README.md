# ScrollToPrompt

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

ScrollToPrompt is a browser extension that visualizes the location of your prompts in AI chat interfaces like ChatGPT, Claude, and Gemini. It adds interactive markers to the scrollbar area, allowing you to jump back to any of your messages instantly.


## Features
- **Visual Markers**: Small, colored dots on a custom scrollbar overlay representing your prompts.
- **Click to Navigate**: Clicking a marker smoothly scrolls the corresponding prompt into view.
- **Platform Support**:
  - ChatGPT (`chatgpt.com`)
  - Claude (`claude.ai`)
  - Gemini (`gemini.google.com`)
- **Theme Aware**: Automatically adjusts for light and dark modes.

## Installation (Development Mode)
1. Clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the root directory of this repository.

## Project Structure
- `manifest.json`: Extension configuration.
- `src/content/`: Main logic and styles for chat pages.
- `src/popup/`: Extension popup UI.
- `docs/`: [Architecture](docs/architecture.md) and design documentation.
- `.github/`: Issue and Pull Request templates.

## Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**. 

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
Distributed under the MIT License. See `LICENSE` for more information.

