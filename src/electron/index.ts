import { createScopedLogger, LogScope } from "@/utility/Logger";
import Main from "@/electron/Main";

/**
 * Bootstrap the Electron app. Called from main.js with the `app` object so that
 * we only require('electron') from the process entry point. On Windows, requiring
 * 'electron' from a submodule can resolve to the npm package (path to exe) instead
 * of the Electron API; using app from the entry point avoids that.
 */
export function run(app: Electron.App): void {
  const log = createScopedLogger(LogScope.Extension);
  log.info('args', process.argv, __dirname, app.getAppPath());
  Main.setApplicationPath(app.getAppPath());
  Main.main(app);
}

export default Main;
