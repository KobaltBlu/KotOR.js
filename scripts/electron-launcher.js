/**
 * Launcher run by Electron from the system temp dir (outside the project).
 * There, require('electron') does not resolve to the project's node_modules/electron,
 * so Electron's runtime can provide the real API (workaround for Windows bug #49034).
 */
'use strict';

const path = require('path');

const projectRoot = process.env.KOTOR_PROJECT_ROOT;
if (!projectRoot) {
  console.error('KOTOR_PROJECT_ROOT must be set to the project root directory.');
  process.exit(1);
}

const electron = require('electron');
// electron.app is the App singleton instance (object), not a constructor
const app =
  typeof electron === 'object' && electron && electron.app != null
    ? electron.app
    : undefined;

if (!app || typeof app.getAppPath !== 'function') {
  console.error(
    'require("electron") did not return the API (got ' + typeof electron + ').'
  );
  process.exit(1);
}

// When run from temp, app.getAppPath() would return the temp dir. Override so
// the app sees the project root as the application path.
const originalGetAppPath = app.getAppPath.bind(app);
app.getAppPath = function (name) {
  if (name === undefined) return projectRoot;
  return originalGetAppPath(name);
};

// Project code does require('electron'); from the project that would get the
// npm package (path string). Override require so 'electron' returns the real API,
// and prime the cache for the path Node will use when resolving from dist/.
const Module = require('module');
const originalRequire = Module.prototype.require;
const electronIndexPath = path.join(projectRoot, 'node_modules', 'electron', 'index.js');

Module.prototype.require = function (id) {
  const key = typeof id === 'string' ? id : (id && id.toString && id.toString());
  if (key === 'electron') return electron;
  if (key && path.resolve(key) === path.resolve(electronIndexPath)) return electron;
  return originalRequire.apply(this, arguments);
};

// Pre-populate cache so the first require('electron') from project code gets the API
const distParent = path.join(projectRoot, 'dist', 'electron', 'electron', 'Main.js');
const fakeParent = new Module(distParent);
fakeParent.paths = Module._nodeModulePaths(path.dirname(distParent));
let resolvedPath;
try {
  resolvedPath = Module._resolveFilename('electron', fakeParent, false);
} catch (_) {
  resolvedPath = electronIndexPath;
}
const cached = new Module(resolvedPath);
cached.exports = electron;
cached.loaded = true;
require.cache[resolvedPath] = cached;
require.cache[path.resolve(resolvedPath)] = cached;

const main = require(path.join(projectRoot, 'main.js'));
if (typeof main.run !== 'function') {
  console.error('main.js did not export run().');
  process.exit(1);
}

main.run(app);
