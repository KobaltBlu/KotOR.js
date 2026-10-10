/**
 * Shared Jest setup for KotOR.js tests.
 * Keep this light — per-test mocks stay in individual suites.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Node suites pull modules that assign to `window` or read window metrics at import time.
if (typeof (globalThis as any).window === 'undefined') {
  const g = globalThis as any;
  g.window = g;
  g.window.innerWidth = 1280;
  g.window.innerHeight = 720;
  g.window.addEventListener = g.window.addEventListener || (() => {});
  g.window.removeEventListener = g.window.removeEventListener || (() => {});
  g.window.dispatchEvent = g.window.dispatchEvent || (() => true);
  if (typeof g.crypto === 'undefined') {
    g.crypto = require('crypto').webcrypto;
  }
  g.window.crypto = g.crypto;
}
