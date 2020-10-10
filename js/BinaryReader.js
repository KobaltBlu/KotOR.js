/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The BinaryReader class.
 */

class BinaryReader {

  constructor(reader = null, endians = BinaryReader.Endians.LITTLE){
    //variables
    this.position = 0;
    this.reader = reader;
    this.endians = endians;

    this._value = undefined;
  }

  Seek(pos){
    this.position = pos;
  }

  Skip(num){
    this.MovePointerForward(num);
  }

  Length(){
    return this.reader.length;
  }

  MovePointerForward(num){
    this.position += num;
  }

  Tell(){
    return this.position;
  }

  ReadInt8(){
    if(this.position == this.reader.length)
      return null;

    this._value = this.reader.readInt8(this.position);
    this.position += 1;
    return this._value;
  }

  ReadUInt8(){
    if(this.position == this.reader.length)
      return null;

    this._value = this.reader.readUInt8(this.position);
    this.position += 1;
    return this._value;
  }

  ReadInt16(){
    if(this.position == this.reader.length)
      return null;

    this._value = this.endians == BinaryReader.Endians.LITTLE ? this.reader.readInt16LE(this.position) : this.reader.readInt16BE(this.position);
    this.position += 2;
    return this._value;
  }

  ReadUInt16(){
    if(this.position == this.reader.length)
      return null;

    this._value = this.endians == BinaryReader.Endians.LITTLE ? this.reader.readUInt16LE(this.position) : this.reader.readUInt16BE(this.position);
    this.position += 2;
    return this._value;
  }

  ReadUInt32(){
    if(this.position == this.reader.length)
      return null;

    this._value = this.endians == BinaryReader.Endians.LITTLE ? this.reader.readUInt32LE(this.position) : this.reader.readInt32BE(this.position);
    this.position += 4;
    return this._value;
  }

  ReadInt32(){
    if(this.position == this.reader.length)
      return null;

    this._value = this.endians == BinaryReader.Endians.LITTLE ? this.reader.readInt32LE(this.position) : this.reader.readInt32BE(this.position);
    this.position += 4;
    return this._value;
  }

  ReadChar(){
    if(this.position == this.reader.length)
      return '\0';

    this._value = String.fromCharCode(this.ReadInt8());
    return this._value;
  }

  ReadChars(num, encoding='latin1'){
    if(this.position == this.reader.length)
      return '\0';

    this._value = this.reader.slice(this.position, this.position + num).toString(encoding);
    this.position += (1*num);
    return this._value;
  }

  ReadByte(){
    if(this.position == this.reader.length)
      return null;

    return this.ReadUInt8();
  }

  ReadSByte(){
    if(this.position == this.reader.length)
      return null;

    return this.ReadInt8();
  }

  ReadBytes(num){
    if(this.position == this.reader.length)
      return null;

    this._value = this.reader.slice(this.position, this.position + num);
    this.position += num;
    return this._value;
  }

  ReadSingle(){
    if(this.position == this.reader.length)
      return null;

    this._value = (this.endians == BinaryReader.Endians.LITTLE) ? this.reader.readFloatLE(this.position) : this.reader.readFloatBE(this.position);
    this.position += 4;
    return this._value;
  }

  ReadDouble(){
    if(this.position == this.reader.length)
      return null;

    this._value = (this.endians == BinaryReader.Endians.LITTLE) ? this.reader.readDoubleLE(this.position) : this.reader.readDoubleBE(this.position);
    this.position += 8;
    return this._value;
  }

  ReadUInt64(){
    if(this.position == this.reader.length)
      return null;

    this._value = this.reader.slice(this.position, this.position + 8);
    this.position += 8;
    return this._value;
  }

  ReadInt64(){
    if(this.position == this.reader.length)
      return null;

    this._value = this.reader.slice(this.position, this.position + 8);
    this.position += 8;
    return this._value;
  }

  Slice(offset = 0, end = 0){
    if(!end)
      end = this.reader.length;

    let buffer = this.reader.slice(offset, end);
    return new BinaryReader(buffer, this.endians)
  }

}

BinaryReader.Endians = {
  LITTLE: 0,
  BIG: 1
}

module.exports = BinaryReader;
