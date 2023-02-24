import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
(window as any).monaco = monaco;
// const Jison = (window as any).Jison = require("jison").Jison;
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import 'bootstrap';
import './forge.scss';
import { AppProvider, useApp } from './context/AppContext';
import * as KotOR from "./KotOR";
import { App } from './App';

const query = new URLSearchParams(window.location.search);

switch(query.get('key')){ 
  case 'kotor':
  case 'tsl':

  break;
  default:
    query.set('key', 'kotor');
  break;
}

const loadReactApplication = () => {
  const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
  ( async () => {
    root.render(
      // <React.StrictMode>
        <AppProvider>
          <App />
        </AppProvider>
      // </React.StrictMode>
    );
  })();
}

const loadJQueryApplication = () => {

};

( async () => {
  await KotOR.ConfigClient.Init();
  const getProfile = () => {
    return KotOR.ConfigClient.get(`Profiles.${query.get('key')}`);
  }
  
  KotOR.ApplicationProfile.InitEnvironment(getProfile());

  document.body.classList.add(KotOR.ApplicationProfile.GameKey);
  loadReactApplication();
})();
