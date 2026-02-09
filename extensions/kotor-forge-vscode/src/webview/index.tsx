import React from 'react';
import { createRoot } from 'react-dom/client';

import * as KotOR from '@kotor/KotOR';

import { WebviewApp } from './WebviewApp';

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

const LOG_PREFIX = '[Webview]';

// Tell the host boot script that the bundle started executing.
declare global {
  interface Window {
    __FORGE_WEBVIEW_LOADED__?: boolean;
    __FORGE_BOOT_REMOVE_FALLBACK__?: () => void;
  }
}
window.__FORGE_WEBVIEW_LOADED__ = true;

const container = document.getElementById('root');
if (container) {
  if (typeof console !== 'undefined' && console.debug) {
    console.debug(`${LOG_PREFIX} [trace] index.tsx mount container found, creating root`);
  }
  const root = createRoot(container);
  (async () => {
    try {
      if (typeof console !== 'undefined' && console.debug) {
        console.debug(`${LOG_PREFIX} [trace] KotOR.ConfigClient.Init() starting`);
      }
      await KotOR.ConfigClient.Init();
      KotOR.ApplicationProfile.InitEnvironment(() => ({
        key: 'kotor',
        directory: '',
        background: '',
        logo: '',
        launch: { type: 'webview', path: '' }
      }));
      document.body.classList.add('kotor');
      if (typeof console !== 'undefined' && console.info) {
        console.info(`${LOG_PREFIX} [info] KotOR webview init completed successfully`);
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`${LOG_PREFIX} [warn] KotOR webview init warning`, e);
      }
    }
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`${LOG_PREFIX} [trace] Rendering WebviewApp`);
    }
    root.render(
      <React.StrictMode>
        <WebviewApp />
      </React.StrictMode>
    );
    // Remove the host-provided fallback overlay once React has rendered.
    try {
      window.__FORGE_BOOT_REMOVE_FALLBACK__?.();
    } catch {
      // ignore
    }
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`${LOG_PREFIX} [trace] WebviewApp rendered`);
    }
  })();
} else {
  if (typeof console !== 'undefined' && console.error) {
    console.error(`${LOG_PREFIX} [error] Root element #root not found`);
  }
}
