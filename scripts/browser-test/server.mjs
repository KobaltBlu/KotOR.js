import http from 'node:http';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const readable = new Set(['chitin.key', 'dialog.tlk', 'patch.erf', 'swkotor.ini', 'data', 'lips', 'modules', 'movies', 'override', 'rims', 'streammusic', 'streamsounds', 'streamwaves', 'texturepacks', 'saves', 'gameinprogress']);
const writable = new Set(['saves', 'gameinprogress']);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const fail = (status, message) => Object.assign(new Error(message), { status });
function partsOf(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\\\x00-\x1f]/.test(value) || value.startsWith('/')) throw fail(400, 'Invalid relative path');
  const parts = value.split('/').filter(Boolean);
  if (parts.some(p => p === '.' || p === '..' || p.includes(':'))) throw fail(400, 'Invalid path segment');
  return parts;
}
// Reject symlinks rather than follow them, including in existing path ancestors.
async function resolveSafe(root, parts, create = false) {
  let current = root;
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    const entries = await fs.readdir(current);
    const match = entries.find(n => n === part) ?? entries.find(n => n.toLowerCase() === part.toLowerCase());
    const next = path.join(current, match ?? part);
    if (match === undefined) {
      if (create && index === parts.length - 1) return next;
      throw fail(404, 'Not found');
    }
    if ((await fs.lstat(next)).isSymbolicLink()) throw fail(403, 'Symbolic links are not allowed');
    current = next;
  }
  return current;
}
async function copyTree(source, dest) {
  const stat = await fs.lstat(source);
  if (stat.isSymbolicLink()) throw fail(403, 'Symbolic links in save input are not allowed');
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    for (const entry of await fs.readdir(source)) await copyTree(path.join(source, entry), path.join(dest, entry));
  } else if (stat.isFile()) await fs.copyFile(source, dest);
  else throw fail(403, 'Non-regular save input');
}
async function body(req, limit = 64 * 1024 * 1024) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw fail(413, 'Request too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export async function createHarness({ gameRoot, distRoot, port = 8080, copySaves = true }) {
  gameRoot = await fs.realpath(gameRoot);
  distRoot = await fs.realpath(distRoot);
  await resolveSafe(gameRoot, ['chitin.key']);
  const stateRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kotor-browser-test-'));
  await fs.mkdir(path.join(stateRoot, 'saves'));
  await fs.mkdir(path.join(stateRoot, 'gameinprogress'));
  try {
    if (copySaves) {
      let saves;
      try { saves = await resolveSafe(gameRoot, ['saves']); } catch (e) { if (e.status !== 404) throw e; }
      if (saves) await copyTree(saves, path.join(stateRoot, 'saves'));
    }
  } catch (e) { await fs.rm(stateRoot, { recursive: true, force: true }); throw e; }
  const token = crypto.randomBytes(32).toString('hex');
  const events = [];
  const counts = { requests: 0, bytesRead: 0, writes: 0 };
  let base;
  async function target(relative, write = false, create = false) {
    const parts = partsOf(relative);
    if (!parts.length) { if (write) throw fail(403, 'Cannot write root'); return gameRoot; }
    const top = parts[0].toLowerCase();
    if (!readable.has(top) || (write && !writable.has(top))) throw fail(403, 'Path is outside the test allowlist');
    if (write && parts.length === 1) throw fail(403, 'Cannot remove or overwrite a state root');
    if (writable.has(top)) { parts[0] = top; return resolveSafe(stateRoot, parts, create); }
    return resolveSafe(gameRoot, parts, false);
  }
  const json = (res, value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  async function sendFile(req, res, filename) {
    const stat = await fs.stat(filename);
    if (!stat.isFile()) throw fail(404, 'Not a file');
    let start = 0, end = stat.size - 1, status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!match) throw fail(416, 'Unsupported range');
      start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stat.size) throw fail(416, 'Invalid range');
      status = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    }
    res.writeHead(status, { 'Content-Type': mime[path.extname(filename)] ?? 'application/octet-stream', 'Content-Length': Math.max(0, end - start + 1), 'Accept-Ranges': 'bytes' });
    if (req.method === 'HEAD' || stat.size === 0) { res.end(); return; }
    counts.bytesRead += end - start + 1;
    const stream = createReadStream(filename, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  }
  const server = http.createServer(async (req, res) => {
    try {
      counts.requests++;
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      if (!['127.0.0.1', 'localhost'].includes((req.headers.host ?? '').split(':')[0])) throw fail(403, 'Loopback Host required');
      if (req.headers['sec-fetch-site'] === 'cross-site') throw fail(403, 'Cross-site requests are forbidden');
      const url = new URL(req.url, base);
      if (url.pathname.startsWith('/__test/')) {
        if (req.headers['x-kotor-test'] !== token) throw fail(403, 'Test session authorization required');
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) throw fail(403, 'Origin mismatch');
        const relative = url.searchParams.get('path') ?? '';
        if (url.pathname === '/__test/status' && req.method === 'GET') return json(res, { counts, events, mode: 'local-assets/disposable-writes' });
        if (url.pathname === '/__test/event' && req.method === 'POST') {
          const event = JSON.parse((await body(req, 16384)).toString());
          events.push({ time: new Date().toISOString(), message: String(event.message).slice(0, 8000) });
          if (events.length > 100) events.shift();
          return json(res, { ok: true });
        }
        if (url.pathname === '/__test/meta' && req.method === 'GET') {
          const p = await target(relative); const s = await fs.stat(p);
          return json(res, { name: path.basename(p), kind: s.isDirectory() ? 'directory' : 'file', size: s.size, lastModified: s.mtimeMs });
        }
        if (url.pathname === '/__test/list' && req.method === 'GET') {
          const p = await target(relative);
          const entries = await fs.readdir(p, { withFileTypes: true });
          const result = entries.filter(e => !e.isSymbolicLink() && (e.isFile() || e.isDirectory()) && (relative || (readable.has(e.name.toLowerCase()) && !writable.has(e.name.toLowerCase())))).map(e => ({ name: e.name, kind: e.isDirectory() ? 'directory' : 'file' }));
          if (!relative) for (const name of writable) result.push({ name, kind: 'directory' });
          return json(res, result);
        }
        if (url.pathname === '/__test/file' && ['GET', 'HEAD'].includes(req.method)) return await sendFile(req, res, await target(relative));
        if (url.pathname === '/__test/file' && req.method === 'PUT') {
          const p = await target(relative, true, true);
          const data = await body(req);
          await fs.writeFile(p, data, { flag: 'w' }); counts.writes++;
          return json(res, { ok: true });
        }
        if (url.pathname === '/__test/directory' && req.method === 'PUT') {
          const parts = partsOf(relative);
          // Root state directories already exist and are allowed to be opened/created, never deleted.
          if (parts.length === 1 && writable.has(parts[0].toLowerCase())) return json(res, { ok: true });
          const p = await target(relative, true, true);
          await fs.mkdir(p, { recursive: false }).catch(e => { if (e.code !== 'EEXIST') throw e; });
          return json(res, { ok: true });
        }
        if (url.pathname === '/__test/entry' && req.method === 'DELETE') {
          const parts = partsOf(relative);
          if (parts.length === 1 && parts[0].toLowerCase() === 'gameinprogress') {
            const dir = path.join(stateRoot, 'gameinprogress');
            await fs.rm(dir, { recursive: true, force: true }); await fs.mkdir(dir);
          } else {
            const p = await target(relative, true);
            const stat = await fs.lstat(p);
            if (stat.isDirectory() && url.searchParams.get('recursive') !== 'true') await fs.rmdir(p);
            else await fs.rm(p, { recursive: stat.isDirectory(), force: false });
          }
          counts.writes++; return json(res, { ok: true });
        }
        throw fail(404, 'Unknown test operation');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw fail(405, 'Method not allowed');
      if (url.pathname === '/__desktop-audio.py') {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="kotor-desktop-audio.py"' });
        res.end(await fs.readFile(path.join(here, 'desktop-audio.py')));
        return;
      }
      if (url.pathname === '/__adapter.js') {
        const js = await fs.readFile(path.join(here, 'adapter.js'), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(`window.__KOTOR_TEST_TOKEN__=${JSON.stringify(token)};\n${js}`);
      }
      let relative = decodeURIComponent(url.pathname).replace(/^\//, '');
      if (!relative || relative.endsWith('/')) relative += relative ? 'index.html' : 'game/index.html';
      const filename = await resolveSafe(distRoot, partsOf(relative));
      if (filename.endsWith('.html')) {
        const html = await fs.readFile(filename, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(html.replace('<head>', '<head><script src="/__adapter.js"></script>'));
      }
      return await sendFile(req, res, filename);
    } catch (e) {
      if (res.headersSent) { res.destroy(); return; }
      const status = e.status ?? (e.code === 'ENOENT' ? 404 : 500);
      json(res, { error: status === 500 ? 'Test server failure' : e.message }, status);
      if (status === 500) console.error('Test server error:', e.message);
    }
  });
  try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); }); }
  catch (e) { await fs.rm(stateRoot, { recursive: true, force: true }); throw e; }
  base = `http://127.0.0.1:${server.address().port}`;
  let closed = false;
  return { server, base, stateRoot, token, async close() {
    if (closed) return; closed = true;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(stateRoot, { recursive: true, force: true });
  } };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (key, fallback) => { const n = args.indexOf(key); return n < 0 ? fallback : args[n + 1]; };
  const gameRoot = option('--game', undefined);
  if (!gameRoot) throw new Error('Usage: node scripts/browser-test/server.mjs --game /path/to/game [--port 8080] [--dist dist] [--fresh]');
  const harness = await createHarness({ gameRoot, distRoot: option('--dist', 'dist'), port: Number(option('--port', '8080')), copySaves: !args.includes('--fresh') });
  console.log(`KOTOR_BROWSER_TEST_READY ${harness.base}/game/?key=kotor`);
  console.log('Read-only asset source; disposable saves at:', harness.stateRoot);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await harness.close(); process.exit(0); });
}
