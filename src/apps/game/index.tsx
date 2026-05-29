import ReactDOM from "react-dom/client";
import React from "react";
import * as KotOR from "@/apps/game/KotOR";
import { AppProvider } from "@/apps/game/context/AppContext";
import { GameApp } from "@/apps/game/app";
import { HotReloadManager } from "@/dev/HotReloadManager";
import "@/apps/game/app.scss";

declare const module: {
  hot?: {
    accept: (dependencies?: string | string[], callback?: () => void) => void;
    dispose: (callback: () => void) => void;
  };
};

let reactRoot: ReactDOM.Root | null = null;

window.addEventListener('beforeunload', () => {
  try {
    KotOR.GameState.Debugger.close();
  } catch (e) {
    console.error(e);
  }
});

function mountApp(): void {
  const rootElement = document.getElementById("root") as HTMLElement | null;
  if (!rootElement) {
    return;
  }

  if (!reactRoot) {
    reactRoot = ReactDOM.createRoot(rootElement);
  }

  reactRoot.render(
    <AppProvider>
      <GameApp />
    </AppProvider>
  );
}

function bootstrap(): void {
  mountApp();
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrap();
});

if (typeof module !== 'undefined' && module.hot) {
  module.hot.dispose(() => {
    HotReloadManager.preserveSession();
  });

  module.hot.accept(() => {
    console.log('[HMR] Game client module updated — preserving session');
    HotReloadManager.onHotAccept();
    mountApp();
  });
}
