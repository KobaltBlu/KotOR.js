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
// Real engine file mutated by the engine-edit reload-resume phase. Engine
// modules cannot hot-swap in place, so edits here must snapshot + reload +
// auto-resume (see src/dev/DevSessionResume.ts).
const ENGINE_FILE = path.join(ROOT, 'src/module/ModuleArea.ts');
const ENGINE_MARKER_GLOBAL = '__KOTOR_HMR_E2E_ENGINE_MARKER__';
// Engine edits rebuild the 22 MiB game chunk — slower than probe-only swaps.
const ENGINE_COMPILE_TIMEOUT_MS = 300000;
const RESUME_STORAGE_KEY = 'kotor.devResumeSnapshot';
const GAME_URL = `http://127.0.0.1:${PORT}/game/?key=kotor`;
const KOTOR_DEV_GAME_DIR = process.env.KOTOR_DEV_GAME_DIR || '';
const USE_REAL_ASSETS = Boolean(
  KOTOR_DEV_GAME_DIR && fsSync.existsSync(KOTOR_DEV_GAME_DIR),
);
const REAL_ASSET_READY_TIMEOUT_MS = Number(
  process.env.KOTOR_HMR_REAL_ASSET_TIMEOUT_MS || 600000,
);
const KOTOR_HMR_E2E_MODULE = process.env.KOTOR_HMR_E2E_MODULE || '';
const USE_IN_MODULE =
  USE_REAL_ASSETS && Boolean(KOTOR_HMR_E2E_MODULE);
const SERVER_READY_URLS = [
  GAME_URL,
  `http://127.0.0.1:${PORT}/game/index.html?key=kotor`,
  `http://localhost:${PORT}/game/?key=kotor`,
];
const SERVER_TIMEOUT_MS = 180000;
const HMR_TIMEOUT_MS = 90000;
// Two cycles catch once-only accept wiring (regressions that survive exactly one swap).
const HMR_CYCLES = 2;
// Physics settles the spawn z shortly after module load; exact equality flakes.
const POSITION_EPSILON = 0.25;

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
    await page.evaluate(() => window.__KOTOR_HMR_TEST__?.skipIntroMovies?.());
    const ready = await page.evaluate(
      () => window.__KOTOR_HMR_TEST__?.isQuickPlayReady?.() ?? false,
    );
    if (ready) {
      await page.evaluate(() => window.__KOTOR_HMR_TEST__.activateSession());
      return page.evaluate(() => window.__KOTOR_HMR_TEST__.snapshotSession());
    }
    await wait(2000);
  }
  throw new Error(
    `Real asset load did not reach quick-play readiness within ${REAL_ASSET_READY_TIMEOUT_MS}ms`,
  );
}

async function waitForInModuleSession(page, moduleName) {
  const start = Date.now();
  let lastSnapshot = null;
  let lastSnapshotLog = 0;
  while (Date.now() - start < REAL_ASSET_READY_TIMEOUT_MS) {
    await page.evaluate(() => window.__KOTOR_HMR_TEST__?.skipIntroMovies?.());
    const quickPlayError = await page.evaluate(
      () => window.__KOTOR_HMR_E2E_QUICKPLAY_ERROR__ ?? null,
    );
    if (quickPlayError) {
      throw new Error(`startQuickPlayToModule(${moduleName}) failed in-page: ${quickPlayError}`);
    }
    const snapshot = await page.evaluate(() => {
      const bridge = window.__KOTOR_HMR_TEST__;
      return bridge
        ? bridge.snapshotSession()
        : { ready: false, mode: -1, module: null, area: null, creatureCount: null, player: null };
    });
    lastSnapshot = snapshot;
    if (Date.now() - lastSnapshotLog > 10000) {
      console.log('[hmr-e2e] Waiting for in-module snapshot:', snapshot);
      lastSnapshotLog = Date.now();
    }
    if (
      snapshot.ready
      && snapshot.module === moduleName
      && snapshot.player
    ) {
      return snapshot;
    }
    await wait(2000);
  }
  throw new Error(
    `Module ${moduleName} did not become playable within ${REAL_ASSET_READY_TIMEOUT_MS}ms; last snapshot: ${JSON.stringify(lastSnapshot)}`,
  );
}

/** page.evaluate that tolerates mid-navigation context destruction. */
async function safeEvaluate(page, fn, ...args) {
  try {
    return await page.evaluate(fn, ...args);
  } catch {
    return null;
  }
}

/**
 * Polls until DevSessionResume reports 'resumed' and the bridge confirms a
 * playable session in the expected module. Tolerates the page being
 * mid-reload when polling starts.
 */
