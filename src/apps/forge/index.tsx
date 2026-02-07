import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
declare global {
  interface Window {
    monaco?: typeof monaco;
  }
}
(window as Window & { monaco: typeof monaco }).monaco = monaco;
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import 'bootstrap';
import './app.scss';
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

( async () => {
  try {
    await KotOR.ConfigClient.Init();
    const getProfile = () => KotOR.ConfigClient.get(`Profiles.${query.get('key')}`);
    KotOR.ApplicationProfile.InitEnvironment(getProfile());
    document.body.classList.add(KotOR.ApplicationProfile.GameKey ?? 'kotor');
  } catch (e) {
    console.error('Forge init error, starting with defaults', e);
    document.body.classList.add('kotor');
  } finally {
    loadReactApplication();
  }
})();

const plChangeCallback = (_e: Event): void => {
  if(document.pointerLockElement instanceof HTMLCanvasElement) {
    document.body.addEventListener("mousemove", plMouseMove, true);
    KotOR.Mouse.Dragging = true;
  } else {
    document.body.removeEventListener("mousemove", plMouseMove, true);
    KotOR.Mouse.Dragging = false;
  }
};

const plMouseMove = (event: MouseEvent): void => {
  if(!KotOR.Mouse.Dragging) return;
  const moveX = event.movementX ?? 0;
  const moveY = event.movementY ?? 0;
  if(moveX === 0 && moveY === 0) return;
  const range = 1000;
  if(moveX > -range && moveX < range){
    KotOR.Mouse.OffsetX = moveX;
  } else {
    console.log('x', moveX);
  }
  if(moveY > -range && moveY < range){
    KotOR.Mouse.OffsetY = moveY * -1.0;
  } else {
    console.log('y', moveY);
  }
};

document.addEventListener('pointerlockchange', plChangeCallback, true);
document.addEventListener('pointerlockerror', (e) => {
  console.error(e);
}, true);
