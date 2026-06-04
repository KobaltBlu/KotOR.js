#!/usr/bin/env node
'use strict';

/**
 * Manual verification against a running webpack HMR dev server.
 * Usage:
 *   KOTOR_DEV_PORT=8130 node scripts/verify-in-module.cjs
 *   KOTOR_VERIFY_MODULE=end_m01aa KOTOR_VERIFY_HMR=1 node scripts/verify-in-module.cjs
 */

const fs = require('fs/promises');
const fsSync = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.KOTOR_DEV_PORT || 8130);
const MODULE = process.env.KOTOR_VERIFY_MODULE || 'end_m01aa';
const GAME_URL = `http://127.0.0.1:${PORT}/game/?key=kotor`;
const OUT_DIR = path.join(ROOT, '.hmr-investigation');
const PROBE_FILE = path.join(ROOT, 'src/dev/HmrTestProbe.ts');
const MODULE_TIMEOUT_MS = Number(process.env.KOTOR_VERIFY_MODULE_TIMEOUT_MS || 900000);
const HMR_TIMEOUT_MS = Number(process.env.KOTOR_VERIFY_HMR_TIMEOUT_MS || 180000);
const RUN_HMR = process.env.KOTOR_VERIFY_HMR === '1';

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
    req.setTimeout(5000, () => req.destroy(new Error(`Timeout requesting ${url}`)));
  });
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await httpOk(url);
      return;
    } catch {
      await wait(1000);
    }
  }
  throw new Error(`Dev server not ready at ${url} within ${timeoutMs}ms`);
}

async function loadPuppeteer() {
  try {
    return require('puppeteer-core');
  } catch {
    return require('puppeteer');
  }
}

function findChrome() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const exe of candidates) {
    if (fsSync.existsSync(exe)) {
      return exe;
    }
  }
  return undefined;
}

async function waitForBootstrap(page, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await page.evaluate(() => window.__KOTOR_HMR_TEST__?.isQuickPlayReady?.() ?? false);
    if (ready) {
      return;
    }
    await wait(2000);
  }
  throw new Error(`Game bootstrap not ready within ${timeoutMs}ms`);
}

async function waitForInModule(page, moduleName, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const snap = await page.evaluate(() => window.__KOTOR_HMR_TEST__.snapshotSession());
    if (snap.ready && snap.module === moduleName) {
      return snap;
    }
    await wait(2000);
  }
  throw new Error(`Module ${moduleName} not ready within ${timeoutMs}ms`);
}

async function main() {
  await waitForServer(GAME_URL, 120000);
  await fs.mkdir(OUT_DIR, { recursive: true });

  const puppeteer = await loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: findChrome(),
    protocolTimeout: MODULE_TIMEOUT_MS + 300000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  let mainFrameNavigations = 0;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      mainFrameNavigations += 1;
    }
  });

  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__KOTOR_HMR_TEST__, { timeout: 120000 });

  console.log('[verify] Waiting for game bootstrap (2DA tables)...');
  await waitForBootstrap(page, Number(process.env.KOTOR_VERIFY_BOOTSTRAP_TIMEOUT_MS || 600000));

  console.log(`[verify] Quick-play into ${MODULE} (timeout ${MODULE_TIMEOUT_MS}ms)...`);
  await page.evaluate(async (moduleName) => {
    await window.__KOTOR_HMR_TEST__.startQuickPlayToModule(moduleName);
  }, MODULE);

  await waitForInModule(page, MODULE, MODULE_TIMEOUT_MS);

  const pre = await page.evaluate(() => ({
    pageLoadId: window.__KOTOR_HMR_TEST__.getPageLoadId(),
    acceptCount: window.__KOTOR_HMR_TEST__.getAcceptCount(),
    snapshot: window.__KOTOR_HMR_TEST__.snapshotSession(),
    inspect: window.__KOTOR_HMR_TEST__.inspectCreatures(),
  }));

  await page.screenshot({ path: path.join(OUT_DIR, 'verify-in-module-pre.png') });
  await fs.writeFile(path.join(OUT_DIR, 'verify-pre.json'), JSON.stringify(pre, null, 2));

  console.log('[verify] Pre-HMR inspect:', {
    headless: pre.inspect.headlessHumanoids.length,
    totalCreatures: pre.inspect.totalCreatures,
    module: pre.snapshot.module,
  });

  let hmrOk = null;
  if (RUN_HMR) {
    const originalProbe = await fs.readFile(PROBE_FILE, 'utf8');
    const probeValue = Date.now();
    const updatedProbe = originalProbe.replace(
      /export const HMR_PROBE = \d+/,
      `export const HMR_PROBE = ${probeValue}`,
    );
    const navBefore = mainFrameNavigations;
    await fs.writeFile(PROBE_FILE, updatedProbe, 'utf8');

    await page.waitForFunction(
      (expected) => {
        const bridge = window.__KOTOR_HMR_TEST__;
        return bridge.getAcceptCount() > 0
          && bridge.getProbeValue() === expected
          && bridge.isSessionActive();
      },
      { timeout: HMR_TIMEOUT_MS },
      probeValue,
    );

    const post = await page.evaluate(() => ({
      pageLoadId: window.__KOTOR_HMR_TEST__.getPageLoadId(),
      acceptCount: window.__KOTOR_HMR_TEST__.getAcceptCount(),
      snapshot: window.__KOTOR_HMR_TEST__.snapshotSession(),
      inspect: window.__KOTOR_HMR_TEST__.inspectCreatures(),
    }));

    hmrOk = post.pageLoadId === pre.pageLoadId
      && mainFrameNavigations === navBefore
      && post.snapshot.module === pre.snapshot.module
      && post.inspect.headlessHumanoids.length === pre.inspect.headlessHumanoids.length;

    await page.screenshot({ path: path.join(OUT_DIR, 'verify-in-module-post-hmr.png') });
    await fs.writeFile(path.join(OUT_DIR, 'verify-post.json'), JSON.stringify(post, null, 2));

    await fs.writeFile(PROBE_FILE, originalProbe, 'utf8');
    console.log('[verify] HMR ok:', hmrOk);
  }

  const result = {
    module: MODULE,
    headlessHumanoids: pre.inspect.headlessHumanoids.length,
    totalCreatures: pre.inspect.totalCreatures,
    hmrOk,
    errors: errors.length,
  };
  await fs.writeFile(path.join(OUT_DIR, 'verify-result.json'), JSON.stringify(result, null, 2));
  console.log('[verify] Result:', result);

  await browser.close();

  if (pre.inspect.headlessHumanoids.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[verify] Failed:', err);
  process.exit(1);
});
