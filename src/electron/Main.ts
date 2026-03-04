import { Menu, Tray, globalShortcut, ipcMain } from 'electron';

import { WindowManager } from '@/electron/WindowManager';
import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Electron);

export default class Main {

  static application: Electron.App;
  static tray: Electron.Tray;
  static WindowManager: typeof WindowManager;
  static ApplicationPath: string;

  static setApplicationPath(path: string) {
    log.trace('setApplicationPath', path);
    Main.ApplicationPath = path;
  }

  private static onWindowAllClosed() {
    log.trace('onWindowAllClosed', process.platform);
    if (process.platform !== 'darwin') {
      Main.application.quit();
    }
  }

  private static onReady() {
    log.trace('onReady enter');
    try {
      Main.tray = new Tray('dist/assets/icons/icon.png');
      log.debug('tray created');
      const contextMenu = Menu.buildFromTemplate([{
        label: 'Exit',
        type: 'normal',
        click: () => {
          log.trace('tray Exit clicked');
          Main.application.quit();
        }
      }]);
      Main.tray.setToolTip('KotOR Launcher');
      Main.tray.setContextMenu(contextMenu);

      log.debug('creating launcher window');
      WindowManager.createLauncherWindow();

      Main.tray.on('click', () => {
        log.trace('tray click');
        WindowManager.toggleLauncherWindow();
      });
      log.trace('onReady tray path OK');
    } catch (e) {
      log.warn('tray icon failed, creating launcher only', e);
      WindowManager.createLauncherWindow();
    }

    globalShortcut.register('Alt+`', () => {
      log.trace('Alt+` shortcut');
      WindowManager.createLauncherWindow();
    });
    log.trace('onReady exit');
  }

  private static onActivate() {
    log.trace('onActivate');
    WindowManager.createLauncherWindow();
  }

  static main(app: Electron.App) {
    log.trace('main() enter');
    Main.WindowManager = WindowManager;
    Main.application = app;

    Main.application.on('ready', Main.onReady);
    log.debug('registered ready handler');

    Main.application.on('window-all-closed', Main.onWindowAllClosed);
    Main.application.on('activate', Main.onActivate);
    Main.WindowManager.initIPC(ipcMain);
    log.trace('main() exit');
  }
}