async function waitForResumedSession(page, moduleName) {
  const start = Date.now();
  let last = null;
  let lastLog = 0;
  while (Date.now() - start < REAL_ASSET_READY_TIMEOUT_MS) {
    const state = await safeEvaluate(page, () => ({
      resumeState: window.__KOTOR_DEV_RESUME_STATE__ ?? null,
      snapshot: window.__KOTOR_HMR_TEST__
        ? window.__KOTOR_HMR_TEST__.snapshotSession()
        : null,
    }));
    if (state) {
      last = state;
      if (Date.now() - lastLog > 10000) {
        console.log('[hmr-e2e] Waiting for dev resume:', state.resumeState, state.snapshot?.module);
        lastLog = Date.now();
      }
      if (state.resumeState === 'failed') {
        throw new Error('DevSessionResume reported failure — see browser console');
      }
      if (
        state.resumeState === 'resumed'
        && state.snapshot?.ready
        && state.snapshot.module === moduleName
        && state.snapshot.player
      ) {
        return state.snapshot;
      }
    }
    await wait(2000);
  }
  throw new Error(
    `Session did not auto-resume into ${moduleName} within ${REAL_ASSET_READY_TIMEOUT_MS}ms; last: ${JSON.stringify(last)}`,
  );
}

function assertPositionClose(label, expected, actual) {
  if (
    Math.abs(expected.x - actual.x) > POSITION_EPSILON
    || Math.abs(expected.y - actual.y) > POSITION_EPSILON
    || Math.abs(expected.z - actual.z) > POSITION_EPSILON
  ) {
    throw new Error(
      `${label}: position drifted beyond epsilon ${POSITION_EPSILON} `
      + `(${expected.x},${expected.y},${expected.z}) -> (${actual.x},${actual.y},${actual.z})`,
    );
  }
}

async function readStoredResumePosition(page) {
  return page.evaluate((key) => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(key) || 'null');
      return stored?.position ?? null;
    } catch {
      return null;
    }
  }, RESUME_STORAGE_KEY);
}

function positionMatchesNudge(storedPos, nudged) {
  return storedPos
    && Math.abs(storedPos.x - nudged.x) <= POSITION_EPSILON
    && Math.abs(storedPos.y - nudged.y) <= POSITION_EPSILON
    && Math.abs(storedPos.z - nudged.z) <= POSITION_EPSILON;
}

/**
 * Phase C — manual F5: a full reload must auto-resume the session in-module
 * at the saved player position instead of returning to the main menu.
 */
async function runF5ResumePhase(page, moduleName) {
  console.log('[hmr-e2e] Phase: F5 reload-resume');
  await page.evaluate(() => window.__KOTOR_HMR_TEST__.nudgePlayer(2.0, 1.5));
  const nudged = await page.evaluate(
    () => window.__KOTOR_HMR_TEST__.snapshotSession().player,
  );
  if (!nudged) {
    throw new Error('F5 phase: no player to nudge before reload');
  }

  // Autosave runs every 2s — wait until the stored snapshot reflects the nudge.
  const storedDeadline = Date.now() + 20000;
  let stored = null;
  while (Date.now() < storedDeadline) {
    stored = await page.evaluate((key) => {
      try {
        return JSON.parse(window.localStorage.getItem(key) || 'null');
      } catch {
        return null;
      }
    }, RESUME_STORAGE_KEY);
    if (positionMatchesNudge(stored?.position, nudged)) {
      break;
    }
    await wait(1000);
  }
  if (!stored?.position) {
    throw new Error('F5 phase: dev resume snapshot never appeared in localStorage');
  }

  const pageLoadIdBefore = await page.evaluate(
    () => window.__KOTOR_HMR_TEST__.getPageLoadId(),
  );

  await page.reload({ waitUntil: 'domcontentloaded', timeout: SERVER_TIMEOUT_MS });
  await page.waitForFunction(() => window.__KOTOR_HMR_TEST__, { timeout: 120000 });

  const resumed = await waitForResumedSession(page, moduleName);
  const pageLoadIdAfter = await page.evaluate(
    () => window.__KOTOR_HMR_TEST__.getPageLoadId(),
  );
  if (pageLoadIdAfter === pageLoadIdBefore) {
    throw new Error('F5 phase: pageLoadId unchanged — reload did not actually happen');
  }
  const resumeSnapshotPos = await readStoredResumePosition(page);
  if (!resumeSnapshotPos) {
    throw new Error('F5 phase: no resume snapshot in localStorage after resume');
  }
  assertPositionClose('F5 resume (stored snapshot)', resumeSnapshotPos, resumed.player);
  console.log('[hmr-e2e] F5 reload-resume passed:', {
    module: resumed.module,
    area: resumed.area,
    player: resumed.player,
  });
  return resumed;
}

