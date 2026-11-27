(() => {
  'use strict';
  const token = window.__KOTOR_TEST_TOKEN__;
  delete window.__KOTOR_TEST_TOKEN__;
  const join = (parent, name) => {
    if (!name || /[\\/]/.test(name) || name === '.' || name === '..') throw new TypeError('Single path segment required');
    return parent ? parent + '/' + name : name;
  };
  async function request(operation, pathname = '', options = {}) {
    const url = `/__test/${operation}?path=${encodeURIComponent(pathname)}${options.recursive ? '&recursive=true' : ''}`;
    const response = await fetch(url, { method: options.method ?? 'GET', headers: { 'X-Kotor-Test': token, ...options.headers }, body: options.body });
    if (!response.ok) throw new DOMException((await response.json()).error, response.status === 404 ? 'NotFoundError' : 'NotAllowedError');
    return response;
  }
  const metadata = async p => (await request('meta', p)).json();
  const blockSize = 1024 * 1024;
  const blocks = new Map();
  async function readBytes(file) {
    const result = new Uint8Array(file.size);
    for (let offset = file.start; offset < file.end;) {
      const block = Math.floor(offset / blockSize);
      const key = `${file.path}:${file.lastModified}:${block}`;
      let pending = blocks.get(key);
      if (!pending) {
        const first = block * blockSize;
        const last = Math.min(first + blockSize, file.totalSize) - 1;
        pending = request('file', file.path, { headers: { Range: `bytes=${first}-${last}` } }).then(r => r.arrayBuffer());
        blocks.set(key, pending);
        pending.catch(() => { if (blocks.get(key) === pending) blocks.delete(key); });
      } else { blocks.delete(key); blocks.set(key, pending); }
      while (blocks.size > 64) blocks.delete(blocks.keys().next().value);
      const bytes = new Uint8Array(await pending);
      const local = offset - block * blockSize;
      const count = Math.min(bytes.length - local, file.end - offset);
      if (count <= 0) throw new Error('Short archive range response');
      result.set(bytes.subarray(local, local + count), offset - file.start);
      offset += count;
    }
    return result.buffer;
  }
  function invalidate(p) {
    for (const key of blocks.keys()) if (key.startsWith(p + ':')) blocks.delete(key);
  }
  class Handle {
    constructor(p, kind) { this._path = p; this.kind = kind; this.name = p.split('/').pop() || 'Local K1 test installation'; }
    async queryPermission() { return 'granted'; }
    async requestPermission() { return 'granted'; }
    async isSameEntry(other) { return other?._path === this._path && other?.kind === this.kind; }
  }
  class LazyFile {
    constructor(p, meta, start = 0, end = meta.size) { this.path = p; this.name = meta.name; this.lastModified = meta.lastModified; this.totalSize = meta.totalSize ?? meta.size; this.type = ''; this.start = start; this.end = end; this.size = end - start; }
    slice(start = 0, end = this.size) {
      const normalize = n => Math.min(this.size, Math.max(0, n < 0 ? this.size + n : n));
      const a = normalize(start), b = Math.max(a, normalize(end));
      return new LazyFile(this.path, this, this.start + a, this.start + b);
    }
    async arrayBuffer() {
      if (!this.size) return new ArrayBuffer(0);
      return readBytes(this);
    }
    async text() { return new TextDecoder().decode(await this.arrayBuffer()); }
  }
  class LocalFileHandle extends Handle {
    constructor(p) { super(p, 'file'); }
    async getFile() { return new LazyFile(this._path, await metadata(this._path)); }
    async createWritable({ keepExistingData = false } = {}) {
      let blob = keepExistingData ? new Blob([await (await this.getFile()).arrayBuffer()]) : new Blob();
      let position = 0, closed = false;
      const check = () => { if (closed) throw new DOMException('Stream closed', 'InvalidStateError'); };
      const stream = {
        async write(value) {
          check();
          if (value && value.type === 'seek') { position = value.position; return; }
          if (value && value.type === 'truncate') { await stream.truncate(value.size); return; }
          let data = value;
          if (value && value.type === 'write') { if (value.position !== undefined) position = value.position; data = value.data; }
          const next = new Blob([data]);
          blob = new Blob([blob.slice(0, position), ...(position > blob.size ? [new Uint8Array(position - blob.size)] : []), next, blob.slice(position + next.size)]);
          position += next.size;
        },
        async seek(p) { check(); position = p; },
        async truncate(size) { check(); blob = new Blob([blob.slice(0, size), ...(size > blob.size ? [new Uint8Array(size - blob.size)] : [])]); position = Math.min(position, size); },
        async close() { check(); await request('file', thisPath, { method: 'PUT', body: blob }); invalidate(thisPath); closed = true; },
        async abort() { closed = true; }
      };
      const thisPath = this._path;
      return stream;
    }
    async remove() { await request('entry', this._path, { method: 'DELETE' }); invalidate(this._path); }
  }
  class LocalDirectoryHandle extends Handle {
    constructor(p = '') { super(p, 'directory'); }
    async getDirectoryHandle(name, { create = false } = {}) {
      const p = join(this._path, name);
      if (create) await request('directory', p, { method: 'PUT' });
      const meta = await metadata(p);
      if (meta.kind !== 'directory') throw new DOMException('Not a directory', 'TypeMismatchError');
      return new LocalDirectoryHandle(p);
    }
    async getFileHandle(name, { create = false } = {}) {
      const p = join(this._path, name);
      let meta;
      try { meta = await metadata(p); }
      catch (e) { if (!create || e.name !== 'NotFoundError') throw e; await request('file', p, { method: 'PUT', body: new Uint8Array() }); meta = await metadata(p); }
      if (meta.kind !== 'file') throw new DOMException('Not a file', 'TypeMismatchError');
      return new LocalFileHandle(p);
    }
    async *values() {
      const entries = await (await request('list', this._path)).json();
      for (const e of entries) yield e.kind === 'directory' ? new LocalDirectoryHandle(join(this._path, e.name)) : new LocalFileHandle(join(this._path, e.name));
    }
    async *entries() { for await (const handle of this.values()) yield [handle.name, handle]; }
    [Symbol.asyncIterator]() { return this.entries(); }
    async *keys() { for await (const handle of this.values()) yield handle.name; }
    async removeEntry(name, options = {}) { await request('entry', join(this._path, name), { method: 'DELETE', recursive: !!options.recursive }); }
    async resolve(other) { const prefix = this._path ? this._path + '/' : ''; return other._path.startsWith(prefix) ? other._path.slice(prefix.length).split('/').filter(Boolean) : null; }
  }
  // Only this opt-in server injects these test handles. Normal browser builds remain unchanged.
  window.FileSystemFileHandle = LocalFileHandle;
  window.FileSystemDirectoryHandle = LocalDirectoryHandle;
  window.showDirectoryPicker = async () => new LocalDirectoryHandle();
  window.__kotorBrowserTest = {
    mode: 'Local asset adapter; disposable save writes; not native File System Access API',
    status: async () => (await request('status')).json(),
  };
  function record(message) { void request('event', '', { method: 'POST', body: JSON.stringify({ message: String(message) }) }).catch(() => {}); }
  window.addEventListener('error', e => record(`${e.message}\n${e.error?.stack || ''}`));
  window.addEventListener('unhandledrejection', e => record(`Unhandled rejection: ${e.reason?.stack || e.reason}`));
  window.addEventListener('DOMContentLoaded', () => {
    const badge = document.createElement('div');
    badge.textContent = 'LOCAL GAME TEST · disposable saves';
    badge.style.cssText = 'position:fixed;top:0;left:0;z-index:2147483647;background:#13232c;color:#a4e9ff;padding:3px 8px;font:11px sans-serif;pointer-events:none';
    document.body.appendChild(badge);
  });
})();
