/**
 * BitReaderBE class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file BitReaderBE.ts
 * @autthor Lachjames <https://github.com/Lachjames> (Ported from FFmpeg)
 * @author KobaltBlu <https://github.com/KobaltBlu> (Modified for KotOR JS)
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class BitReaderBE {
  private buf: Uint8Array;
  private bitPos: number; // absolute bit position into buffer
  private bitSize: number; // total bits

  constructor(buffer: Uint8Array, bitOffset = 0, bitLength?: number) {
    this.buf = buffer;
    this.bitPos = bitOffset >>> 0;
    const totalBits = (buffer.byteLength << 3) >>> 0;
    this.bitSize = bitLength !== undefined ? Math.min(bitLength, totalBits) : totalBits;
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

  readBit(): number {
    return this.readBits(1);
  }

  readBits(n: number): number {
    if (n === 0) return 0;
    if (n < 0 || n > 32) throw new RangeError('readBits n out of range');
    if (this.bitPos + n > this.bitSize) throw new RangeError('readBits beyond end');

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

  // Peek n bits without advancing
  peekBits(n: number): number {
    const save = this.bitPos;
    const v = this.readBits(n);
    this.bitPos = save;
    return v;
  }

  // Read signed value with width bits, returns signed 32-bit
  readSigned(width: number): number {
    const u = this.readBits(width);
    const signBit = 1 << (width - 1);
    const val = (u ^ signBit) - signBit;
    return val;
  }

  // Return absolute bit position (for debugging)
  getBitPos(): number { return this.bitPos; }

  // Debug helper: dump next n bits (LSB-first) as hex string without advancing
  dumpNextBits(n: number): string {
    const k = Math.min(Math.max(n|0, 0), 32);
    const v = this.peekBits(k);
    const bytes = Math.ceil(k / 8);
    return '0x' + v.toString(16).padStart(bytes * 2, '0');
  }
}
