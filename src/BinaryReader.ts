/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { Endians } from "./enums/resource/Endians";

/* @file
 * The BinaryReader class.
 */

export class BinaryReader {

  position: number = 0;
  buffer: Buffer;
  endians: Endians;

  _value: any;

  constructor(reader: Buffer, endians = Endians.LITTLE){
    //variables
    this.position = 0;
    this.buffer = reader;
    this.endians = endians;

    this._value = undefined;
  }

  seek(pos: number): void {
    this.position = pos;
  }

  skip(num: number): void {
    this.movePointerForward(num);
  }

  length(){
    return this.buffer.length;
  }

  movePointerForward(num: number): void {
    this.position += num;
  }

  tell(): number {
    return this.position;
  }

  readInt8(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.buffer.readInt8(this.position);
    this.position += 1;
    return this._value;
  }

  readUInt8(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.buffer.readUInt8(this.position);
    this.position += 1;
    return this._value;
  }

  readInt16(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.endians == Endians.LITTLE ? this.buffer.readInt16LE(this.position) : this.buffer.readInt16BE(this.position);
    this.position += 2;
    return this._value;
  }

  readUInt16(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.endians == Endians.LITTLE ? this.buffer.readUInt16LE(this.position) : this.buffer.readUInt16BE(this.position);
    this.position += 2;
    return this._value;
  }

  readUInt32(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.endians == Endians.LITTLE ? this.buffer.readUInt32LE(this.position) : this.buffer.readInt32BE(this.position);
    this.position += 4;
    return this._value;
  }

  readInt32(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = this.endians == Endians.LITTLE ? this.buffer.readInt32LE(this.position) : this.buffer.readInt32BE(this.position);
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

    this._value = this.buffer.slice(this.position, this.position + num).toString(encoding);
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

  readBytes(num: number){
    if(this.position >= this.buffer.length)
      return Buffer.allocUnsafe(0);

    this._value = this.buffer.slice(this.position, this.position + num);
    this.position += num;
    return this._value;
  }

  readSingle(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = (this.endians == Endians.LITTLE) ? this.buffer.readFloatLE(this.position) : this.buffer.readFloatBE(this.position);
    this.position += 4;
    return this._value;
  }

  readDouble(): number {
    if(this.position >= this.buffer.length)
      return 0;

    this._value = (this.endians == Endians.LITTLE) ? this.buffer.readDoubleLE(this.position) : this.buffer.readDoubleBE(this.position);
    this.position += 8;
    return this._value;
  }

  readUInt64(): Buffer {
    if(this.position >= this.buffer.length)
      return Buffer.allocUnsafe(0);

    this._value = this.buffer.slice(this.position, this.position + 8);
    this.position += 8;
    return this._value;
  }

  readInt64(): Buffer {
    if(this.position >= this.buffer.length)
      return Buffer.allocUnsafe(0);

    this._value = this.buffer.slice(this.position, this.position + 8);
    this.position += 8;
    return this._value;
  }

  slice(offset = 0, end = 0): BinaryReader {
    if(!end)
      end = this.buffer.length;

    let buffer = this.buffer.slice(offset, end);
    return new BinaryReader(buffer, this.endians)
  }

  reuse(buffer: Buffer){
    this.position = 0;
    this.buffer = buffer;
  }

  dispose(){
    this.position = 0;
    this.buffer = Buffer.allocUnsafe(0);
  }

}
