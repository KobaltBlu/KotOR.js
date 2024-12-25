import { BrowserWindow } from "electron";
import * as path from "path";
import { WindowManager } from "./WindowManager";
import Main from "./Main";

export class ApplicationWindow {

  browserWindow: BrowserWindow;
  profile: any;

  constructor(profile: any = {}){
    // Create the browser window.
    this.browserWindow = new BrowserWindow({
      width: profile.width ? profile.width : 1200, 
      height: profile.height ? profile.height : 600,
      fullscreen: profile.settings?.fullscreen.value != undefined ? profile.settings?.fullscreen.value : profile.settings?.fullscreen.defaultValue,
      frame: !profile.launch.frameless,
      title: profile.name,
      backgroundColor: profile.launch.backgroundColor,
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
    if(typeof profile.launch.args === 'object'){
      queryString = new URLSearchParams(
        Object.keys(profile.launch.args)
        .map( key => key + '=' + profile.launch.args[key] )
        .join('&')
      );
    }

    queryString.set('key', profile.key);

    // and load the index.html of the app.
    this.browserWindow.loadURL(`file://${Main.ApplicationPath}/dist/${profile.launch.path}?${queryString.toString()}`);
    this.browserWindow.setMenuBarVisibility(false);

    // Emitted when the window is closed.
    this.browserWindow.on('closed', (event) => {
      event.preventDefault();
      WindowManager.createLauncherWindow();
      WindowManager.removeWindow(this);
    });

    this.browserWindow.webContents.on("did-create-window", (window, details) => {
      if(details.url.indexOf(`debugger/index.html`) !== -1){
        // window.webContents.once("dom-ready", () => window.webContents.openDevTools());
        console.log('Debugger: Launched!');
      }
    });

    this.browserWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.indexOf(`debugger/index.html`) !== -1) {
        console.log('Debugger: Launching...');
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
  
  send(event: string, data: any) {
    if(this.browserWindow)
      this.browserWindow.webContents.send(event, data);
  }

}
