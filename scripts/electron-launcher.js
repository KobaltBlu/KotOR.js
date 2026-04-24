/**
 * Launcher run by Electron from the system temp dir (outside the project).
 * There, require('electron') does not resolve to the project's node_modules/electron,
 * so Electron's runtime can provide the real API (workaround for Windows bug #49034).
 */
'use strict';

const path = require('path');

const SCOPE = '[electron-launcher]';
function trace(msg, ...args) {
  console.debug(SCOPE, 'trace', msg, ...args);
}
function info(msg, ...args) {
  console.info(SCOPE, 'info', msg, ...args);
}
function error(msg, ...args) {
  console.error(SCOPE, 'error', msg, ...args);
}

trace('script enter');
const projectRoot = process.env.KOTOR_PROJECT_ROOT;
if (!projectRoot) {
  error('KOTOR_PROJECT_ROOT must be set to the project root directory.');
  process.exit(1);
}
info('KOTOR_PROJECT_ROOT', projectRoot);

trace('require electron');
const electron = require('electron');
const app =
  typeof electron === 'object' && electron && electron.app != null
    ? electron.app
    : undefined;

if (!app || typeof app.getAppPath !== 'function') {
  error('require("electron") did not return the API (got ' + typeof electron + ').');
  process.exit(1);
}
trace('electron app OK');

const originalGetAppPath = app.getAppPath.bind(app);
app.getAppPath = function (name) {
  if (name === undefined) return projectRoot;
  return originalGetAppPath(name);
};
trace('getAppPath overridden');

const Module = require('module');
const originalRequire = Module.prototype.require;
const electronIndexPath = path.join(projectRoot, 'node_modules', 'electron', 'index.js');
trace('electronIndexPath', electronIndexPath);

Module.prototype.require = function (id) {
  const key = typeof id === 'string' ? id : (id && id.toString && id.toString());
  if (key === 'electron') return electron;
  if (key && path.resolve(key) === path.resolve(electronIndexPath)) return electron;
  return originalRequire.apply(this, arguments);
};

const distParent = path.join(projectRoot, 'dist', 'electron', 'electron', 'Main.js');
const fakeParent = new Module(distParent);
fakeParent.paths = Module._nodeModulePaths(path.dirname(distParent));
let resolvedPath;
try {
  resolvedPath = Module._resolveFilename('electron', fakeParent, false);
} catch (_) {
  resolvedPath = electronIndexPath;
}
trace('resolvedPath', resolvedPath);
const cached = new Module(resolvedPath);
cached.exports = electron;
cached.loaded = true;
require.cache[resolvedPath] = cached;
require.cache[path.resolve(resolvedPath)] = cached;
trace('electron require cache primed');

const mainPath = path.join(projectRoot, 'main.js');
info('requiring main.js', mainPath);
const main = require(mainPath);
if (typeof main.run !== 'function') {
  error('main.js did not export run().');
  process.exit(1);
}
trace('calling main.run(app)');
main.run(app);
trace('script exit');
