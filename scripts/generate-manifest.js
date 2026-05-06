const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIST = path.resolve(__dirname, '../dist');
const { version } = require('../package.json');

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return 'sha256-' + crypto.createHash('sha256').update(buf).digest('hex');
}

function walkDir(dir, base, files = {}) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel  = path.relative(base, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      walkDir(full, base, files);
    } else if (rel !== 'manifest.json') {
      files[rel] = { hash: hashFile(full), size: fs.statSync(full).size };
    }
  }
  return files;
}

const manifest = {
  version,
  timestamp: Math.floor(Date.now() / 1000),
  files: walkDir(DIST, DIST),
};

fs.writeFileSync(
  path.join(DIST, 'web-manifest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log(`web-manifest.json written (${Object.keys(manifest.files).length} files, v${version})`);
