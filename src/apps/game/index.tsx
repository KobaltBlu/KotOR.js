import React from "react";
import ReactDOM from "react-dom/client";


import { registerElectronLoadingErrorHandler } from "@/apps/common/electronLoadingErrorHandler";
import { GameApp } from "@/apps/game/app";
import { AppProvider } from "@/apps/game/context/AppContext";
import * as KotOR from "@/apps/game/KotOR";
import { createScopedLogger, LogScope } from "@/utility/Logger";

import "@/apps/game/app.scss";

const log = createScopedLogger(LogScope.Game);

registerElectronLoadingErrorHandler();

window.addEventListener('beforeunload', (_e) => {
  try {
    KotOR.GameState.Debugger.close();
  } catch (err) {
    log.error('beforeunload Debugger.close', err);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  (async () => {
    const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
    root.render(
      <AppProvider>
        <GameApp />
      </AppProvider>
    );
  })();
});
