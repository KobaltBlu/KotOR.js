import React from "react";
import ReactDOM from "react-dom/client";

import "@/apps/debugger/app.scss";
import { App } from "@/apps/debugger/App";
import { AppProvider } from "@/apps/debugger/context/AppContext";
import { DebugApp } from "@/apps/debugger/DebugApp";
import { DebuggerState } from "@/apps/debugger/states/DebuggerState";

const params = new URLSearchParams(window.location.search);
const uuid = params.get('uuid');
if(!uuid) throw new Error('UUID is required');

const appState = new DebuggerState(uuid);
DebugApp.appState = appState;
// @ts-expect-error - Debugger host exposes appState on window for devtools
window.appState = DebugApp.appState;

const loadReactApplication = () => {
  const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
  ( async () => {
    root.render(
      // <React.StrictMode>
        <AppProvider appState={DebugApp.appState}>
          <App />
        </AppProvider>
      // </React.StrictMode>
    );
  })();
}

( async () => {
  loadReactApplication();
})();
