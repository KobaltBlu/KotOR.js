import * as path from "path";

import { BrowserWindow } from "electron";

import { createScopedLogger, LogScope } from "../utility/Logger";

import Main from "./Main";
import { WindowManager } from "./WindowManager";

const log = createScopedLogger(LogScope.Debug);

/** Profile shape for creating an application window (width, height, launch, etc.). */
export interface ApplicationWindowProfile {
  key?: string;
  width?: number;
  height?: number;
  name?: string;
  settings?: { fullscreen?: { value?: boolean; defaultValue?: boolean } };
  launch?: { frameless?: boolean; backgroundColor?: string; args?: Record<string, string>; path?: string };
}

export class ApplicationWindow {

  browserWindow: BrowserWindow;
  profile: ApplicationWindowProfile;

  constructor(profile: ApplicationWindowProfile = {}){
    // Create the browser window.
    this.browserWindow = new BrowserWindow({
      width: profile.width ? profile.width : 1200,
      height: profile.height ? profile.height : 600,
      fullscreen: profile.settings?.fullscreen?.value != undefined ? profile.settings?.fullscreen?.value : profile.settings?.fullscreen?.defaultValue,
      frame: !profile.launch?.frameless,
      title: profile.name,
      backgroundColor: profile.launch?.backgroundColor,
      autoHideMenuBar: false,
      webPreferences: {
        preload: path.join(Main.ApplicationPath, 'dist/electron/preload.js'),
        webviewTag: false,
        nodeIntegration: false,
        // enableRemoteModule: false,
        //worldSafeExecuteJavaScript: true,
        contextIsolation: true,
        sandbox: false,
        experimentalFeatures: true,
      }
    });

    // Enable SharedArrayBuffer
    // this.browserWindow.webContents.session.webRequest.onHeadersReceived(
    //   (details, callback) => {
    //     if(!details.responseHeaders) details.responseHeaders = {};
    //     details.responseHeaders['Cross-Origin-Opener-Policy'] = ['same-origin'];
    //     details.responseHeaders['Cross-Origin-Embedder-Policy'] = ['require-corp'];
    //     callback({ responseHeaders: details.responseHeaders });
    //   }
    // );

    this.profile = profile;

    let queryString = new URLSearchParams();
    if(typeof profile.launch?.args === 'object' && profile.launch.args){
      queryString = new URLSearchParams(
        Object.keys(profile.launch.args)
        .map( key => key + '=' + (profile.launch?.args?.[key] ?? '') )
        .join('&')
      );
    }

    if(profile.key != null) queryString.set('key', profile.key);

    // and load the index.html of the app.
    this.browserWindow.loadURL(`file://${Main.ApplicationPath}/dist/${profile.launch?.path ?? ''}?${queryString.toString()}`);
    this.browserWindow.setMenuBarVisibility(false);

    // Emitted when the window is closed.
    this.browserWindow.on('closed', () => {
      WindowManager.createLauncherWindow();
      WindowManager.removeWindow(this);
    });

    this.browserWindow.webContents.on("did-create-window", (_window, details) => {
      if(details.url.indexOf(`debugger/index.html`) !== -1){
        log.info('Debugger: Launched!');
      }
    });

    this.browserWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.indexOf(`debugger/index.html`) !== -1) {
        log.debug('Debugger: Launching...');
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            frame: true,
            fullscreenable: false,
            backgroundColor: 'black',
            webPreferences: {
              preload: path.join(Main.ApplicationPath, 'dist/electron/preload.js'),
              devTools: true,
            }
          }
        }
      }
      return { action: 'deny' }
    })

    WindowManager.hideLauncher();
    WindowManager.addWindow(this);
  }

  send(event: string, data: string | number | boolean | object) {
    if(this.browserWindow)
      this.browserWindow.webContents.send(event, data);
  }

}
