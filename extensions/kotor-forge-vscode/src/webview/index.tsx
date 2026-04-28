import React from 'react';
import { createRoot } from 'react-dom/client';

import * as KotOR from '@kotor/KotOR';
import { createScopedLogger, LogScope } from '@kotor/utility/Logger';

import { WebviewApp } from './WebviewApp';

// Import Bootstrap CSS for UI styling
import 'bootstrap/dist/css/bootstrap.min.css';

const log = createScopedLogger(LogScope.Webview);

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
  log.trace('index.tsx mount container found, creating root');
  const root = createRoot(container);
  (async () => {
    try {
      log.trace('KotOR.ConfigClient.Init() starting');
      await KotOR.ConfigClient.Init();
      log.trace('KotOR.ApplicationProfile.InitEnvironment()');
      KotOR.ApplicationProfile.InitEnvironment(() => ({
        key: 'kotor',
        directory: '',
        background: '',
        logo: '',
        launch: { type: 'webview', path: '' }
      }));
      document.body.classList.add('kotor');
      log.info('KotOR webview init completed; waiting for init message from extension');
    } catch (e) {
      log.warn('KotOR webview init warning', e);
    }
    log.trace('Rendering WebviewApp (will register bridge handlers and notifyReady)');
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
    log.trace('WebviewApp rendered; on init message tab will be created and editor shown');
  })();
} else {
  log.error('Root element #root not found');
}
