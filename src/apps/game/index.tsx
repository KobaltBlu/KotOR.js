import ReactDOM from "react-dom/client";
import React from "react";
import * as KotOR from "@/apps/game/KotOR";
import { AppProvider } from "@/apps/game/context/AppContext";
import { GameApp } from "@/apps/game/app";
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

  reactRoot.render(
    <AppProvider>
      <GameApp />
    </AppProvider>
  );
}

function onProbeHotApplied(): void {
  console.log('[HMR] Game client module updated — preserving session');
  HotReloadManager.onHotAccept();
  window.__KOTOR_HMR_PROBE_VALUE__ = require('@/dev/HmrTestProbe').HMR_PROBE as number;
  installHmrTestBridge();
}

function bootstrap(): void {
  window.__KOTOR_HMR_PROBE_VALUE__ = HMR_PROBE;
  installHmrTestBridge();
  mountApp();
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrap();
});

if (typeof module !== 'undefined' && module.hot) {
  module.hot.dispose(() => {
    HotReloadManager.preserveSession();
  });

  if (!window.__KOTOR_HMR_STATUS_HANDLER__) {
    window.__KOTOR_HMR_STATUS_HANDLER__ = true;
    module.hot.addStatusHandler((status) => {
      if (status === 'abort' || status === 'fail') {
        console.warn('[HMR] Hot update failed — performing full reload');
        window.location.reload();
      }
    });
  }

  module.hot.accept(['@/dev/HmrTestProbe'], () => {
    onProbeHotApplied();
  });
}
