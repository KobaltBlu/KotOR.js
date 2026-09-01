/**
 * CSWMessage — port of retail message buffer.
 *
 * Byte-aligned client/server message buffer (not classic NWN bit-packing).
 * CreateWriteMessage reserves 3 header bytes; Send* stamps 'P'/'p' + major + minor.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CSWMessage.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type MessageVector3 = { x: number; y: number; z: number };

const INITIAL_WRITE_CAPACITY = 0x80;
const RESREF_MAX = 16;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Retail CSWMessage write/read buffer.
 */
export class CSWMessage {
  writeBuffer: Uint8Array;
  writeBufferSize: number = INITIAL_WRITE_CAPACITY;
  writeIndex: number = 0;
  /** Retail field — bytes written since CreateWriteMessage payload start. */
  bytesWritten: number = 0;
  writingMessage: boolean = false;

  readBuffer: Uint8Array | null = null;
  readBufferSize: number = 0;
  readIndex: number = 0;

  /** Retail field — often player id / 0xffffffff. */
  messageContext: number = 0xffffffff;
  /** Retail field. */
  messageFlag: number = 0;

  constructor() {
    this.writeBuffer = new Uint8Array(INITIAL_WRITE_CAPACITY);
  }

  /** Retail ClearReadMessage — seek read cursor to end. */
  clearReadMessage(): void {
    this.readIndex = this.readBufferSize;
  }

  /**
   * Retail SetReadMessage.
   * @param message Payload bytes (after the 3-byte header when called from dispatchers).
   */
  setReadMessage(
    message: Uint8Array,
    messageSize: number = message.length,
    context: number = 0xffffffff,
    flag: number = 1
  ): void {
    this.messageContext = context;
    this.readBuffer = message;
    this.messageFlag = flag;
    this.readBufferSize = messageSize;
    this.readIndex = 0;
  }

  /** Retail MessageReadOverflow. */
  messageReadOverflow(): boolean {
    return this.readBufferSize < this.readIndex;
  }

  /** Retail MessageReadUnderflow (same predicate as MoreDataToRead). */
  messageReadUnderflow(): boolean {
    return this.readIndex < this.readBufferSize;
  }

  /** Retail MessageMoreDataToRead. */
  messageMoreDataToRead(): boolean {
    return this.readIndex < this.readBufferSize;
  }

  /** Retail ExtendWriteBuffer. */
  extendWriteBuffer(needed: number): void {
    const newSize = needed + 0x80 + this.writeBufferSize;
    const next = new Uint8Array(newSize);
    next.set(this.writeBuffer.subarray(0, this.writeIndex));
    this.writeBuffer = next;
    this.writeBufferSize = newSize;
  }

  private ensureWrite(extra: number): void {
    if (this.writeBufferSize < this.writeIndex + extra) {
      this.extendWriteBuffer(extra);
    }
  }

  /**
   * Retail CreateWriteMessage — reserves 3 header bytes.
   */
  createWriteMessage(messageSize: number = 0, context: number = 0xffffffff, flag: number = 1): void {
    this.messageFlag = flag;
    this.messageContext = context;
    this.writingMessage = true;
    this.writeIndex = 3;
    this.bytesWritten = 0;
    if (this.writeBufferSize < messageSize + 3) {
      this.extendWriteBuffer(messageSize + 3 - this.writeBufferSize);
    }
  }

  /**
   * Retail GetWriteMessage.
   * Returns the write buffer view and total size (including 3-byte header slot).
   */
  getWriteMessage(): { ok: boolean; buffer: Uint8Array; size: number } {
    this.writingMessage = false;
    const size = this.writeIndex;
    if (size === 0) {
      return { ok: false, buffer: new Uint8Array(4), size: 0 };
    }
    return { ok: true, buffer: this.writeBuffer.subarray(0, size), size };
  }

  /**
   * Retail WriteBOOL — stores a raw 4-byte int (callers pass 0/1 for booleans;
   * client also uses this to write OBJECTIDs).
   */
  writeBOOL(value: boolean | number): void {
    this.ensureWrite(4);
    const view = new DataView(this.writeBuffer.buffer, this.writeBuffer.byteOffset);
    const intVal = typeof value === "boolean" ? (value ? 1 : 0) : (value | 0);
    view.setInt32(this.writeIndex, intVal, true);
    this.writeIndex += 4;
    this.bytesWritten += 4;
  }

  /** Retail WriteBYTE. */
  writeBYTE(value: number): void {
    this.ensureWrite(1);
    this.writeBuffer[this.writeIndex] = value & 0xff;
    this.writeIndex += 1;
    this.bytesWritten += 1;
  }

  /** Retail WriteWORD. */
  writeWORD(value: number): void {
    this.ensureWrite(2);
    const view = new DataView(this.writeBuffer.buffer, this.writeBuffer.byteOffset);
    view.setUint16(this.writeIndex, value & 0xffff, true);
    this.writeIndex += 2;
    this.bytesWritten += 2;
  }

  /** Retail WriteDWORD. */
  writeDWORD(value: number): void {
    this.ensureWrite(4);
    const view = new DataView(this.writeBuffer.buffer, this.writeBuffer.byteOffset);
    view.setInt32(this.writeIndex, value | 0, true);
    this.writeIndex += 4;
    this.bytesWritten += 4;
  }

  /** Retail WriteFLOAT (second retail arg unused). */
  writeFLOAT(value: number, _unused?: number): void {
    this.ensureWrite(4);
    const view = new DataView(this.writeBuffer.buffer, this.writeBuffer.byteOffset);
    view.setFloat32(this.writeIndex, value, true);
    this.writeIndex += 4;
    this.bytesWritten += 4;
  }

