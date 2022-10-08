/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { Endians } from "./enums/resource/Endians";

/* @file
 * The BinaryReader class.
 */

export class BinaryReader {

  position: number = 0;
  reader: Buffer;
  endians: Endians;

  _value: any;

  constructor(reader: Buffer, endians = Endians.LITTLE){
    //variables
    this.position = 0;
    this.reader = reader;
    this.endians = endians;

    this._value = undefined;
  }

  Seek(pos): void {
    this.position = pos;
  }

  Skip(num): void {
    this.MovePointerForward(num);
  }

  Length(){
    return this.reader.length;
  }

  MovePointerForward(num): void {
    this.position += num;
  }

  Tell(): number {
    return this.position;
  }

  ReadInt8(): number {
    if(this.position >= this.reader.length)
      return 0;

    this._value = this.reader.readInt8(this.position);
    this.position += 1;
    return this._value;
  }

  ReadUInt8(): number {
    if(this.position >= this.reader.length)
      return 0;

    this._value = this.reader.readUInt8(this.position);
    this.position += 1;
    return this._value;
  }

  ReadInt16(): number {
    if(this.position >= this.reader.length)
      return 0;

    this._value = this.endians == Endians.LITTLE ? this.reader.readInt16LE(this.position) : this.reader.readInt16BE(this.position);
    this.position += 2;
    return this._value;
  }

  ReadUInt16(): number {
    if(this.position >= this.reader.length)
      return 0;

    this._value = this.endians == Endians.LITTLE ? this.reader.readUInt16LE(this.position) : this.reader.readUInt16BE(this.position);
    this.position += 2;
    return this._value;
  }

  ReadUInt32(): number {
    if(this.position >= this.reader.length)
      return 0;

    this._value = this.endians == Endians.LITTLE ? this.reader.readUInt32LE(this.position) : this.reader.readInt32BE(this.position);
    this.position += 4;
    return this._value;
  }

  ReadInt32(): number {
    if(this.position >= this.reader.length)
      return 0;

    this._value = this.endians == Endians.LITTLE ? this.reader.readInt32LE(this.position) : this.reader.readInt32BE(this.position);
    this.position += 4;
    return this._value;
  }

  ReadChar(): string {
    if(this.position >= this.reader.length)
      return '\0';

    this._value = String.fromCharCode(this.ReadInt8());
    return this._value;
  }

  ReadChars(num: number, encoding: BufferEncoding = 'latin1'): string {
    if(this.position >= this.reader.length)
      return '\0';

    this._value = this.reader.slice(this.position, this.position + num).toString(encoding);
    this.position += num;
    //console.log(num, this._value);
    return this._value;
  }

  ReadString(): string{
    if(this.position >= this.reader.length)
      return '';

    let _value = '';
    let lastChar;
    while((lastChar = this.ReadInt8()) > 0){
      _value += String.fromCharCode(lastChar);
    }
    return _value;
  }

  ReadByte(): number {
    if(this.position >= this.reader.length)
      return 0;

    return this.ReadUInt8();
  }

  ReadSByte(): number {
    if(this.position >= this.reader.length)
      return 0;

    return this.ReadInt8();
  }

  ReadBytes(num){
    if(this.position >= this.reader.length)
      return Buffer.allocUnsafe(0);

    this._value = this.reader.slice(this.position, this.position + num);
    this.position += num;
    return this._value;
  }

  ReadSingle(): number {
    if(this.position >= this.reader.length)
      return 0;

    this._value = (this.endians == Endians.LITTLE) ? this.reader.readFloatLE(this.position) : this.reader.readFloatBE(this.position);
    this.position += 4;
    return this._value;
  }

  ReadDouble(): number {
    if(this.position >= this.reader.length)
      return 0;

    this._value = (this.endians == Endians.LITTLE) ? this.reader.readDoubleLE(this.position) : this.reader.readDoubleBE(this.position);
    this.position += 8;
    return this._value;
  }

  ReadUInt64(): Buffer {
    if(this.position >= this.reader.length)
      return Buffer.allocUnsafe(0);

    this._value = this.reader.slice(this.position, this.position + 8);
    this.position += 8;
    return this._value;
  }

  ReadInt64(): Buffer {
    if(this.position >= this.reader.length)
      return Buffer.allocUnsafe(0);

    this._value = this.reader.slice(this.position, this.position + 8);
    this.position += 8;
    return this._value;
  }

  Slice(offset = 0, end = 0): BinaryReader {
    if(!end)
      end = this.reader.length;

    let buffer = this.reader.slice(offset, end);
    return new BinaryReader(buffer, this.endians)
  }

}
