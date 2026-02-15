/**
 * BitReaderLE class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file BitReaderLE.ts
 * @autthor Lachjames <https://github.com/Lachjames> (Ported from FFmpeg)
 * @author KobaltBlu <https://github.com/KobaltBlu> (Modified for KotOR JS)
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class BitReaderLE {
  private buf: Uint8Array;
  private bitPos: number; // absolute bit position into buffer
  private bitSize: number; // total bits
  private buf32: Uint32Array; // 32-bit view for fast access

  constructor(buffer: Uint8Array, bitOffset = 0, bitLength?: number) {
    this.buf = buffer;
    this.bitPos = bitOffset >>> 0;
    const totalBits = (buffer.byteLength << 3) >>> 0;
    this.bitSize = bitLength !== undefined ? Math.min(bitLength, totalBits) : totalBits;
    // Create 32-bit view for faster aligned reads
    this.buf32 = new Uint32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength >>> 2);
  }

  bitsLeft(): number {
    return this.bitSize - this.bitPos;
  }

  align32(): void {
    const mis = this.bitPos & 31;
    if (mis) this.bitPos += (32 - mis);
  }

  skipBits(n: number): void {
    this.bitPos += n >>> 0;
  }

  /** Read a single bit (convenience wrapper) */
  readBit(): number {
    return this.readBits(1);
  }

  // Read n bits (n <= 32) little-endian order - optimized version
  readBits(n: number): number {
    if (n === 0) return 0;
    if (n < 0 || n > 32) throw new RangeError('readBits n out of range');
    if (this.bitPos + n > this.bitSize) throw new RangeError('readBits beyond end');

    const pos = this.bitPos;
    const byteIndex = pos >>> 3;
    const bitInByte = pos & 7;

    // Fast path for aligned 32-bit reads
    if (bitInByte === 0 && n === 32 && (byteIndex & 3) === 0) {
      const wordIndex = byteIndex >>> 2;
      this.bitPos += 32;
      return this.buf32[wordIndex] >>> 0;
    }

    // Fast path for aligned 16-bit reads
    if (bitInByte === 0 && n === 16 && (byteIndex & 1) === 0) {
      const wordIndex = byteIndex >>> 2;
      const shift = (byteIndex & 2) << 3; // 0 or 16
      this.bitPos += 16;
      return (this.buf32[wordIndex] >>> shift) & 0xFFFF;
    }

    // Fast path for aligned 8-bit reads
    if (bitInByte === 0 && n === 8) {
      this.bitPos += 8;
      return this.buf[byteIndex];
    }

    // General case - read bits across byte boundaries
    let out = 0;
    let bitsRead = 0;
    let currentPos = pos;

    while (bitsRead < n) {
      const currentByteIndex = currentPos >>> 3;
      const currentBitInByte = currentPos & 7;
      const bitsThisRound = Math.min(8 - currentBitInByte, n - bitsRead);

      const b = this.buf[currentByteIndex];
      const mask = ((1 << bitsThisRound) - 1) << currentBitInByte;
      const v = (b & mask) >>> currentBitInByte;

      out |= v << bitsRead;
      bitsRead += bitsThisRound;
      currentPos += bitsThisRound;
    }

    this.bitPos = currentPos;
    return out >>> 0;
  }

  /** Peek at the next n bits without advancing the read position */
  peekBits(n: number): number {
    const save = this.bitPos;
    const v = this.readBits(n);
    this.bitPos = save;
    return v;
  }

  /** Return the current absolute bit position (for debugging / alignment checks) */
  getBitPos(): number {
    return this.bitPos;
  }

  /** Read signed value: n-bit unsigned then sign-extend */
  readSigned(width: number): number {
    const u = this.readBits(width);
    const signBit = 1 << (width - 1);
    return (u ^ signBit) - signBit;
  }

  // Read n bits in big-endian order for testing
  readBitsBE(n: number): number {
    if (n === 0) return 0;
    if (n < 0 || n > 32) throw new RangeError('readBitsBE n out of range');
    if (this.bitPos + n > this.bitSize) throw new RangeError('readBitsBE beyond end');

    let out = 0;
    let pos = this.bitPos;

    for (let i = 0; i < n; i++) {
      const byteIndex = (pos >>> 3) | 0;
      const bitInByte = 7 - (pos & 7); // MSB first
      const b = this.buf[byteIndex];
      const bit = (b >> bitInByte) & 1;
      out = (out << 1) | bit;
      pos++;
    }

    this.bitPos = pos;
    return out >>> 0;
  }
}