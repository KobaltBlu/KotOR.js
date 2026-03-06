/**
 * InMemoryFileSystemAccess.ts
 *
 * In-memory implementation of the File System Access API interfaces
 * (FileSystemDirectoryHandle, FileSystemFileHandle, FileSystemWritableFileStream).
 *
 * Used by unit tests to simulate browser file-system operations without real I/O.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file InMemoryFileSystemAccess.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

// ---------------------------------------------------------------------------
// InMemoryFile – holds raw bytes for a single file
// ---------------------------------------------------------------------------

class InMemoryFile {
  name: string;
  private _data: Uint8Array = new Uint8Array(0);

  constructor(name: string) {
    this.name = name;
  }

  setData(data: Uint8Array): void {
    this._data = new Uint8Array(data);
  }

  getData(): Uint8Array {
    return this._data;
  }

  /** Returns a browser File-like object. */
  async getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; slice(start: number, end: number): { arrayBuffer(): Promise<ArrayBuffer> } }> {
    const data = this._data;
    return {
      arrayBuffer: async () => {
        const copy = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        return copy as ArrayBuffer;
      },
      slice: (start: number, end: number) => ({
        arrayBuffer: async () => {
          const sliced = data.slice(start, end);
          const copy = sliced.buffer.slice(sliced.byteOffset, sliced.byteOffset + sliced.byteLength);
          return copy as ArrayBuffer;
        },
      }),
    };
  }
}

// ---------------------------------------------------------------------------
// InMemoryWritableStream
// ---------------------------------------------------------------------------

class InMemoryWritableStream {
  private _file: InMemoryFile;
  private _chunks: Uint8Array[] = [];

  constructor(file: InMemoryFile) {
    this._file = file;
  }

  async write(data: Uint8Array | ArrayBuffer | string): Promise<void> {
    if (data instanceof Uint8Array) {
      this._chunks.push(data);
    } else if (data instanceof ArrayBuffer) {
      this._chunks.push(new Uint8Array(data));
    } else {
      this._chunks.push(new TextEncoder().encode(data));
    }
  }

  async close(): Promise<void> {
    const totalLength = this._chunks.reduce((acc, c) => acc + c.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this._chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    this._file.setData(combined);
    this._chunks = [];
  }
}

// ---------------------------------------------------------------------------
// InMemoryFileHandle – FileSystemFileHandle stand-in
// ---------------------------------------------------------------------------

export class InMemoryFileHandle {
  readonly kind = 'file' as const;
  name: string;
  private _file: InMemoryFile;

  constructor(name: string, file: InMemoryFile) {
    this.name = name;
    this._file = file;
  }

  async getFile() {
    return this._file.getFile();
  }

  async createWritable(): Promise<InMemoryWritableStream> {
    return new InMemoryWritableStream(this._file);
  }
}

// ---------------------------------------------------------------------------
// InMemoryDirectoryHandle – FileSystemDirectoryHandle stand-in
// ---------------------------------------------------------------------------

export class InMemoryDirectoryHandle {
  readonly kind = 'directory' as const;
  name: string;

  private _dirs: Map<string, InMemoryDirectoryHandle> = new Map();
  private _files: Map<string, InMemoryFile> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  /** Retrieve or optionally create a sub-directory. */
  async getDirectoryHandle(
    name: string,
    options: { create?: boolean } = {},
  ): Promise<InMemoryDirectoryHandle> {
    if (this._dirs.has(name)) {
      return this._dirs.get(name)!;
    }
    if (options.create) {
      const dir = new InMemoryDirectoryHandle(name);
      this._dirs.set(name, dir);
      return dir;
    }
    throw new DOMException(`Directory "${name}" not found`, 'NotFoundError');
  }

  /** Retrieve or optionally create a file handle. */
  async getFileHandle(
    name: string,
    options: { create?: boolean } = {},
  ): Promise<InMemoryFileHandle> {
    if (this._files.has(name)) {
      return new InMemoryFileHandle(name, this._files.get(name)!);
    }
    if (options.create) {
      const file = new InMemoryFile(name);
      this._files.set(name, file);
      return new InMemoryFileHandle(name, file);
    }
    throw new DOMException(`File "${name}" not found`, 'NotFoundError');
  }

  /** Async iterator over directory entries (dirs first, then files). */
  async *values(): AsyncGenerator<InMemoryDirectoryHandle | InMemoryFileHandle> {
    for (const [, dir] of this._dirs) {
      yield dir;
    }
    for (const [name, file] of this._files) {
      yield new InMemoryFileHandle(name, file);
    }
  }

  /** Remove a named entry (file or directory). */
  async removeEntry(name: string, options: { recursive?: boolean } = {}): Promise<void> {
    if (this._dirs.has(name)) {
      this._dirs.delete(name);
      return;
    }
    if (this._files.has(name)) {
      this._files.delete(name);
      return;
    }
    throw new DOMException(`Entry "${name}" not found`, 'NotFoundError');
  }
}
