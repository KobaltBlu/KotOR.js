import { BrowserWindow } from "electron";
import * as path from "path";
import Main from "./Main";

export class LauncherWindow {

  browserWindow?: BrowserWindow;

  constructor(){
    if(this.browserWindow instanceof BrowserWindow){
      this.browserWindow.show();
      this.browserWindow.focus();
      return;
    }
    
    // Create the browser window.
    this.browserWindow = new BrowserWindow({
      width: 1200, 
      height: 600, 
      minHeight: 600,
      minWidth: 1000,
      frame: false,
      title: 'KotOR Launcher',
      backgroundColor: "#000000",
      webPreferences: {
        preload: path.join(Main.ApplicationPath, 'dist/electron/preload.js'),
        webviewTag: false,
        nodeIntegration: true,
        // enableRemoteModule: false,
        //worldSafeExecuteJavaScript: true,
        contextIsolation: true,
        sandbox: false,
      }
    });
    // and load the index.html of the app.
    this.browserWindow.loadURL(`file://${Main.ApplicationPath}/dist/launcher/index.html`);
    //this.browserWindow.openDevTools();
    //this.browserWindow.on('ready', () => {
      //this.browserWindow.webcontents.openDevTools();
    //})
  
    // Emitted when the window is closed.
    this.browserWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      // this.browserWindow = undefined;
    });
  
    this.browserWindow.on('minimize',(event) => {
      event.preventDefault();
      if(this.browserWindow) this.browserWindow.hide();
    });
  
    this.browserWindow.on('close', (event) => {
      /*if(!app.isQuiting){
        event.preventDefault();
        winLauncher.hide();
      }
  
      return false;*/
    });
    
    this.browserWindow.on('show', () => {
      //tray.setHighlightMode('always');
    });
  
    this.browserWindow.on('hide', () => {
      //tray.setHighlightMode('never');
    });
  }

  toggleWindow(){
    if(this.browserWindow)
      this.browserWindow.isVisible() ? 
        this.browserWindow.hide() : this.browserWindow.show();
  }

  hide(){
    if(this.browserWindow) this.browserWindow.hide();
  }

  show(){
    if(this.browserWindow) this.browserWindow.show();
  }

  send(event: string, data: any) {
    if(this.browserWindow)
      this.browserWindow.webContents.send(event, data);
  }

}
