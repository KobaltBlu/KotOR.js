/**
 * Jest transformer: convert Three.js ESM build files to CJS via esbuild.
 * Required since three@0.186's three.cjs re-exports ESM (require(esm)).
 */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

let threeVersion = 'unknown';
try {
  threeVersion = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'node_modules/three/package.json'), 'utf8')
  ).version;
} catch (_e) { /* ignore */ }

module.exports = {
  process(_src, filename) {
    const result = esbuild.buildSync({
      entryPoints: [filename],
      bundle: true,
      write: false,
      format: 'cjs',
      platform: 'node',
      target: 'node18',
      logLevel: 'silent',
    });
    return { code: result.outputFiles[0].text };
  },
  getCacheKey(_src, filename, configString) {
    return [path.basename(filename), threeVersion, configString, 'esbuild-cjs-v1'].join('::');
  },
};
