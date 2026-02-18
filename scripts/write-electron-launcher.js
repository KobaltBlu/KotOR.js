/**
 * Writes the Electron launcher to the system temp dir and runs Electron with it.
 * Running from outside the project avoids require('electron') resolving to
 * node_modules/electron (Windows bug #49034).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const SCOPE = '[write-electron-launcher]';

function trace(msg, ...args) {
  console.debug(SCOPE, 'trace', msg, ...args);
}
function info(msg, ...args) {
  console.info(SCOPE, 'info', msg, ...args);
}
function warn(msg, ...args) {
  console.warn(SCOPE, 'warn', msg, ...args);
}
function error(msg, ...args) {
  console.error(SCOPE, 'error', msg, ...args);
}

trace('script enter');
const projectRoot = path.resolve(__dirname, '..');
info('projectRoot', projectRoot);

const launcherSource = path.join(__dirname, 'electron-launcher.js');
trace('launcherSource', launcherSource);
const launcherContent = fs.readFileSync(launcherSource, 'utf8');
trace('launcherContent length', launcherContent.length);

const tempDir = os.tmpdir();
const tempLauncher = path.join(tempDir, 'kotor-electron-launcher-' + Date.now() + '.js');
info('tempLauncher', tempLauncher);

fs.writeFileSync(tempLauncher, launcherContent, 'utf8');
trace('temp launcher written');

const electronCli = path.join(projectRoot, 'node_modules', 'electron', 'cli.js');
if (!fs.existsSync(electronCli)) {
  error('electron cli not found', electronCli);
  process.exit(1);
}
trace('electronCli', electronCli);

info('spawning electron', process.execPath, electronCli, tempLauncher);
const electron = spawn(process.execPath, [electronCli, tempLauncher], {
  stdio: 'inherit',
  env: { ...process.env, KOTOR_PROJECT_ROOT: projectRoot },
  cwd: projectRoot,
});

electron.on('error', (err) => {
  error('electron process error', err);
});
electron.on('close', (code, signal) => {
  trace('electron close', { code, signal });
  try {
    fs.unlinkSync(tempLauncher);
    trace('temp launcher removed');
  } catch (_) {}
  process.exit(code !== null && code !== undefined ? code : 0);
});
trace('script exit (electron running)');
