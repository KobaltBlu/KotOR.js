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

const plChangeCallback = (e: any) => {
  // document.pointerLockElement = this.element;
  // console.log('ModelViewerControls', e);
  if(document.pointerLockElement instanceof HTMLCanvasElement) {
    //console.log('The pointer lock status is now locked');
    document.body.addEventListener("mousemove", plMouseMove, true);
    KotOR.Mouse.Dragging = true;
  } else {
    //console.log('The pointer lock status is now unlocked');
    document.body.removeEventListener("mousemove", plMouseMove, true);
    //this.plMoveEvent = undefined;
    KotOR.Mouse.Dragging = false;
    //document.removeEventListener('pointerlockchange', this.plEvent, true);
  }
}

const plMouseMove = (event: any) => {
  if(KotOR.Mouse.Dragging && (event.movementX || event.movementY)){
    let range = 1000;
    //console.log(event.movementX, event.movementY);
    if(event.movementX > -range && event.movementX < range){
      KotOR.Mouse.OffsetX = event.movementX || 0;
    }else{console.log('x', event.movementX)}
    if(event.movementY > -range && event.movementY < range){
      KotOR.Mouse.OffsetY = (event.movementY || 0)*-1.0;
    }else{console.log('y', event.movementY)}
  }
}

document.addEventListener('pointerlockchange', plChangeCallback, true);
document.addEventListener('pointerlockerror', (e) => {
  console.error(e);
}, true);
