import React from 'react';
import { createRoot } from 'react-dom/client';
import WebviewApp from './WebviewApp';

// Import Bootstrap CSS for UI styling
import 'bootstrap/dist/css/bootstrap.min.css';

// Global styles for the webview
const globalStyles = `
  * {
    box-sizing: border-box;
  }

  html, body, #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 13px;
    line-height: 1.5;
    color: var(--vscode-foreground);
    background-color: var(--vscode-editor-background);
  }

  /* VS Code color variables */
  :root {
    --vscode-foreground: var(--vscode-editor-foreground, #cccccc);
    --vscode-background: var(--vscode-editor-background, #1e1e1e);
  }

  /* Scrollbar styles */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: var(--vscode-scrollbarSlider-background);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--vscode-scrollbarSlider-hoverBackground);
    border-radius: 5px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--vscode-scrollbarSlider-activeBackground);
  }
`;

// Inject global styles
const styleElement = document.createElement('style');
styleElement.textContent = globalStyles;
document.head.appendChild(styleElement);

// Mount the React application
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <WebviewApp />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
