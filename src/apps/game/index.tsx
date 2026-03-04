import React from "react";
import ReactDOM from "react-dom/client";

import { GameApp } from "@/apps/game/app";
import { AppProvider } from "@/apps/game/context/AppContext";
import * as KotOR from "@/apps/game/KotOR";
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
    const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
    root.render(
      <AppProvider>
        <GameApp />
      </AppProvider>
    );
  })();
});
