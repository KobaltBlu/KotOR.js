import { createScopedLogger, LogScope, setLogLevel, LogLevel } from "@/utility/Logger";
import Main from "@/electron/Main";

const log = createScopedLogger(LogScope.Extension);

/**
 * Bootstrap the Electron app. Called from main.js with the `app` object so that
 * we only require('electron') from the process entry point. On Windows, requiring
 * 'electron' from a submodule can resolve to the npm package (path to exe) instead
 * of the Electron API; using app from the entry point avoids that.
 */
export function run(app: Electron.App): void {
  setLogLevel(LogLevel.Trace);
  log.trace('run() enter');
  log.info('args', process.argv, __dirname, app.getAppPath());
  const appPath = app.getAppPath();
  log.debug('setApplicationPath', appPath);
  Main.setApplicationPath(appPath);
  log.trace('Main.main() about to call');
  Main.main(app);
  log.trace('run() exit');
}

export default Main;
