import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";

import { BrowserWindow, shell } from "electron";

import Main from "@/electron/Main";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Launcher);

export class LauncherWindow {

  browserWindow?: BrowserWindow;

  constructor(){
    log.trace('LauncherWindow constructor enter');
    if(this.browserWindow instanceof BrowserWindow){
      log.debug('LauncherWindow already exists, showing');
      this.browserWindow.show();
      this.browserWindow.focus();
      return;
    }

    const preloadPath = path.join(Main.ApplicationPath, 'dist', 'electron', 'preload.js');
    const launcherHtmlPath = path.join(Main.ApplicationPath, 'dist', 'launcher', 'index.html');
    if (!fs.existsSync(launcherHtmlPath)) {
      log.error('Launcher HTML missing. Run webpack first: npm run webpack:prod or npm run webpack:dev', launcherHtmlPath);
    }
    if (!fs.existsSync(preloadPath)) {
      log.error('Preload script missing', preloadPath);
    }
    const launcherUrl = pathToFileURL(launcherHtmlPath).href;
    log.info('Launcher paths', { preloadPath, launcherHtmlPath, launcherUrl, appPath: Main.ApplicationPath });

    // Create the browser window.
    this.browserWindow = new BrowserWindow({
      width: 1200,
      height: 600,
      minHeight: 600,
      minWidth: 1000,
      frame: false,
      title: 'KotOR Launcher',
      transparent: true,
      backgroundColor: '#00FFFFFF',
      webPreferences: {
        preload: preloadPath,
        webviewTag: false,
        nodeIntegration: true,
        contextIsolation: true,
        sandbox: false,
      }
    });

    this.browserWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      log.error('Launcher did-fail-load', { errorCode, errorDescription, validatedURL });
    });
    this.browserWindow.webContents.on('did-finish-load', () => {
      log.info('Launcher did-finish-load', this.browserWindow?.webContents.getURL());
    });

    log.trace('Loading launcher URL', launcherUrl);
    this.browserWindow.loadURL(launcherUrl);
    this.browserWindow.on('ready-to-show', () => {
      log.info('Launcher ready-to-show');
      if(!this.browserWindow) { return; }
      this.browserWindow.webContents.setWindowOpenHandler((details) => {
        log.info('setWindowOpenHandler', details);
        if(details.frameName == '_new' || details.url.indexOf('https://') >= 0){
          shell.openExternal(details.url);
          return { action: 'deny' };
        }
        return { action: 'allow' };
      })
    });

    this.browserWindow.on('closed', () => {
      log.trace('Launcher window closed');
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      // this.browserWindow = undefined;
    });

    this.browserWindow.on('minimize', () => {
      log.trace('Launcher minimize');
      if(this.browserWindow) this.browserWindow.hide();
    });

    this.browserWindow.on('close', () => {
      log.trace('Launcher close');
      /*if(!app.isQuiting){
        event.preventDefault();
        winLauncher.hide();
      }

      return false;*/
    });

    this.browserWindow.on('show', () => {
      log.trace('Launcher show');
    });

    this.browserWindow.on('hide', () => {
      log.trace('Launcher hide');
    });
    log.trace('LauncherWindow constructor exit');
  }

  toggleWindow(){
    if (this.browserWindow) {
      if (this.browserWindow.isVisible()) {
        this.browserWindow.hide();
      } else {
        this.browserWindow.show();
      }
    }
  }

  hide(){
    if(this.browserWindow) this.browserWindow.hide();
  }

  show(){
    if(this.browserWindow) this.browserWindow.show();
  }

  send(event: string, data: string | number | boolean | object) {
    if(this.browserWindow)
      this.browserWindow.webContents.send(event, data);
  }

}
