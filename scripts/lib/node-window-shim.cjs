// Minimal window shim so engine modules that touch `window` at import time load under Node
// (mirrors src/tests/jest.setup.ts).
const g = globalThis;
if (typeof g.window === 'undefined') {
  g.window = g;
  g.window.innerWidth = 1280;
  g.window.innerHeight = 720;
  g.window.addEventListener = g.window.addEventListener || (() => {});
  g.window.removeEventListener = g.window.removeEventListener || (() => {});
  g.window.dispatchEvent = g.window.dispatchEvent || (() => true);
  g.window.devicePixelRatio = 1;
}