/**
 * Phase B — engine edit: editing a real engine module (not the probe) must
 * trigger snapshot -> full reload -> auto-resume, with the NEW engine code
 * demonstrably executing in the resumed session.
 */
async function runEngineEditResumePhase(page, moduleName, compileTracker) {
  console.log('[hmr-e2e] Phase: engine-edit reload-resume');
  const pageLoadIdBefore = await page.evaluate(
    () => window.__KOTOR_HMR_TEST__.getPageLoadId(),
  );

  // Wait for a fresh autosave so the abort-time snapshot is recent.
  const autosaveDeadline = Date.now() + 20000;
  let preEditSnapshotPos = null;
  while (Date.now() < autosaveDeadline) {
    preEditSnapshotPos = await readStoredResumePosition(page);
    if (preEditSnapshotPos) {
      break;
    }
    await wait(1000);
  }
  if (!preEditSnapshotPos) {
    throw new Error('Engine phase: no dev resume snapshot before engine edit');
  }

  const engineSource = await fs.readFile(ENGINE_FILE, 'utf8');
  const anchor = 'update(delta: number = 0){';
  if (!engineSource.includes(anchor)) {
    throw new Error(`Engine phase: anchor not found in ${ENGINE_FILE}`);
  }
  const markerLine = `\n    (window as any).${ENGINE_MARKER_GLOBAL} = (((window as any).${ENGINE_MARKER_GLOBAL} ?? 0) + 1);`;
  const patched = engineSource.replace(anchor, anchor + markerLine);

  const compileReady = compileTracker.waitForNextCompile(ENGINE_COMPILE_TIMEOUT_MS);
  await fs.writeFile(ENGINE_FILE, patched, 'utf8');
  await compileReady;

  // The abort handler reloads the page; wait for a different pageLoadId.
  const reloadDeadline = Date.now() + 120000;
  let reloaded = false;
  while (Date.now() < reloadDeadline) {
    const currentId = await safeEvaluate(
      page,
      () => window.__KOTOR_HMR_TEST__?.getPageLoadId?.() ?? null,
    );
    if (currentId && currentId !== pageLoadIdBefore) {
      reloaded = true;
      break;
    }
    await wait(1000);
  }
  if (!reloaded) {
    throw new Error('Engine phase: page did not reload after engine edit (abort handler missing?)');
  }

  const resumed = await waitForResumedSession(page, moduleName);
  const resumeSnapshotPos = await readStoredResumePosition(page);
  if (!resumeSnapshotPos) {
    throw new Error('Engine phase: no resume snapshot in localStorage after resume');
  }
  assertPositionClose('Engine-edit resume (stored snapshot)', resumeSnapshotPos, resumed.player);

  // Prove the NEW engine code is executing: the marker must keep counting.
  const markerProof = await page.evaluate((markerGlobal) => new Promise((resolve) => {
    const first = window[markerGlobal] ?? null;
    setTimeout(() => {
      resolve({ first, later: window[markerGlobal] ?? null });
    }, 1500);
  }), ENGINE_MARKER_GLOBAL);
  if (markerProof.first === null || markerProof.later === null || !(markerProof.later > markerProof.first)) {
    throw new Error(
      `Engine phase: new engine code not executing after resume (marker ${JSON.stringify(markerProof)})`,
    );
  }
  console.log('[hmr-e2e] Engine-edit reload-resume passed:', {
    module: resumed.module,
    player: resumed.player,
    marker: markerProof,
  });
  return resumed;
}

