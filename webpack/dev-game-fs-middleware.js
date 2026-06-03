const fs = require('fs');
const path = require('path');

/**
 * Upper bound for whole-file (non-ranged) reads. Large archives (BIF/RIM) must be
 * read via ranged requests; buffering a multi-hundred-MB file whole would OOM both
 * this server and the browser. Ranged reads are unaffected by this limit.
 */
const MAX_WHOLE_FILE_BYTES = 64 * 1024 * 1024;

const LOCALHOST_ADDRESSES = new Set([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
]);

function isLocalhostRequest(req) {
  const addr = req?.socket?.remoteAddress || '';
  return LOCALHOST_ADDRESSES.has(addr);
}

/**
 * Dev-only middleware: expose a local KOTOR install to the browser game client
 * when File System Access API directory picking is unavailable (automation/HMR).
 */
function createDevGameFsMiddleware(gameDir) {
  const root = path.resolve(gameDir);
  let realRoot;
  try {
    realRoot = fs.realpathSync(root);
  } catch {
    realRoot = root;
  }

  function resolveSafe(relativePath) {
    const normalized = String(relativePath || '')
      .replace(/\\/g, '/')
      .replace(/\.\.\//g, '')
      .replace(/\.\./g, '')
      .replace(/^\/+/, '');
    const full = path.resolve(root, normalized);
    if (full !== root && !full.startsWith(root + path.sep)) {
      return null;
    }
    try {
      const realFull = fs.realpathSync(full);
      if (realFull !== realRoot && !realFull.startsWith(realRoot + path.sep)) {
        return null;
      }
      return realFull;
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        return full;
      }
      return null;
    }
  }

  return (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/__kotor_dev_fs')) {
      next();
      return;
    }

    if (!isLocalhostRequest(req)) {
      res.statusCode = 403;
      res.end('Forbidden: dev game FS is localhost-only');
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
          size: stats.size,
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
      const offsetParam = url.searchParams.get('offset');
      const lengthParam = url.searchParams.get('length');
      const hasRange = offsetParam !== null && lengthParam !== null;
      const offset = hasRange ? Number(offsetParam) : 0;
      const length = hasRange ? Number(lengthParam) : null;

      if (hasRange && (!Number.isFinite(offset) || !Number.isFinite(length) || offset < 0 || length < 0)) {
        res.statusCode = 400;
        res.end('Invalid offset or length');
        return;
      }

      if (hasRange && length > MAX_WHOLE_FILE_BYTES) {
        res.statusCode = 413;
        res.end(
          `Requested range length ${length} exceeds ${MAX_WHOLE_FILE_BYTES}. Read large archives in smaller windows.`,
        );
        return;
      }

      if (hasRange) {
        fs.open(full, 'r', (openErr, fd) => {
          if (openErr) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          const buffer = Buffer.alloc(length);
          fs.read(fd, buffer, 0, length, offset, (readErr, bytesRead) => {
            fs.close(fd, () => {
              if (readErr) {
                res.statusCode = 500;
                res.end('Read failed');
                return;
              }
              res.setHeader('Content-Type', 'application/octet-stream');
              res.end(buffer.subarray(0, bytesRead));
            });
          });
        });
        return;
      }

      fs.stat(full, (statErr, stats) => {
        if (statErr) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        if (stats.size > MAX_WHOLE_FILE_BYTES) {
          res.statusCode = 413;
          res.end(
            `File too large for whole-file read: ${stats.size} bytes exceeds ${MAX_WHOLE_FILE_BYTES}. Use a ranged read (offset/length).`,
          );
          return;
        }
        fs.readFile(full, (err, data) => {
          if (err) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          res.setHeader('Content-Type', 'application/octet-stream');
          res.end(data);
        });
      });
      return;
    }

    res.statusCode = 400;
    res.end('Unknown action');
  };
}

module.exports = { createDevGameFsMiddleware };
