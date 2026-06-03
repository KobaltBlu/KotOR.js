#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const fs = require('fs/promises');
const http = require('http');
const path = require('path');

const fsSync = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.KOTOR_HMR_E2E_PORT || 8099);
const PROBE_FILE = path.join(ROOT, 'src/dev/HmrTestProbe.ts');
const GAME_URL = `http://127.0.0.1:${PORT}/game/?key=kotor`;
const KOTOR_DEV_GAME_DIR = process.env.KOTOR_DEV_GAME_DIR || '';
const USE_REAL_ASSETS = Boolean(
  KOTOR_DEV_GAME_DIR && fsSync.existsSync(KOTOR_DEV_GAME_DIR),
);
const REAL_ASSET_READY_TIMEOUT_MS = Number(
  process.env.KOTOR_HMR_REAL_ASSET_TIMEOUT_MS || 600000,
);
const SERVER_READY_URLS = [
  GAME_URL,
  `http://127.0.0.1:${PORT}/game/index.html?key=kotor`,
  `http://localhost:${PORT}/game/?key=kotor`,
];
const SERVER_TIMEOUT_MS = 180000;
const HMR_TIMEOUT_MS = 90000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpOk(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve();
        return;
      }
      reject(new Error(`HTTP ${res.statusCode} for ${url}`));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error(`Timeout requesting ${url}`));
    });
  });
}

async function waitForServer(urls, timeoutMs) {
  const candidates = Array.isArray(urls) ? urls : [urls];
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const url of candidates) {
      try {
        await httpOk(url);
        return url;
      } catch {
        // try next candidate
      }
    }
    await wait(1000);
  }
  throw new Error(
    `Dev server did not become ready at ${candidates.join(', ')} within ${timeoutMs}ms`,
  );
}

function createCompileTracker(child) {
  let count = 0;
  const onData = (chunk) => {
    if (/compiled successfully/i.test(chunk.toString())) {
      count += 1;
    }
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);

  function waitForCount(targetCount, timeoutMs) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      if (count >= targetCount) {
        resolve(count);
        return;
      }
      const timer = setInterval(() => {
        if (count >= targetCount) {
          clearInterval(timer);
          resolve(count);
        } else if (Date.now() - start >= timeoutMs) {
          clearInterval(timer);
          reject(
            new Error(
              `Webpack did not report a successful compile within ${timeoutMs}ms (have ${count}, need ${targetCount})`,
            ),
          );
        }
      }, 100);
    });
  }

  return {
    getCount: () => count,
    waitForInitialCompile: (timeoutMs) => waitForCount(1, timeoutMs),
    waitForNextCompile: (timeoutMs) => {
      const target = count + 1;
      return waitForCount(target, timeoutMs);
    },
  };
}

function startDevServer() {
  return spawn(
    'npx',
    ['webpack', 'serve', '--config', 'webpack/Game.hmr.js'],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        KOTOR_DEV_PORT: String(PORT),
        NODE_ENV: 'development',
        ...(USE_REAL_ASSETS ? { KOTOR_DEV_GAME_DIR } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    },
  );
}

async function killProcess(child) {
  if (!child || !child.pid) {
    return;
  }
  if (child.stdout) {
    child.stdout.destroy();
  }
  if (child.stderr) {
    child.stderr.destroy();
  }
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, 'SIGKILL');
      return;
    } catch {
      // Fall through to direct child kill.
    }
  }
  try {
    child.kill('SIGKILL');
  } catch {
    // Process already exited.
  }
}

async function resolveBrowserExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('No Chromium executable found. Set PUPPETEER_EXECUTABLE_PATH.');
}

async function ensureDistAssets() {
  const threeDest = path.join(ROOT, 'dist/three.min.js');
  if (!fsSync.existsSync(threeDest)) {
    await fs.mkdir(path.dirname(threeDest), { recursive: true });
    await fs.copyFile(
      path.join(ROOT, 'node_modules/three/build/three.min.js'),
      threeDest,
    );
  }
}

async function waitForRealAssetSession(page) {
  const start = Date.now();
  while (Date.now() - start < REAL_ASSET_READY_TIMEOUT_MS) {
    const snapshot = await page.evaluate(() => {
      const bridge = window.__KOTOR_HMR_TEST__;
      return bridge ? bridge.snapshotSession() : { ready: false, module: null, area: null, player: null };
    });
    if (snapshot.ready) {
      return snapshot;
    }
    await wait(2000);
  }
  throw new Error(
    `Real asset load did not reach GameState.Ready within ${REAL_ASSET_READY_TIMEOUT_MS}ms`,
  );
}

