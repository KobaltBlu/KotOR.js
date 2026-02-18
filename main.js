import { join } from 'path';
import { register } from 'tsconfig-paths';

const SCOPE = '[main.js]';
function trace(msg, ...args) {
  console.debug(SCOPE, 'trace', msg, ...args);
}
function info(msg, ...args) {
  console.info(SCOPE, 'info', msg, ...args);
}
function error(msg, ...args) {
  console.error(SCOPE, 'error', msg, ...args);
}

trace('module load');
const baseUrl = join(__dirname, 'dist/electron');
trace('tsconfig-paths baseUrl', baseUrl);
register({
  baseUrl,
  paths: { '@/*': ['*'] },
});
trace('tsconfig-paths registered');

/**
 * Bootstrap the Electron app. Exported so a Windows launcher (running from
 * outside the project) can call it with the real require('electron') API.
 * @param {object} app - Electron app from require('electron').app
 */
function run(app) {
  trace('run() enter');
  if (!app || typeof app.getAppPath !== 'function') {
    error('Invalid Electron app object', typeof app);
    throw new Error('Invalid Electron app object');
  }
  info('run() requiring dist/electron/electron', join(__dirname, 'dist', 'electron', 'electron'));
  const electronBootstrap = require('./dist/electron/electron');
  trace('run() calling electronBootstrap.run(app)');
  electronBootstrap.run(app);
  trace('run() exit');
}

if (require.main === module) {
  trace('run as main module');
  const electron = require('electron');
  const app =
    typeof electron === 'object' && electron && electron.app != null
      ? electron.app
      : undefined;

  if (!app || typeof app.getAppPath !== 'function') {
    error('Electron app API not available', typeof electron);
    throw new Error(
      'Electron app API not available (require("electron") did not return the API). ' +
        'On Windows this is a known bug. Use: npm run start (uses a launcher workaround).'
    );
  }
  run(app);
} else {
  trace('export run');
  module.exports = { run };
}
