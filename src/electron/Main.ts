import { Menu, Tray, globalShortcut, ipcMain } from 'electron';

import { WindowManager } from '@/electron/WindowManager';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Electron);

export default class Main {

  static application: Electron.App;
  static tray: Electron.Tray;
  static WindowManager: typeof WindowManager;
  static ApplicationPath: string;
  
  static setApplicationPath(path: string){
    Main.ApplicationPath = path;
  }
  
  private static onWindowAllClosed() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      Main.application.quit();
    }
  }

  private static onReady() {
    try{
      Main.tray = new Tray('dist/assets/icons/icon.png');
      const contextMenu = Menu.buildFromTemplate([{
        label: 'Exit', 
        type: 'normal', 
        click: (menuItem, browserWindow, event) => {
          Main.application.quit();
        }
      }]);
      Main.tray.setToolTip('KotOR Launcher');
      Main.tray.setContextMenu(contextMenu);

      WindowManager.createLauncherWindow();

      Main.tray.on('click', () => {
        WindowManager.toggleLauncherWindow();
      });
    }catch(e){
      WindowManager.createLauncherWindow();
    }

    globalShortcut.register('Alt+`', () => {
      WindowManager.createLauncherWindow();
    });
  }

  private static onActivate(){
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    WindowManager.createLauncherWindow();
  }

  static main(app: Electron.App) {
    // we pass the Electron.App object and the  
    // Electron.BrowserWindow into this function 
    // so this class has no dependencies. This 
    // makes the code easier to write tests for 
    Main.WindowManager = WindowManager;
    Main.application = app;

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    Main.application.on('ready', Main.onReady);


    // Quit when all windows are closed.
    Main.application.on('window-all-closed', Main.onWindowAllClosed);

    Main.application.on('activate', Main.onActivate);
    Main.WindowManager.initIPC(ipcMain);
  }

}