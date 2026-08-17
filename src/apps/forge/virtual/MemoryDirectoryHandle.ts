/**
 * In-memory File System Access handles for session-only virtual folders.
 *
 * @file MemoryDirectoryHandle.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

function notFoundError(name: string): Error {
  const err = new Error(`NotFoundError: ${name}`);
  err.name = "NotFoundError";
  return err;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (let i = 0; i < chunks.length; i++) {
    total += chunks[i].byteLength;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    out.set(chunks[i], offset);
    offset += chunks[i].byteLength;
  }
  return out;
}

async function toUint8Array(data: unknown): Promise<Uint8Array> {
  if (data == null) {
    return new Uint8Array(0);
  }
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }
  if (data instanceof Uint8Array) {
    return data.slice();
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data.slice(0));
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
  }
  if (typeof (data as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === "function") {
    return new Uint8Array(await (data as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer());
  }
  return new Uint8Array(0);
}

export class MemoryFileNode {
  data: Uint8Array;

  constructor(data: Uint8Array = new Uint8Array()) {
    this.data = data;
  }
}

export class MemoryDirectoryNode {
  readonly dirs: Map<string, MemoryDirectoryNode> = new Map();
  readonly files: Map<string, MemoryFileNode> = new Map();

  findDir(name: string): { key: string; node: MemoryDirectoryNode } | undefined {
    const lower = name.toLowerCase();
    for (const [key, node] of this.dirs) {
      if (key.toLowerCase() === lower) {
        return { key, node };
      }
    }
    return undefined;
  }

  findFile(name: string): { key: string; node: MemoryFileNode } | undefined {
    const lower = name.toLowerCase();
    for (const [key, node] of this.files) {
      if (key.toLowerCase() === lower) {
        return { key, node };
      }
    }
    return undefined;
  }
}

class MemoryWritableFileStream {
  private chunks: Uint8Array[] = [];

  constructor(private readonly onClose: (data: Uint8Array) => void) {}

  async write(data: unknown): Promise<void> {
    this.chunks.push(await toUint8Array(data));
  }

  async close(): Promise<void> {
    this.onClose(concatBytes(this.chunks));
    this.chunks = [];
  }

  async abort(): Promise<void> {
    this.chunks = [];
  }
}

export class MemoryFileHandle {
  readonly kind = "file" as const;
  readonly name: string;
  private readonly node: MemoryFileNode;

  constructor(name: string, node: MemoryFileNode) {
    this.name = name;
    this.node = node;
  }

  async getFile(): Promise<{ name: string; arrayBuffer: () => Promise<ArrayBuffer> }> {
    const copy = this.node.data.slice();
    return {
      name: this.name,
      arrayBuffer: async () => copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength),
    };
  }

  async createWritable(): Promise<MemoryWritableFileStream> {
    return new MemoryWritableFileStream((data) => {
      this.node.data = data;
    });
  }
}

export class MemoryDirectoryHandle {
  readonly kind = "directory" as const;
  readonly name: string;
  private readonly node: MemoryDirectoryNode;

  constructor(name: string, node: MemoryDirectoryNode = new MemoryDirectoryNode()) {
    this.name = name;
    this.node = node;
  }

  async queryPermission(_descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState> {
    return "granted";
  }

  async requestPermission(_descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState> {
    return "granted";
  }

  async getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<MemoryDirectoryHandle> {
    const existing = this.node.findDir(name);
    if (existing) {
      return new MemoryDirectoryHandle(existing.key, existing.node);
    }
    if (options?.create) {
      const created = new MemoryDirectoryNode();
      this.node.dirs.set(name, created);
      return new MemoryDirectoryHandle(name, created);
    }
    throw notFoundError(name);
  }

  async getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<MemoryFileHandle> {
    const existing = this.node.findFile(name);
    if (existing) {
      return new MemoryFileHandle(existing.key, existing.node);
    }
    if (options?.create) {
      const created = new MemoryFileNode();
      this.node.files.set(name, created);
      return new MemoryFileHandle(name, created);
    }
    throw notFoundError(name);
  }

  async *values(): AsyncGenerator<MemoryDirectoryHandle | MemoryFileHandle> {
    for (const [name, dir] of this.node.dirs) {
      yield new MemoryDirectoryHandle(name, dir);
    }
    for (const [name, file] of this.node.files) {
      yield new MemoryFileHandle(name, file);
    }
  }

  async removeEntry(name: string, options?: { recursive?: boolean }): Promise<void> {
    const file = this.node.findFile(name);
    if (file) {
      this.node.files.delete(file.key);
      return;
    }
    const dir = this.node.findDir(name);
    if (dir) {
      if (!options?.recursive && (dir.node.dirs.size > 0 || dir.node.files.size > 0)) {
        const err = new Error("InvalidModificationError: directory not empty");
        err.name = "InvalidModificationError";
        throw err;
      }
      this.node.dirs.delete(dir.key);
      return;
    }
    throw notFoundError(name);
  }
}
