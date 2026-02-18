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

const projectRoot = path.resolve(__dirname, '..');
const launcherSource = path.join(__dirname, 'electron-launcher.js');
const launcherContent = fs.readFileSync(launcherSource, 'utf8');
const tempDir = os.tmpdir();
const tempLauncher = path.join(
  tempDir,
  'kotor-electron-launcher-' + Date.now() + '.js'
);

fs.writeFileSync(tempLauncher, launcherContent, 'utf8');

// Run electron via its cli.js with node so we can pass args without shell (avoids DEP0190)
const electronCli = path.join(projectRoot, 'node_modules', 'electron', 'cli.js');

const electron = spawn(process.execPath, [electronCli, tempLauncher], {
  stdio: 'inherit',
  env: { ...process.env, KOTOR_PROJECT_ROOT: projectRoot },
  cwd: projectRoot,
});

electron.on('close', (code) => {
  try {
    fs.unlinkSync(tempLauncher);
  } catch (_) {}
  process.exit(code !== null && code !== undefined ? code : 0);
});
