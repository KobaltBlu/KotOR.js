import ReactDOM from "react-dom/client";
import React from "react";
import * as KotOR from "@/apps/game/KotOR";
import { HotReloadManager } from "@/dev/HotReloadManager";
import { installHmrTestBridge } from "@/dev/HmrTestBridge";
import { HMR_PROBE } from "@/dev/HmrTestProbe";
import "@/apps/game/app.scss";

declare const module: {
  hot?: {
    accept: (dependencies?: string | string[], callback?: () => void) => void;
    dispose: (callback: () => void) => void;
    addStatusHandler: (callback: (status: string) => void) => void;
  };
};

declare global {
  interface Window {
    __KOTOR_GAME_REACT_ROOT__?: ReactDOM.Root;
    __KOTOR_GAME_BEFOREUNLOAD__?: boolean;
    __KOTOR_HMR_STATUS_HANDLER__?: boolean;
    __KOTOR_HMR_PROBE_VALUE__?: number;
  }
}

if (!window.__KOTOR_GAME_BEFOREUNLOAD__) {
  window.__KOTOR_GAME_BEFOREUNLOAD__ = true;
  window.addEventListener('beforeunload', () => {
    try {
      KotOR.GameState.Debugger.close();
    } catch (e) {
      console.error(e);
    }
  });
}

function getOrCreateReactRoot(rootElement: HTMLElement): ReactDOM.Root {
  if (!window.__KOTOR_GAME_REACT_ROOT__) {
    window.__KOTOR_GAME_REACT_ROOT__ = ReactDOM.createRoot(rootElement);
  }
  return window.__KOTOR_GAME_REACT_ROOT__;
}

function mountApp(): void {
  const rootElement = document.getElementById("root") as HTMLElement | null;
  if (!rootElement) {
    return;
  }

  const reactRoot = getOrCreateReactRoot(rootElement);
  const { AppProvider } = require('@/apps/game/context/AppContext') as typeof import('@/apps/game/context/AppContext');
  const { GameApp } = require('@/apps/game/app') as typeof import('@/apps/game/app');

  reactRoot.render(
    <AppProvider>
      <GameApp />
    </AppProvider>
  );
}

/** Game UI modules whose updates remount React while GameState stays live. */
const UI_HMR_BOUNDARIES = [
  '@/apps/game/app',
  '@/apps/game/context/AppContext',
] as const;

function onUiHotApplied(): void {
  try {
    console.log('[HMR] Game UI module updated — remounting while preserving session');
    HotReloadManager.onHotAccept();
    installHmrTestBridge();
    mountApp();
  } catch (e) {
    console.error('[HMR] UI hot accept failed — session preserved, skipping remount', e);
  }
}

function onProbeHotApplied(): void {
  try {
    console.log('[HMR] Game client probe updated — preserving session');
    HotReloadManager.onHotAccept();
    window.__KOTOR_HMR_PROBE_VALUE__ = require('@/dev/HmrTestProbe').HMR_PROBE as number;
    installHmrTestBridge();
  } catch (e) {
    console.error('[HMR] Probe hot accept failed', e);
  }
}

function bootstrap(): void {
  window.__KOTOR_HMR_PROBE_VALUE__ = HMR_PROBE;
  installHmrTestBridge();
  mountApp();
}

window.addEventListener('DOMContentLoaded', () => {
  void (async () => {
    // Activate dev FS before React bootstrap so GameFileSystem never hits FS Access first.
    const { probeDevGameFileBackend } = await import('@/dev/DevGameFileBackend');
    await probeDevGameFileBackend();
    bootstrap();
  })();
});

if (typeof module !== 'undefined' && module.hot) {
  module.hot.dispose(() => {
    HotReloadManager.preserveSession();
  });

  if (!window.__KOTOR_HMR_STATUS_HANDLER__) {
    window.__KOTOR_HMR_STATUS_HANDLER__ = true;
    module.hot.addStatusHandler((status) => {
      if (status === 'abort' || status === 'fail') {
        if (KotOR.GameState.hmrIsSessionActive()) {
          console.warn('[HMR] Hot update failed — keeping live in-game session (no reload)');
          return;
        }
        console.warn('[HMR] Hot update failed — performing full reload');
        window.location.reload();
      }
    });
  }

  module.hot.accept([...UI_HMR_BOUNDARIES], () => {
    onUiHotApplied();
  });

  module.hot.accept(['@/dev/HmrTestProbe'], () => {
    onProbeHotApplied();
  });

  // Entry boundary: index.tsx / app.scss edits remount without full page reload.
  module.hot.accept(() => {
    onUiHotApplied();
  });
}