  /** Retail WriteCExoString — DWORD length + raw bytes (no null). */
  writeCExoString(value: string): void {
    const bytes = textEncoder.encode(value ?? "");
    this.ensureWrite(4 + bytes.length);
    const view = new DataView(this.writeBuffer.buffer, this.writeBuffer.byteOffset);
    view.setUint32(this.writeIndex, bytes.length, true);
    this.writeIndex += 4;
    this.bytesWritten += 4;
    this.writeBuffer.set(bytes, this.writeIndex);
    this.writeIndex += bytes.length;
    this.bytesWritten += bytes.length;
  }

  /**
   * Retail WriteCResRef — fixed-width padded ResRef bytes.
   * @param size Usually 16.
   */
  writeCResRef(resref: string, size: number = RESREF_MAX): void {
    this.ensureWrite(size);
    const padded = new Uint8Array(size);
    const bytes = textEncoder.encode((resref ?? "").toLowerCase().slice(0, size));
    padded.set(bytes);
    this.writeBuffer.set(padded, this.writeIndex);
    this.writeIndex += size;
    this.bytesWritten += size;
  }

  /** Retail WriteVOIDPtr. */
  writeVOIDPtr(data: Uint8Array, size: number = data.length): void {
    this.ensureWrite(size);
    this.writeBuffer.set(data.subarray(0, size), this.writeIndex);
    this.writeIndex += size;
    this.bytesWritten += size;
  }

  /** Retail WriteVector. */
  writeVector(v: MessageVector3): void {
    this.writeFLOAT(v.x);
    this.writeFLOAT(v.y);
    this.writeFLOAT(v.z);
  }

  /** Retail ReadBOOL — advances 4, returns low byte. */
  readBOOL(): boolean {
    const next = this.readIndex + 4;
    if (!this.readBuffer || this.readBufferSize < next) {
      this.readIndex = next;
      return false;
    }
    const value = this.readBuffer[this.readIndex] !== 0;
    this.readIndex = next;
    return value;
  }

  /** Retail ReadBYTE. */
  readBYTE(): number {
    const next = this.readIndex + 1;
    if (!this.readBuffer || this.readBufferSize < next) {
      this.readIndex = next;
      return 0;
    }
    const value = this.readBuffer[this.readIndex];
    this.readIndex = next;
    return value;
  }

  /** Retail ReadWORD. */
  readWORD(): number {
    const next = this.readIndex + 2;
    if (!this.readBuffer || this.readBufferSize < next) {
      this.readIndex = next;
      return 0;
    }
    const view = new DataView(this.readBuffer.buffer, this.readBuffer.byteOffset);
    const value = view.getUint16(this.readIndex, true);
    this.readIndex = next;
    return value;
  }

  /** Retail ReadDWORD. */
  readDWORD(): number {
    const next = this.readIndex + 4;
    if (!this.readBuffer || this.readBufferSize < next) {
      this.readIndex = next;
      return 0;
    }
    const view = new DataView(this.readBuffer.buffer, this.readBuffer.byteOffset);
    const value = view.getUint32(this.readIndex, true);
    this.readIndex = next;
    return value;
  }

  /** Retail ReadFLOAT. */
  readFLOAT(): number {
    const next = this.readIndex + 4;
    if (!this.readBuffer || this.readBufferSize < next) {
      this.readIndex = next;
      return 0;
    }
    const view = new DataView(this.readBuffer.buffer, this.readBuffer.byteOffset);
    const value = view.getFloat32(this.readIndex, true);
    this.readIndex = next;
    return value;
  }

  /** Retail ReadCExoString. */
  readCExoString(_unused?: number): string {
    const afterLen = this.readIndex + 4;
    let length = 0;
    if (this.readBuffer && this.readBufferSize >= afterLen) {
      const view = new DataView(this.readBuffer.buffer, this.readBuffer.byteOffset);
      length = view.getInt32(this.readIndex, true);
    }
    this.readIndex = afterLen;
    if (!this.readBuffer || this.readBufferSize < afterLen + length || length < 0) {
      this.readIndex = afterLen + Math.max(0, length);
      return "";
    }
    const slice = this.readBuffer.subarray(afterLen, afterLen + length);
    this.readIndex = afterLen + length;
    return textDecoder.decode(slice);
  }

  /**
   * Retail ReadCResRef.
   * @param size Usually 16.
   */
  readCResRef(size: number = RESREF_MAX): string {
    if (size > RESREF_MAX) size = RESREF_MAX;
    const next = this.readIndex + size;
    if (!this.readBuffer || this.readBufferSize < next) {
      this.readIndex = next;
      return "";
    }
    const slice = this.readBuffer.subarray(this.readIndex, next);
    this.readIndex = next;
    let end = slice.indexOf(0);
    if (end < 0) end = slice.length;
    return textDecoder.decode(slice.subarray(0, end));
  }

  /** Retail ReadVOIDPtr — returns subarray or null on overflow. */
  readVOIDPtr(size: number): Uint8Array | null {
    const start = this.readIndex;
    const next = start + size;
    this.readIndex = next;
    if (!this.readBuffer || this.readBufferSize < next) {
      return null;
    }
    return this.readBuffer.subarray(start, next);
  }

  /** Retail ReadVector. */
  readVector(): MessageVector3 {
    return {
      x: this.readFLOAT(),
      y: this.readFLOAT(),
      z: this.readFLOAT(),
    };
  }
}
