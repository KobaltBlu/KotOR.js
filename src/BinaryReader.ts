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

  constructor(reader: Uint8Array, endians = Endians.LITTLE){
    //variables
    this.position = 0;
    this.buffer = reader;
    this.bufferView = new DataView(reader.buffer);
    this.endians = endians;
    this.isLE = endians == Endians.LITTLE;

    this._value = undefined;
  }

  setEndian(endian: Endians){
    this.endians = endian;
    this.isLE = endian == Endians.LITTLE;
  }

  seek(pos: number): void {
    this.position = pos;
  }

  skip(num: number): void {
    this.position += num;
  }

  length(){
    return this.buffer.length;
  }

  tell(): number {
    return this.position;
  }

  readInt8(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getInt8(this.position);
    this.position += 1;
    return this._value;
  }

  readUInt8(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getUint8(this.position);
    this.position += 1;
    return this._value;
  }

  readInt16(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getInt16(this.position, this.isLE);
    this.position += 2;
    return this._value;
  }

  readUInt16(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getUint16(this.position, this.isLE);
    this.position += 2;
    return this._value;
  }

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

  readChar(): string {
    if(this.position >= this.buffer.length)
      return '\0';

    this._value = String.fromCharCode(this.readInt8());
    return this._value;
  }

  readChars(num: number, encoding: BufferEncoding = 'latin1'): string {
    if(this.position >= this.buffer.length)
      return '\0';
    const textDecoder = new TextDecoder(encoding);
    this._value = textDecoder.decode(this.buffer.slice(this.position, this.position + num));
    this.position += num;
    //console.log(num, this._value);
    return this._value;
  }

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

  readByte(): number {
    if(this.position >= this.buffer.length)
      return 0;

    return this.readUInt8();
  }

  readSByte(): number {
    if(this.position >= this.buffer.length)
      return 0;

    return this.readInt8();
  }

  readBytes(num: number): Uint8Array {
    if(this.position >= this.buffer.length)
      return new Uint8Array(0);

    this._value = this.buffer.slice(this.position, this.position + num);
    this.position += num;
    return this._value;
  }

  readSingle(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getFloat32(this.position, this.isLE);
    this.position += 4;
    return this._value;
  }

  readDouble(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.bufferView.getFloat64(this.position, this.isLE);
    this.position += 8;
    return this._value;
  }

  readUInt64(): bigint {
    if(this.position >= this.buffer.length)
      return BigInt(0);

    this._value = this.bufferView.getBigUint64(this.position, this.isLE);
    this.position += 8;
    return this._value;
  }

  readInt64(): bigint {
    if(this.position >= this.buffer.length)
      return BigInt(0);

    this._value = this.bufferView.getBigInt64(this.position, this.isLE);
    this.position += 8;
    return this._value;
  }

  slice(offset = 0, end = 0): BinaryReader {
    end = (!!end) ? end : this.buffer.length;

    let buffer = this.buffer.slice(offset, end);
    return new BinaryReader(buffer, this.endians)
  }

  reuse(buffer: Uint8Array){
    this.position = 0;
    this.buffer = buffer;
    this.bufferView = new DataView(buffer.buffer);
  }

  dispose(){
    this.position = 0;
    this.buffer = new Uint8Array(0);
    this.bufferView = new DataView(this.buffer.buffer);
  }

}
