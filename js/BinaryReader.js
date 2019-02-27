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

    let val = this.reader.readInt8(this.position);
    this.position += 1;
    return val;
  }

  ReadUInt8(){
    if(this.position == this.reader.length)
      return null;

    let val = this.reader.readUInt8(this.position);
    this.position += 1;
    return val;
  }

  ReadInt16(){
    if(this.position == this.reader.length)
      return null;

    let val = this.endians == BinaryReader.Endians.LITTLE ? this.reader.readInt16LE(this.position) : this.reader.readInt16BE(this.position);
    this.position += 2;
    return val;
  }

  ReadUInt16(){
    if(this.position == this.reader.length)
      return null;

    let val = this.endians == BinaryReader.Endians.LITTLE ? this.reader.readUInt16LE(this.position) : this.reader.readUInt16BE(this.position);
    this.position += 2;
    return val;
  }

  ReadUInt32(){
    if(this.position == this.reader.length)
      return null;

    let val = this.endians == BinaryReader.Endians.LITTLE ? this.reader.readUInt32LE(this.position) : this.reader.readInt32BE(this.position);
    this.position += 4;
    return val;
  }

  ReadInt32(){
    if(this.position == this.reader.length)
      return null;

    let val = this.endians == BinaryReader.Endians.LITTLE ? this.reader.readInt32LE(this.position) : this.reader.readInt32BE(this.position);
    this.position += 4;
    return val;
  }

  ReadChar(encoding='ascii'){
    if(this.position == this.reader.length)
      return '\0';

    let val = String.fromCharCode(this.ReadInt8());
    return val;
  }

  ReadChars(num, encoding='utf8'){
    if(this.position == this.reader.length)
      return '\0';

    let val = '';//this.reader.toString(encoding, this.position, num);
    for(var i = 0; i!=num; i++){
      val += String.fromCharCode(this.ReadInt8());
    }
    return val;
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

    let bytes = [];
    for(var i = 0; i!=num; i++){
      bytes[i] = this.ReadInt8();
    }
    return Buffer.from(bytes);
  }

  ReadSingle(){
    if(this.position == this.reader.length)
      return null;

    let val = this.endians == BinaryReader.Endians.LITTLE ? this.reader.readFloatLE(this.position) : this.reader.readFloatBE(this.position);
    this.position += 4;
    return val;
  }

  ReadDouble(){
    if(this.position == this.reader.length)
      return null;

    let val = this.endians == BinaryReader.Endians.LITTLE ? this.reader.readDoubleLE(this.position) : this.reader.readDoubleBE(this.position);
    this.position += 8;
    return val;
  }

  ReadUInt64(){
    if(this.position == this.reader.length)
      return null;

    let bytes = [];
    for(var i = 0; i < 8; i++){
      bytes[i] = this.ReadUInt8();
    }
    return bytes;
  }

  ReadInt64(){
    if(this.position == this.reader.length)
      return null;

    let bytes = [];
    for(var i = 0; i < 8; i++){
      bytes[i] = this.ReadUInt8();
    }
    return bytes;
  }

  Slice(offset = 0, length = 0){

    if(!length)
      length = this.reader.length;

    let buffer = this.reader.slice(offset, length);
    return new BinaryReader(buffer, this.endians)

  }

}

BinaryReader.Endians = {
  LITTLE: 0,
  BIG: 1
}

module.exports = BinaryReader;
