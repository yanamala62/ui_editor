# UI Observer and Live Editor Platform - Implementation Plan

## 1. Project Overview
The goal is to build an advanced desktop application (using Electron, React, Node.js, and Playwright) that allows developers to run their local web applications, visually observe and inspect UI elements, map them to their exact source code locations, and perform live edits that automatically update the original repository files using AST parsing.

## 2. Current Progress (What is implemented so far)
Based on the current codebase, we have successfully laid the foundation:
- **Monorepo Architecture**: Setup with `client` (React UI), `server` (Express), and `electron` packages.
- **Feature 1 (Repository Configuration)**: The React dashboard allows users to configure the repository path, application URL, and framework. These settings are validated and persisted locally.
- **Feature 2 (Observer Browser)**: Electron launches a Playwright-controlled Chromium browser to load the target local application.
- **Feature 3 (UI Element Detection - Partial)**: An injected `observer.js` script successfully detects `click` and `mouseover` events, highlighting elements and calculating basic attributes, CSS selectors, and XPaths.
- **Feature 13 (Logging System - Partial)**: Real-time interactions are streamed back to the Electron main process and displayed beautifully in the React Console/Dashboard.

**What is missing:** The core "magic" features – React source code mapping (Fiber tree inspection), the floating visual editor, and AST-based live file editing.

## 3. Implementation Phases

We will divide the remaining work into structured phases to ensure stability.

### Phase 1: Foundation & Basic Observation (Mostly Completed)
- [x] Electron, React, Node boilerplate.
- [x] IPC communication setup.
- [x] Basic Playwright browser injection.
- [x] DOM element interaction tracking (selectors, text, xpath).
- [x] UI Dashboard for logs and settings.

### Phase 2: Source Code Mapping & Advanced Overlays (Next Step)
**Goal:** Bridge the gap between the DOM element in the browser and the exact line of code in the user's local repository.
- **Feature 5 & 6 (React Source Detection):** Enhance the injected Playwright script to hook into `__REACT_DEVTOOLS_GLOBAL_HOOK__`. This will allow us to traverse the React Fiber tree, match the clicked DOM node to its React Component, and extract the `_debugSource` (file path, line number).
- **Feature 9 (Element Overlay System):** Upgrade the hover highlight to display a floating tooltip showing the Component Name and Source File.
- **IPC Enhancements:** Send the matched source file information back to the Electron application.

### Phase 3: Floating Editor & AST File Modification
**Goal:** Allow users to visually edit properties and save changes directly to the source code without breaking formatting.
- **Feature 4 (Floating Inline Editor):** Build a React-based floating popup that appears when an element is clicked. It will parse the component's props/styles and present input fields (e.g., text, color, padding).
- **Feature 10 (Monaco Editor):** Embed Monaco in the popup for an "Advanced Source Mode" allowing direct JSX/Tailwind editing.
- **Feature 7 (Live File Editing):** Implement an AST Engine in the Node/Electron backend. When the user saves an edit from the popup, the backend will use `@babel/parser` and `recast` to read the exact file, find the JSX node at the specified line, apply the changes, and write back to the file while preserving the original code formatting.
- **Feature 12 (File Watching):** Integrate `chokidar` to watch the repository for external changes and keep our platform in sync.

### Phase 4: AI Layer & Polish
**Goal:** Add intelligent suggestions and advanced developer tools.
- **Feature 14 (AI Assistant):** Integrate an AI service (e.g., OpenAI/Gemini via Python or Node) to suggest UI improvements or Tailwind class fixes directly in the floating editor.
- **Feature 20 (Export & Code Gen):** Generate Playwright/Cypress test scripts based on the recorded user journey.
- **Security & Hardening (Feature 19):** Ensure all IPC calls are secure and local file system access is strictly validated.

## 4. Technical Strategy for Complex Features

### React Fiber Integration (Phase 2)
To find the source file, our injected script must load *before* the React app initializes. We will define `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` so React registers its renderer with us. When an element is clicked, we use a DOM node property (like `__reactFiber$xyz`) to find the Fiber node, walk up the tree to find the nearest functional/class component, and read its `_debugSource`.

### AST Editing Engine (Phase 3)
String replacement is dangerous. We will use AST (Abstract Syntax Tree) manipulation.
1. The frontend sends an "edit request": `{ file: "src/Button.jsx", line: 15, updates: { text: "Login" } }`.
2. The Electron backend uses `fs.readFileSync`.
3. `recast.parse()` generates an AST.
4. `@babel/traverse` walks the AST to find the JSX element on `line: 15`.
5. We modify the AST node's properties (e.g., changing the children text or adding a className).
6. `recast.print()` converts the AST back to code, preserving original spaces, quotes, and comments.
7. `fs.writeFileSync` saves the file. The local dev server's Hot Module Replacement (HMR) will automatically refresh the app in the observer browser.
