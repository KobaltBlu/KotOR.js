import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// The middleware is a CommonJS dev-only module; require it directly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createDevGameFsMiddleware } = require('./dev-game-fs-middleware.js');

interface InvokeResult {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  passedThrough?: boolean;
}

function invoke(
  middleware: (req: unknown, res: unknown, next: () => void) => void,
  url: string,
  remoteAddress = '127.0.0.1',
): Promise<InvokeResult> {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      setHeader(key: string, value: string) {
        this.headers[key.toLowerCase()] = value;
      },
      end(data: unknown) {
        resolve({ statusCode: this.statusCode, headers: this.headers, body: data });
      },
    };
    const req = { url, socket: { remoteAddress } };
    middleware(req, res, () => resolve({ statusCode: 0, headers: {}, body: undefined, passedThrough: true }));
  });
}

describe('dev-game-fs-middleware', () => {
  let root: string;
  let outside: string;
  let middleware: (req: unknown, res: unknown, next: () => void) => void;

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'kotor-fs-root-'));
    outside = fs.mkdtempSync(path.join(os.tmpdir(), 'kotor-fs-out-'));

    fs.writeFileSync(path.join(root, 'chitin.key'), Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    fs.mkdirSync(path.join(root, 'rims'));
    fs.writeFileSync(path.join(root, 'rims', 'global.rim'), Buffer.from('RIMV'));
    fs.writeFileSync(path.join(outside, 'secret.txt'), 'top secret');

    // Symlink inside root that escapes to a directory outside root — the realpath guard must reject reads through it.
    try {
      fs.symlinkSync(outside, path.join(root, 'escape'), 'dir');
    } catch {
      // Symlink creation may be unavailable on some CI runners; the escape test guards for this.
    }

    // Sparse file larger than MAX_WHOLE_FILE_BYTES (64 MiB) without writing 64 MiB of data.
    const huge = path.join(root, 'huge.bif');
    const fd = fs.openSync(huge, 'w');
    fs.ftruncateSync(fd, 65 * 1024 * 1024);
    fs.closeSync(fd);

    middleware = createDevGameFsMiddleware(root);
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });

  it('stat returns exists/isFile and the file size', async () => {
    const result = await invoke(middleware, '/__kotor_dev_fs?action=stat&path=chitin.key');
    const data = JSON.parse(String(result.body)) as { exists: boolean; isFile: boolean; size: number };
    expect(data.exists).toBe(true);
    expect(data.isFile).toBe(true);
    expect(data.size).toBe(10);
  });

  it('read with offset/length returns only the requested byte window', async () => {
    const result = await invoke(middleware, '/__kotor_dev_fs?action=read&path=chitin.key&offset=2&length=3');
    expect(result.statusCode).toBe(200);
    expect(Array.from(result.body as Buffer)).toEqual([2, 3, 4]);
  });

  it('readdir lists files and marks directories with a trailing slash', async () => {
    const result = await invoke(middleware, '/__kotor_dev_fs?action=readdir&path=');
    const data = JSON.parse(String(result.body)) as { entries: string[] };
    expect(data.entries).toContain('chitin.key');
    expect(data.entries).toContain('rims/');
  });

  it('does not serve files outside the game root via ../ traversal', async () => {
    const result = await invoke(middleware, '/__kotor_dev_fs?action=stat&path=../../etc/passwd');
    // Normalization strips '..', so the path resolves inside root and simply does not exist.
    const data = JSON.parse(String(result.body)) as { exists: boolean };
    expect(data.exists).toBe(false);
  });

  it('rejects reads through a symlink that escapes the game root (403)', async () => {
    if (!fs.existsSync(path.join(root, 'escape'))) {
      return; // Symlink unavailable on this platform; skip.
    }
    const result = await invoke(middleware, '/__kotor_dev_fs?action=read&path=escape/secret.txt');
    expect(result.statusCode).toBe(403);
  });

  it('refuses a whole-file read above the size limit (413) but allows ranged reads', async () => {
    const whole = await invoke(middleware, '/__kotor_dev_fs?action=read&path=huge.bif');
    expect(whole.statusCode).toBe(413);

    const ranged = await invoke(middleware, '/__kotor_dev_fs?action=read&path=huge.bif&offset=0&length=4');
    expect(ranged.statusCode).toBe(200);
    expect((ranged.body as Buffer).length).toBe(4);
  });

  it('rejects a ranged read whose length would allocate an oversized buffer (413)', async () => {
    const result = await invoke(middleware, '/__kotor_dev_fs?action=read&path=chitin.key&offset=0&length=2000000000');
    expect(result.statusCode).toBe(413);
  });

  it('rejects a ranged read with negative offset/length (400)', async () => {
    const result = await invoke(middleware, '/__kotor_dev_fs?action=read&path=chitin.key&offset=-1&length=4');
    expect(result.statusCode).toBe(400);
  });

  it('rejects non-localhost clients before touching disk (403)', async () => {
    const result = await invoke(
      middleware,
      '/__kotor_dev_fs?action=stat&path=chitin.key',
      '192.168.1.50',
    );
    expect(result.statusCode).toBe(403);
    expect(String(result.body)).toContain('localhost-only');
  });

  it('resolves paths case-insensitively (movies vs Movies)', async () => {
    fs.mkdirSync(path.join(root, 'movies'));
    fs.writeFileSync(path.join(root, 'movies', 'leclogo.bik'), Buffer.from('BIK'));

    const result = await invoke(middleware, '/__kotor_dev_fs?action=stat&path=Movies/leclogo.bik');
    const data = JSON.parse(String(result.body)) as { exists: boolean; isFile: boolean };
    expect(data.exists).toBe(true);
    expect(data.isFile).toBe(true);
  });
});
