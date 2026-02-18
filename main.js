const path = require('path');
const tsConfigPaths = require('tsconfig-paths');

// Resolve path aliases at runtime (tsc does not rewrite @/ in emitted JS).
tsConfigPaths.register({
  baseUrl: path.join(__dirname, 'dist/electron'),
  paths: { '@/*': ['*'] },
});

/**
 * Bootstrap the Electron app. Exported so a Windows launcher (running from
 * outside the project) can call it with the real require('electron') API.
 * @param {object} app - Electron app from require('electron').app
 */
function run(app) {
  if (!app || typeof app.getAppPath !== 'function') {
    throw new Error('Invalid Electron app object');
  }
  const electronBootstrap = require('./dist/electron/electron');
  electronBootstrap.run(app);
}

// When run as the main module (electron . or electron main.js), get app from
// require('electron'). On Windows, this can resolve to the npm package (path
// string) instead of the API; use the launcher in that case (npm run start).
if (require.main === module) {
  const electron = require('electron');
  const app =
    typeof electron === 'object' && electron && electron.app != null
      ? electron.app
      : undefined;

  if (!app || typeof app.getAppPath !== 'function') {
    throw new Error(
      'Electron app API not available (require("electron") did not return the API). ' +
        'On Windows this is a known bug. Use: npm run start (uses a launcher workaround).'
    );
  }
  run(app);
} else {
  module.exports = { run };
}