async function main() {
  const originalProbe = await fs.readFile(PROBE_FILE, 'utf8');
  const originalEngineSource = await fs.readFile(ENGINE_FILE, 'utf8');
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
    // Drop any stale snapshot so boot resume does not hijack quick-play; resume
    // stays enabled for F5 / engine-edit reloads in later phases.
    await page.evaluate((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }, RESUME_STORAGE_KEY);
    await page.waitForFunction(() => window.__KOTOR_HMR_TEST__, { timeout: 60000 });

    const before = await page.evaluate(() => ({
      pageLoadId: window.__KOTOR_HMR_TEST__.getPageLoadId(),
      acceptCount: window.__KOTOR_HMR_TEST__.getAcceptCount(),
    }));

    if (USE_REAL_ASSETS) {
      console.log(`[hmr-e2e] Real assets: waiting for GameState.Ready via ${KOTOR_DEV_GAME_DIR}`);
      const snapshot = await waitForRealAssetSession(page);
      console.log('[hmr-e2e] Real asset session snapshot:', snapshot);

      if (USE_IN_MODULE) {
        console.log(`[hmr-e2e] Quick-play into module: ${KOTOR_HMR_E2E_MODULE}`);
        // Fire-and-forget: awaiting the full module load inside one evaluate
        // call exceeds the CDP protocolTimeout on slow asset stores. Progress
        // is observed by polling snapshotSession from Node instead.
        await page.evaluate((moduleName) => {
          window.__KOTOR_HMR_E2E_QUICKPLAY_ERROR__ = null;
          window.__KOTOR_HMR_TEST__.startQuickPlayToModule(moduleName).catch((e) => {
            window.__KOTOR_HMR_E2E_QUICKPLAY_ERROR__ = String((e && e.message) || e);
          });
        }, KOTOR_HMR_E2E_MODULE);
        const inModule = await waitForInModuleSession(page, KOTOR_HMR_E2E_MODULE);
        console.log('[hmr-e2e] In-module session snapshot:', inModule);
      }
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

    const preHmrSnapshot = USE_IN_MODULE
      ? await page.evaluate(() => window.__KOTOR_HMR_TEST__.snapshotSession())
      : null;

    // Heap marker: survives hot swaps, lost on any silent full reload.
    await page.evaluate(() => {
      window.__KOTOR_HMR_E2E_HEAP_MARKER__ = window.__KOTOR_HMR_TEST__.getPageLoadId();
    });

    let lastAfter = null;
    for (let cycle = 1; cycle <= HMR_CYCLES; cycle += 1) {
      const navigationsBeforeHmr = mainFrameNavigations;
      const beforeCycle = await page.evaluate(() => ({
        acceptCount: window.__KOTOR_HMR_TEST__.getAcceptCount(),
        loopGeneration: window.__KOTOR_HMR_TEST__.getLoopGeneration(),
      }));

      const probeValue = Date.now() + cycle;
      const currentProbe = await fs.readFile(PROBE_FILE, 'utf8');
      const updatedProbe = currentProbe.replace(
        /export const HMR_PROBE = \d+/,
        `export const HMR_PROBE = ${probeValue}`,
      );
      if (updatedProbe === currentProbe) {
        throw new Error(`Cycle ${cycle}: failed to rewrite HmrTestProbe.ts for HMR trigger`);
      }
      const compileReady = compileTracker.waitForNextCompile(HMR_TIMEOUT_MS);
      await fs.writeFile(PROBE_FILE, updatedProbe, 'utf8');
      await compileReady;
      await wait(500);

      await page.waitForFunction(
        (expectedProbe, expectedAcceptCount) => {
          const bridge = window.__KOTOR_HMR_TEST__;
          return !!bridge
            && bridge.getAcceptCount() >= expectedAcceptCount
            && bridge.getProbeValue() === expectedProbe
            && bridge.isSessionActive();
        },
        { timeout: HMR_TIMEOUT_MS },
        probeValue,
        beforeCycle.acceptCount + 1,
      );

      const after = await page.evaluate(() => ({
        pageLoadId: window.__KOTOR_HMR_TEST__.getPageLoadId(),
        acceptCount: window.__KOTOR_HMR_TEST__.getAcceptCount(),
        loopGeneration: window.__KOTOR_HMR_TEST__.getLoopGeneration(),
        sessionActive: window.__KOTOR_HMR_TEST__.isSessionActive(),
        probeValue: window.__KOTOR_HMR_TEST__.getProbeValue(),
        heapMarker: window.__KOTOR_HMR_E2E_HEAP_MARKER__ ?? null,
      }));

      if (after.pageLoadId !== before.pageLoadId) {
        throw new Error(`Cycle ${cycle}: full page reload detected (pageLoadId changed: ${before.pageLoadId} -> ${after.pageLoadId})`);
      }
      if (mainFrameNavigations > navigationsBeforeHmr) {
        throw new Error(`Cycle ${cycle}: main-frame navigation occurred during HMR (${navigationsBeforeHmr} -> ${mainFrameNavigations})`);
      }
      if (after.heapMarker !== before.pageLoadId) {
        throw new Error(`Cycle ${cycle}: JS heap marker lost (expected ${before.pageLoadId}, got ${after.heapMarker}) — silent reload?`);
      }
      if (!after.sessionActive) {
        throw new Error(`Cycle ${cycle}: session was not preserved after hot reload`);
      }
      if (after.acceptCount !== beforeCycle.acceptCount + 1) {
        throw new Error(`Cycle ${cycle}: accept count delta != 1 (${beforeCycle.acceptCount} -> ${after.acceptCount})`);
      }
      if (after.loopGeneration !== beforeCycle.loopGeneration + 1) {
        throw new Error(`Cycle ${cycle}: loop generation delta != 1 (${beforeCycle.loopGeneration} -> ${after.loopGeneration})`);
      }
      if (after.probeValue !== probeValue) {
        throw new Error(`Cycle ${cycle}: HMR probe value mismatch (expected ${probeValue}, got ${after.probeValue})`);
      }

      console.log(`[hmr-e2e] Cycle ${cycle}/${HMR_CYCLES} preserved session:`, {
        acceptCount: after.acceptCount,
        loopGeneration: after.loopGeneration,
        probeValue: after.probeValue,
      });
      lastAfter = after;
    }

    if (preHmrSnapshot) {
      const postHmrSnapshot = await page.evaluate(() => window.__KOTOR_HMR_TEST__.snapshotSession());
      if (postHmrSnapshot.module !== preHmrSnapshot.module) {
        throw new Error(
          `In-module session lost module name (${preHmrSnapshot.module} -> ${postHmrSnapshot.module})`,
        );
      }
      if (postHmrSnapshot.area !== preHmrSnapshot.area) {
        throw new Error(
          `In-module session lost area (${preHmrSnapshot.area} -> ${postHmrSnapshot.area})`,
        );
      }
      if (postHmrSnapshot.creatureCount !== preHmrSnapshot.creatureCount) {
        throw new Error(
          `In-module creature count changed after HMR (${preHmrSnapshot.creatureCount} -> ${postHmrSnapshot.creatureCount})`,
        );
      }
      if (!postHmrSnapshot.player || !preHmrSnapshot.player) {
        throw new Error('In-module session lost player reference after HMR');
      }
      const { x: bx, y: by, z: bz } = preHmrSnapshot.player;
      const { x: ax, y: ay, z: az } = postHmrSnapshot.player;
      if (
        Math.abs(bx - ax) > POSITION_EPSILON
        || Math.abs(by - ay) > POSITION_EPSILON
        || Math.abs(bz - az) > POSITION_EPSILON
      ) {
        throw new Error(
          `In-module player position drifted beyond epsilon ${POSITION_EPSILON} after HMR (${bx},${by},${bz}) -> (${ax},${ay},${az})`,
        );
      }

      // Liveness: the render loop must still produce frames after the swaps.
      const framesAfterHmr = await page.evaluate(() => new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames += 1;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(tick);
          } else {
            resolve(frames);
          }
        };
        requestAnimationFrame(tick);
      }));
      if (!(framesAfterHmr > 0)) {
        throw new Error('Render loop produced no frames within 1s after HMR — frozen session');
      }
      console.log('[hmr-e2e] In-module post-HMR state intact:', {
        module: postHmrSnapshot.module,
        area: postHmrSnapshot.area,
        mode: postHmrSnapshot.mode,
        creatureCount: postHmrSnapshot.creatureCount,
        framesAfterHmr,
      });
    }

    // Reload-resume phases need real assets + the dev resume snapshot path,
    // so they only run in in-module mode (skipped in synthetic CI).
    if (USE_IN_MODULE) {
      await runF5ResumePhase(page, KOTOR_HMR_E2E_MODULE);
      await runEngineEditResumePhase(page, KOTOR_HMR_E2E_MODULE, compileTracker);
    }

    console.log('HMR session preservation E2E passed:', {
      mode: USE_IN_MODULE
        ? 'real-assets-in-module'
        : USE_REAL_ASSETS
          ? 'real-assets'
          : 'synthetic',
      cycles: HMR_CYCLES,
      pageLoadId: lastAfter.pageLoadId,
      acceptCount: lastAfter.acceptCount,
      loopGeneration: lastAfter.loopGeneration,
      probeValue: lastAfter.probeValue,
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    await killProcess(server);
    try {
      await fs.writeFile(PROBE_FILE, originalProbe, 'utf8');
      await fs.writeFile(ENGINE_FILE, originalEngineSource, 'utf8');
    } catch (restoreErr) {
      console.error('[hmr-e2e] CRITICAL: failed to restore probe/engine source files:', restoreErr);
      throw restoreErr;
    }
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
