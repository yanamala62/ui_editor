# Observer Screen Application

This is a full-stack desktop application for observing user interactions on web pages. It uses Electron, React, and Playwright to capture and log events from any website.

## How to Run

### 1. Install Dependencies

This command will install all the necessary dependencies for the `client`, `server`, and `electron` packages from the root directory. You only need to run this once.

```bash
npm install
```

### 2. Run in Development Mode

This command starts all parts of the application concurrently.

```bash
npm run dev
```

This single command will perform the following actions:
-   Start the React development server for the control panel UI.
-   Start the backend Express server.
-   Launch the Electron application, which opens the "Observer Control Panel" window and waits for the UI to load.

## How to Use the Application

1.  Once the application is running, the **Observer Control Panel** window will appear.
2.  Enter a URL into the input field (a default value like `https://www.google.com` is provided).
3.  Click the **Start** button.
4.  A new, separate browser window will open, navigated to the URL you provided. This is the window being observed.
5.  Click on any element (buttons, links, images, etc.) in the new browser window.
6.  Return to the main **Observer Control Panel** window to see the details of your interactions logged in the **Event Log** panel in real-time.
