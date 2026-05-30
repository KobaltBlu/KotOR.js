import { BinaryReader } from "@/utility/binary/BinaryReader";
import { SurfaceMaterial } from "@/engine/SurfaceMaterial";
import { IOdysseyArrayDefinition } from "@/interface/odyssey/IOdysseyArrayDefinition";

/**
 * OdysseyModelUtility class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyModelUtility.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyModelUtility {
  
  static SURFACEMATERIALS: SurfaceMaterial[] = [];

  /**
   * Reads an array definition from the buffer.
   * @param stream - The binary reader to read from.
   * @returns The array definition.
   */
  static ReadArrayDefinition(stream: BinaryReader): IOdysseyArrayDefinition {
    return {
      offset: stream.readUInt32() & 0xFFFFFFFF, 
      count: stream.readUInt32() & 0xFFFFFFFF, 
      count2: stream.readUInt32() & 0xFFFFFFFF
    };
  }

  /**
   * Reads an array of unsigned 8-bit integers from the buffer.
   * @param stream - The binary reader to read from.
   * @param offset - The offset to read from.
   * @param count - The number of items to read.
   * @returns The array of unsigned 8-bit integers.
   */
  static ReadArrayUInt8s(stream: BinaryReader, offset: number, count: number): Uint8Array {
    const bytes = stream.buffer;
    const byteOffset = bytes.byteOffset + offset;
    const byteLength = count * 4;
  
    if ((byteOffset & 3) === 0) {
      return new Uint8Array(bytes.buffer, byteOffset, count);
    }
  
    return new Uint8Array(
      bytes.buffer.slice(byteOffset, byteOffset + byteLength)
    );
  }

  /**
   * Reads an array of signed 8-bit integers from the buffer.
   * @param stream - The binary reader to read from.
   * @param offset - The offset to read from.
   * @param count - The number of items to read.
   * @returns The array of signed 8-bit integers.
   */
  static ReadArrayInt8s(stream: BinaryReader, offset: number, count: number): Int8Array {
    const bytes = stream.buffer;
    const byteOffset = bytes.byteOffset + offset;
    const byteLength = count * 4;
  
    if ((byteOffset & 3) === 0) {
      return new Int8Array(bytes.buffer, byteOffset, count);
    }
  
    return new Int8Array(
      bytes.buffer.slice(byteOffset, byteOffset + byteLength)
    );
  }

  /**
   * Reads an array of unsigned 16-bit integers from the buffer.
   * @param stream - The binary reader to read from.
   * @param offset - The offset to read from.
   * @param count - The number of items to read.
   * @returns The array of unsigned 16-bit integers.
   */
  static ReadArrayUInt16s(stream: BinaryReader, offset: number, count: number): Uint16Array {
    const bytes = stream.buffer;
    const byteOffset = bytes.byteOffset + offset;
    const byteLength = count * 4;
  
    if ((byteOffset & 3) === 0) {
      return new Uint16Array(bytes.buffer, byteOffset, count);
    }
  
    return new Uint16Array(
      bytes.buffer.slice(byteOffset, byteOffset + byteLength)
    );
  }

  /**
   * Reads an array of signed 16-bit integers from the buffer.
   * @param stream - The binary reader to read from.
   * @param offset - The offset to read from.
   * @param count - The number of items to read.
   * @returns The array of signed 16-bit integers.
   */
  static ReadArrayInt16s(stream: BinaryReader, offset: number, count: number): Int16Array {
    const bytes = stream.buffer;
    const byteOffset = bytes.byteOffset + offset;
    const byteLength = count * 4;
  
    if ((byteOffset & 3) === 0) {
      return new Int16Array(bytes.buffer, byteOffset, count);
    }
  
    return new Int16Array(
      bytes.buffer.slice(byteOffset, byteOffset + byteLength)
    );
  }

  /**
   * Reads an array of unsigned 32-bit integers from the buffer.
   * @param stream - The binary reader to read from.
   * @param offset - The offset to read from.
   * @param count - The number of items to read.
   * @returns The array of unsigned 32-bit integers.
   */
  static ReadArrayUInt32s(stream: BinaryReader, offset: number, count: number): Uint32Array {
    const bytes = stream.buffer;
    const byteOffset = bytes.byteOffset + offset;
    const byteLength = count * 4;
  
    if ((byteOffset & 3) === 0) {
      return new Uint32Array(bytes.buffer, byteOffset, count);
    }
  
    return new Uint32Array(
      bytes.buffer.slice(byteOffset, byteOffset + byteLength)
    );
  }

  /**
   * Reads an array of signed 32-bit integers from the buffer.
   * @param stream - The binary reader to read from.
   * @param offset - The offset to read from.
   * @param count - The number of items to read.
   * @returns The array of signed 32-bit integers.
   */
  static ReadArrayInt32s(stream: BinaryReader, offset: number, count: number): Int32Array {
    const bytes = stream.buffer;
    const byteOffset = bytes.byteOffset + offset;
    const byteLength = count * 4;
  
    if ((byteOffset & 3) === 0) {
      return new Int32Array(bytes.buffer, byteOffset, count);
    }
  
    return new Int32Array(
      bytes.buffer.slice(byteOffset, byteOffset + byteLength)
    );
  }
  
  /**
   * Reads an array of 32-bit floating point numbers from the buffer.
   * @param stream - The binary reader to read from.
   * @param offset - The offset to read from.
   * @param count - The number of items to read.
   * @returns The array of 32-bit floating point numbers.
   */
  static ReadArrayFloats(stream: BinaryReader, offset: number, count: number): Float32Array {
    const bytes = stream.buffer;
    const byteOffset = bytes.byteOffset + offset;
    const byteLength = count * 4;
  
    if ((byteOffset & 3) === 0) {
      return new Float32Array(bytes.buffer, byteOffset, count);
    }
  
    return new Float32Array(
      bytes.buffer.slice(byteOffset, byteOffset + byteLength)
    );
  }

  /**
   * Reads an array of 64-bit floating point numbers from the buffer.
   * @param stream - The binary reader to read from.
   * @param offset - The offset to read from.
   * @param count - The number of items to read.
   * @returns The array of 64-bit floating point numbers.
   */
  static ReadArrayDoubles(stream: BinaryReader, offset: number, count: number): BigInt64Array {
    const bytes = stream.buffer;
    const byteOffset = bytes.byteOffset + offset;
    const byteLength = count * 8;
  
    if ((byteOffset & 7) === 0) {
      return new BigInt64Array(bytes.buffer, byteOffset, count);
    }

    return new BigInt64Array(
      bytes.buffer.slice(byteOffset, byteOffset + byteLength)
    );
  }

  /**
   * Reads an array of strings from the buffer.
   * @param stream - The binary reader to read from.
   * @param offsets - The offsets to read from.
   * @param offset - The offset to read from.
   * @returns The array of strings.
   */
  static ReadStrings(stream: BinaryReader, offsets: Uint32Array, offset: number): string[] {
    let posCache = stream.position;
    let strings: string[] = [];

    for (let i = 0; i < offsets.length; i++){
      stream.position = offset + offsets[i];

      let str = "";
      let char;

      while ((char = stream.readChar()).charCodeAt(0) != 0)
        str = str + char;

      strings[i] = str;
    }

    stream.position = posCache;
    return strings;
  }
  
}