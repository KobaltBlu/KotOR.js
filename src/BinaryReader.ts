import { Endians } from "./enums/resource/Endians";

/**
 * BinaryReader class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file BinaryReader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class BinaryReader {

  position: number = 0;
  buffer: Uint8Array;
  bufferView: DataView;
  endians: Endians = Endians.LITTLE;
  isLE: boolean;

  _value: any;

  /**
   * Constructor for the BinaryReader class.
   * 
   * @param reader - The reader to read from.
   * @param endians - The endianness of the data.
   */
  constructor(reader: Uint8Array, endians = Endians.LITTLE){
    //variables
    this.position = 0;
    this.buffer = reader;
    this.bufferView = new DataView(reader.buffer);
    this.endians = endians;
    this.isLE = endians == Endians.LITTLE;

    this._value = undefined;
  }

  /**
   * Sets the endianness of the data.
   * 
   * @param endian - The endianness of the data.
   */
  setEndian(endian: Endians){
    this.endians = endian;
    this.isLE = endian == Endians.LITTLE;
  }

  /**
   * Seeks to a position in the buffer.
   * 
   * @param pos - The position to seek to.
   */
  seek(pos: number): void {
    this.position = pos;
  }

  /**
   * Skips a number of bytes in the buffer.
   * 
   * @param num - The number of bytes to skip.
   */
  skip(num: number): void {
    this.position += num;
  }

  /**
   * Returns the length of the buffer.
   * 
   * @returns The length of the buffer.
   */
  length(){
    return this.buffer.length;
  }

  /**
   * Returns the current position in the buffer.
   * 
   * @returns The current position in the buffer.
   */
  tell(): number {
    return this.position;
  }

  /**
   * Reads an 8-bit integer from the buffer.
   * 
   * @returns The 8-bit integer.
   */
  readInt8(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getInt8(this.position);
    this.position += 1;
    return this._value;
  }

  /**
   * Reads an unsigned 8-bit integer from the buffer.
   * 
   * @returns The unsigned 8-bit integer.
   */
  readUInt8(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getUint8(this.position);
    this.position += 1;
    return this._value;
  }

  /**
   * Reads a 16-bit integer from the buffer.
   * 
   * @returns The 16-bit integer.
   */
  readInt16(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getInt16(this.position, this.isLE);
    this.position += 2;
    return this._value;
  }

  /**
   * Reads an unsigned 16-bit integer from the buffer.
   * 
   * @returns The unsigned 16-bit integer.
   */
  readUInt16(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getUint16(this.position, this.isLE);
    this.position += 2;
    return this._value;
  }

  /**
   * Reads an unsigned 32-bit integer from the buffer.
   * 
   * @returns The unsigned 32-bit integer.
   */
  readUInt32(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getUint32(this.position, this.isLE);
    if(typeof this._value ==='undefined'){
      console.warn('readUInt32', this._value, this.position, this.buffer.length);
    }
    this.position += 4;
    return this._value;
  }

  /**
   * Reads a 32-bit integer from the buffer.
   * 
   * @returns The 32-bit integer.
   */
  readInt32(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getInt32(this.position, this.isLE);
    if(typeof this._value ==='undefined'){
      console.warn('readInt32', this._value, this.position, this.buffer.length);
    }
    this.position += 4;
    return this._value;
  }

  /**
   * Reads a character from the buffer.
   * 
   * @returns The character.
   */
  readChar(): string {
    if(this.position >= this.buffer.length)
      return '\0';

    this._value = String.fromCharCode(this.readInt8());
    return this._value;
  }

  /**
   * Reads a string from the buffer.
   * 
   * @param num - The number of characters to read.
   * @param encoding - The encoding of the string.
   * @returns The string.
   */
  readChars(num: number, encoding: BufferEncoding = 'latin1'): string {
    if(this.position >= this.buffer.length)
      return '\0';
    const textDecoder = new TextDecoder(encoding);
    this._value = textDecoder.decode(this.buffer.slice(this.position, this.position + num));
    this.position += num;
    //console.log(num, this._value);
    return this._value;
  }

  /**
   * Reads a string from the buffer.
   * 
   * @returns The string.
   */
  readString(): string{
    if(this.position >= this.buffer.length)
      return '';

    let _value = '';
    let lastChar;
    while((lastChar = this.readInt8()) > 0){
      _value += String.fromCharCode(lastChar);
    }
    return _value;
  }

  /**
   * Reads a byte from the buffer.
   * 
   * @returns The byte.
   */
  readByte(): number {
    if(this.position >= this.buffer.length)
      return 0;

    return this.readUInt8();
  }

  /**
   * Reads a signed byte from the buffer.
   * 
   * @returns The signed byte.
   */
  readSByte(): number {
    if(this.position >= this.buffer.length)
      return 0;

    return this.readInt8();
  }

  /**
   * Reads an array of bytes from the buffer.
   * 
   * @param num - The number of bytes to read.
   * @returns The array of bytes.
   */
  readBytes(num: number): Uint8Array {
    if(this.position >= this.buffer.length)
      return new Uint8Array(0);

    this._value = this.buffer.slice(this.position, this.position + num);
    this.position += num;
    return this._value;
  }

  /**
   * Reads a single-precision floating point number from the buffer.
   * 
   * @returns The single-precision floating point number.
   */
  readSingle(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getFloat32(this.position, this.isLE);
    this.position += 4;
    return this._value;
  }

  /**
   * Reads a double-precision floating point number from the buffer.
   * 
   * @returns The double-precision floating point number.
   */
  readDouble(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getFloat64(this.position, this.isLE);
    this.position += 8;
    return this._value;
  }

  /**
   * Reads a 64-bit unsigned integer from the buffer.
   * 
   * @returns The 64-bit unsigned integer.
   */
  readUInt64(): bigint {
    if(this.position >= this.buffer.length)
      return BigInt(0);

    this._value = this.bufferView.getBigUint64(this.position, this.isLE);
    this.position += 8;
    return this._value;
  }

  /**
   * Reads a 64-bit integer from the buffer.
   * 
   * @returns The 64-bit integer.
   */
  readInt64(): bigint {
    if(this.position >= this.buffer.length)
      return BigInt(0);

    this._value = this.bufferView.getBigInt64(this.position, this.isLE);
    this.position += 8;
    return this._value;
  }

  /**
   * Slices the buffer.
   * 
   * @param offset - The offset to slice from.
   * @param end - The end of the slice.
   * @returns The sliced buffer.
   */
  slice(offset = 0, end = 0): BinaryReader {
    end = (!!end) ? end : this.buffer.length;

    let buffer = this.buffer.slice(offset, end);
    return new BinaryReader(buffer, this.endians)
  }

  /**
   * Reuses the buffer.
   * 
   * @param buffer - The buffer to reuse.
   */
  reuse(buffer: Uint8Array){
    this.position = 0;
    this.buffer = buffer;
    this.bufferView = new DataView(buffer.buffer);
  }

  /**
   * Disposes of the BinaryReader class.
   */
  dispose(){
    this.position = 0;
    this.buffer = new Uint8Array(0);
    this.bufferView = new DataView(this.buffer.buffer);
  }

}
