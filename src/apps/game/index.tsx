import ReactDOM from "react-dom/client";
import React from "react";
import * as KotOR from "./KotOR";
import { AppProvider } from "./context/AppContext";
import { LoadingConsoleProvider } from "./context/LoadingConsoleProvider";
import { GameApp } from "./app";
import './app.scss';

window.addEventListener('beforeunload', (e) => {
  try{
    KotOR.GameState.Debugger.close();
  }catch(e){
    console.error(e);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  ( async () => {
    const container = document.getElementById("root");
    if (!container) {
      console.error("[Game] Root element #root not found; cannot mount React app.");
      return;
    }
    const root = ReactDOM.createRoot(container);
    root.render(
      <LoadingConsoleProvider>
        <AppProvider>
          <GameApp />
        </AppProvider>
      </LoadingConsoleProvider>
    );
  })();
});
