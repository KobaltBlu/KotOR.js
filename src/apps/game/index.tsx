import React from "react";
import ReactDOM from "react-dom/client";

import { registerElectronLoadingErrorHandler } from "../common/electronLoadingErrorHandler";

import { GameApp } from "./app";
import { AppProvider } from "./context/AppContext";
import * as KotOR from "./KotOR";

import './app.scss';

registerElectronLoadingErrorHandler();

window.addEventListener('beforeunload', (e) => {
  try {
    KotOR.GameState.Debugger.close();
  } catch (e) {
    console.error(e);
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
