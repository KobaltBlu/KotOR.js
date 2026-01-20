import { BrowserWindow, dialog } from "electron";
import { ApplicationWindow } from "./ApplicationWindow";
import { LauncherWindow } from "./LauncherWindow";
import * as path from "path";
//exec & execFile are used for launching the original games from the launcher
import { execFile, exec } from "child_process";

export class WindowManager {

  static launcherWindow: LauncherWindow;
  static windows: ApplicationWindow[] = [];

  static createLauncherWindow(){
    if(!WindowManager.launcherWindow){
      WindowManager.launcherWindow = new LauncherWindow();
    }
    WindowManager.launcherWindow.show();
  }

  static toggleLauncherWindow(){
    if(!WindowManager.launcherWindow){
      this.createLauncherWindow();
    }else{
      WindowManager.launcherWindow.toggleWindow();
    }
  }

  static addWindow(window: ApplicationWindow){
    const index = WindowManager.windows.indexOf(window);
    if(index < 0){
      WindowManager.windows.push(window);
    }
  }

  static removeWindow(window: ApplicationWindow){
    const index = WindowManager.windows.indexOf(window);
    if(index >= 0){
      WindowManager.windows.splice(index, 1);
    }
  }

  static hideLauncher(){
    if(WindowManager.launcherWindow){
      WindowManager.launcherWindow.hide();
    }
  }

  static showLauncher(){
    if(!WindowManager.launcherWindow){
      WindowManager.createLauncherWindow();
    }else{
      WindowManager.launcherWindow.show();
    }
  }

  static initIPC(ipcMain: Electron.IpcMain) {
    ipcMain.on('config-changed', (event, data) => {
      for(let i = 0, len = WindowManager.windows.length; i < len; i++){
        WindowManager.windows[i].send('config-changed', data);
      }
      if(WindowManager.launcherWindow instanceof LauncherWindow){
        WindowManager.launcherWindow.send('config-changed', data);
      }
    });
    
    ipcMain.handle('win-minimize', (event, data) => {
      const win = BrowserWindow.getFocusedWindow();
      if(win){
        win.minimize();
        return true;
      }
      return false;
    });
    
    ipcMain.handle('win-maximize', (event, data) => {
      const win = BrowserWindow.getFocusedWindow();
      if(win){
        console.log(win.isMaximized());
        if(win.isMaximized()){
          win.unmaximize();
          return true;
        }else{
          win.maximize();
          return true;
        } 
      }
      return false;
    });
    
    ipcMain.handle('locate-game-directory', (event, data) => {
      return new Promise( (resolve, reject) => {
        dialog.showOpenDialog({title: 'KotOR Game Install Folder', properties: ['openDirectory', 'createDirectory']}).then(result => {
          if(result.filePaths.length && !result.canceled){
            resolve(result.filePaths[0]);
          }
        }).catch(err => {
          reject(err)
        });
      });
    });
    
    ipcMain.handle('open-file-dialog', (event, data: Electron.OpenDialogOptions) => {
      return new Promise( (resolve, reject) => {
        dialog.showOpenDialog(data).then(result => {
          resolve(result);
        }).catch(err => {
          reject(err)
        });
      });
    });
    
    ipcMain.handle('save-file-dialog', (event, data: Electron.SaveDialogOptions) => {
      return new Promise( (resolve, reject) => {
        console.log('save-file-dialog2', event, data[0]);
        dialog.showSaveDialog(data[0]).then(result => {
          resolve(result);
        }).catch(err => {
          reject(err)
        });
      });
    });
    
    ipcMain.on('launch_profile', (event, profile) => {
      const window = new ApplicationWindow(profile);
      WindowManager.addWindow(window);
      WindowManager.hideLauncher();
    });
    
    ipcMain.on('launch_executable', (event, exe_path) => {
      WindowManager.hideLauncher();
      const cwd = path.parse(exe_path);
      if(process.platform == 'linux'){
        //Attempt to find wine so we can run the exe
        exec(`which wine`, (error) => {
          if(error){
            dialog.showMessageBoxSync({
              type: 'error',
              title: 'Error',
              message: 'Wine not found!',
              buttons: ['Ok']
            });
            WindowManager.showLauncher();
          }else{
            //Attempt to launch with wine
            exec(`cd ${cwd.dir} && wine ./${cwd.base}`, (error, stdout, stderr) => {
              console.error(error);
              console.error(stdout);
              console.error(stderr);
              WindowManager.showLauncher();
            });
          }
        });
      }else{
        console.log('Launching', exe_path, 'in', cwd.dir);
        execFile(exe_path, [], {cwd:cwd.dir}, (error, stdout, stderr) => {
          console.error(error);
          console.error(stdout);
          console.error(stderr);
          WindowManager.showLauncher();
        });
      }
    });
  }

}