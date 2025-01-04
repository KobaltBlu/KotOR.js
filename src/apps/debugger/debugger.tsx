import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AppProvider } from "./context/AppContext";
import { DebuggerState } from "./states/DebuggerState";

const params = new URLSearchParams(window.location.search);
const uuid = params.get('uuid');
if(!uuid) throw new Error('UUID is required');

const appState = new DebuggerState(uuid);
//@ts-ignore
window.appState = appState;

const loadReactApplication = () => {
  const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
  ( async () => {
    root.render(
      // <React.StrictMode>
        <AppProvider appState={appState}>
          <App />
        </AppProvider>
      // </React.StrictMode>
    );
  })();
}

( async () => {
  loadReactApplication();
})();