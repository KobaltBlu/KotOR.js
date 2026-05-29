const fs = require('fs');
const path = require('path');

/**
 * Dev-only middleware: expose a local KOTOR install to the browser game client
 * when File System Access API directory picking is unavailable (automation/HMR).
 */
function createDevGameFsMiddleware(gameDir) {
  const root = path.resolve(gameDir);

  function resolveSafe(relativePath) {
    const normalized = String(relativePath || '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    const full = path.resolve(root, normalized);
    if (full !== root && !full.startsWith(root + path.sep)) {
      return null;
    }
    return full;
  }

  return (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/__kotor_dev_fs')) {
      next();
      return;
    }

    const action = url.searchParams.get('action') || 'read';
    const relPath = url.searchParams.get('path') || '';
    const full = resolveSafe(relPath);
    if (!full) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    if (action === 'exists') {
      fs.stat(full, (err, stats) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ exists: !err && stats.isFile() }));
      });
      return;
    }

    if (action === 'stat') {
      fs.stat(full, (err, stats) => {
        res.setHeader('Content-Type', 'application/json');
        if (err) {
          res.end(JSON.stringify({ exists: false, isDirectory: false, isFile: false }));
          return;
        }
        res.end(JSON.stringify({
          exists: true,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
        }));
      });
      return;
    }

    if (action === 'readdir') {
      fs.readdir(full, { withFileTypes: true }, (err, entries) => {
        if (err) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const names = entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ entries: names }));
      });
      return;
    }

    if (action === 'read') {
      fs.readFile(full, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        res.setHeader('Content-Type', 'application/octet-stream');
        res.end(data);
      });
      return;
    }

    res.statusCode = 400;
    res.end('Unknown action');
  };
}

module.exports = { createDevGameFsMiddleware };