async function main() {
  const originalProbe = await fs.readFile(PROBE_FILE, 'utf8');
  let server;
  let browser;

  try {
    await ensureDistAssets();
    server = startDevServer();
    server.stdout.on('data', (chunk) => process.stdout.write(chunk));
    server.stderr.on('data', (chunk) => process.stderr.write(chunk));
    const compileTracker = createCompileTracker(server);

    await compileTracker.waitForInitialCompile(SERVER_TIMEOUT_MS);
    const readyUrl = await waitForServer(SERVER_READY_URLS, 30000);

    const puppeteer = require('puppeteer-core');
    browser = await puppeteer.launch({
      headless: true,
      executablePath: await resolveBrowserExecutable(),
      protocolTimeout: REAL_ASSET_READY_TIMEOUT_MS + 120000,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    page.on('console', (msg) => {
      console.log(`[browser:${msg.type()}]`, msg.text());
    });
    page.on('pageerror', (err) => {
      console.log('[browser:pageerror]', err.message);
    });
    let mainFrameNavigations = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        mainFrameNavigations += 1;
      }
    });

    await page.goto(readyUrl, { waitUntil: 'domcontentloaded', timeout: SERVER_TIMEOUT_MS });
    await page.waitForFunction(() => window.__KOTOR_HMR_TEST__, { timeout: 60000 });

    const before = await page.evaluate(() => ({
      pageLoadId: window.__KOTOR_HMR_TEST__.getPageLoadId(),
      acceptCount: window.__KOTOR_HMR_TEST__.getAcceptCount(),
    }));

    if (USE_REAL_ASSETS) {
      console.log(`[hmr-e2e] Real assets: waiting for GameState.Ready via ${KOTOR_DEV_GAME_DIR}`);
      const snapshot = await waitForRealAssetSession(page);
      console.log('[hmr-e2e] Real asset session snapshot:', snapshot);
    } else {
      await page.evaluate(() => window.__KOTOR_HMR_TEST__.activateSession());
    }

    const sessionActiveBefore = await page.evaluate(() => window.__KOTOR_HMR_TEST__.isSessionActive());
    if (!sessionActiveBefore) {
      throw new Error(
        USE_REAL_ASSETS
          ? 'GameState.Ready was not active before HMR after real asset load'
          : 'Failed to activate simulated session before HMR',
      );
    }

    const navigationsBeforeHmr = mainFrameNavigations;
    const probeValue = Date.now();
    const updatedProbe = originalProbe.replace(
      /export const HMR_PROBE = \d+/,
      `export const HMR_PROBE = ${probeValue}`,
    );
    if (updatedProbe === originalProbe) {
      throw new Error('Failed to rewrite HmrTestProbe.ts for HMR trigger');
    }
    const compileReady = compileTracker.waitForNextCompile(HMR_TIMEOUT_MS);
    await fs.writeFile(PROBE_FILE, updatedProbe, 'utf8');
    await compileReady;
    await wait(500);

    await page.waitForFunction(
      (expectedProbe) => {
        const bridge = window.__KOTOR_HMR_TEST__;
        return !!bridge
          && bridge.getAcceptCount() > 0
          && bridge.getProbeValue() === expectedProbe
          && bridge.isSessionActive();
      },
      { timeout: HMR_TIMEOUT_MS },
      probeValue,
    );

    const after = await page.evaluate(() => ({
      pageLoadId: window.__KOTOR_HMR_TEST__.getPageLoadId(),
      acceptCount: window.__KOTOR_HMR_TEST__.getAcceptCount(),
      sessionActive: window.__KOTOR_HMR_TEST__.isSessionActive(),
      probeValue: window.__KOTOR_HMR_TEST__.getProbeValue(),
    }));

    if (after.pageLoadId !== before.pageLoadId) {
      throw new Error(`Full page reload detected (pageLoadId changed: ${before.pageLoadId} -> ${after.pageLoadId})`);
    }
    if (mainFrameNavigations > navigationsBeforeHmr) {
      throw new Error(`Main-frame navigation occurred during HMR (${navigationsBeforeHmr} -> ${mainFrameNavigations})`);
    }
    if (!after.sessionActive) {
      throw new Error('Session was not preserved after hot reload');
    }
    if (after.acceptCount <= before.acceptCount) {
      throw new Error(`HotReloadManager accept count did not increase (${before.acceptCount} -> ${after.acceptCount})`);
    }
    if (after.probeValue !== probeValue) {
      throw new Error(`HMR probe value mismatch (expected ${probeValue}, got ${after.probeValue})`);
    }

    console.log('HMR session preservation E2E passed:', {
      mode: USE_REAL_ASSETS ? 'real-assets' : 'synthetic',
      pageLoadId: after.pageLoadId,
      acceptCount: after.acceptCount,
      probeValue: after.probeValue,
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    await killProcess(server);
    await fs.writeFile(PROBE_FILE, originalProbe, 'utf8').catch(() => {});
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('HMR session preservation E2E failed:', error);
    process.exit(1);
  });
