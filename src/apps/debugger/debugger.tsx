import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { IPCMessage } from "../../server/ipc/IPCMessage";
import { IPCMessageType } from "../../enums/server/IPCMessageType";
import { NWScriptInstance } from "../../nwscript/NWScriptInstance";
import { NWScript } from "../../nwscript/NWScript";
import * as KotOR from "./KotOR";
import { AppProvider } from "./context/AppContext";

const query = new URLSearchParams(window.location.search);
const channelUUID = query.get('uuid');

const channel = new BroadcastChannel(`debugger-${channelUUID}`);

window.onbeforeunload = () => {
  channel.postMessage('close');
  channel.close();
}

const loadReactApplication = () => {
  const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
  ( async () => {
    root.render(
      // <React.StrictMode>
        <AppProvider channel={channel}>
          <App />
        </AppProvider>
      // </React.StrictMode>
    );
  })();
}

( async () => {
  loadReactApplication();
})();
