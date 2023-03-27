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
      }
    });
    
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

    WindowManager.hideLauncher();
    WindowManager.addWindow(this);
  }
  
  send(event: string, data: any) {
    if(this.browserWindow)
      this.browserWindow.webContents.send(event, data);
  }

}
