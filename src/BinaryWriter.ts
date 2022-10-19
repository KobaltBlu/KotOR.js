/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import isBuffer from "is-buffer";

/* @file
 * The BinaryWriter class.
 */

export class BinaryWriter {

  position: number = 0;
  buffer: Buffer;
  length: number;

  constructor( buffer = Buffer.alloc(0) ){
    //variables
    this.position = 0;
    this.buffer = buffer;
    this.length = this.buffer.length;
  }

  Dispose(): void {
    this.buffer = Buffer.allocUnsafe(0);
  }

  Seek(pos: number){
    this.position = pos;
  }

  MovePointerForward(num: number){
    this.position += num;
  }

  Tell(){
    return this.position;
  }

  EnlargeBuffer(buffer: Buffer){
    //Check to see if we need to enlarge the buffer size
    let targetLength = this.position + buffer.length;
    if(targetLength > this.buffer.length){

      //This is the amount that we will increase the buffer by
      let paddingLength = targetLength - this.buffer.length;

      let tmpBuffer = Buffer.alloc(targetLength);
      this.buffer.copy(tmpBuffer, 0, 0, this.buffer.length);
      this.buffer = tmpBuffer;
    }
  }

  AppendData(buffer: Buffer){

    if(buffer != null){

      this.EnlargeBuffer(buffer);
      this.length = this.buffer.length;
      buffer.copy(this.buffer, this.position, 0, buffer.length);
      //console.log(this.buffer);

      /*if(this.position == this.buffer.length){
        //Append buffer to end of current buffer
        this.length = this.buffer.length;
        buffer.copy(this.buffer, this.position, 0, buffer.length);
        //console.log(this.buffer);
        //this.buffer = Buffer.concat([this.buffer, buffer], this.length);

      }else{
        //Splice buffer into the current position of the current buffer

        //This is the data that will be appended before the new data is spliced
        let beginDataLen = this.position;
        let beginDataBuffer = Buffer.from(this.buffer, 0, this.position);

        //This is the data that will be appended after the new data is spliced
        let endDataLen = this.length - this.position;

        if(endDataLen < buffer.length){
          this.length = beginDataLen + buffer.length;
          this.buffer = Buffer.concat([beginDataBuffer, this.buffer], this.length);
        }else{

          let endDataBuffer = Buffer.from(this.buffer, this.position, endDataLen);
          this.length = beginDataLen + buffer.length + endDataLen; // or this.length += buffer.length;
          this.buffer = Buffer.concat([beginDataBuffer, this.buffer, endDataBuffer], this.length);
        }

      }*/

      this.MovePointerForward(buffer.length);
    }

  }

  WriteInt8(int8: number){
    let tmpBuffer = Buffer.alloc(1);
    tmpBuffer.writeInt8(int8);
    this.AppendData(tmpBuffer);
  }

  WriteUInt8(uint8: number){
    let tmpBuffer = Buffer.alloc(1);
    tmpBuffer.writeUInt8(uint8);
    this.AppendData(tmpBuffer);
  }

  WriteInt16(int16: number){
    let tmpBuffer = Buffer.alloc(2);
    tmpBuffer.writeInt16LE(int16);
    this.AppendData(tmpBuffer);
  }

  WriteUInt16(uint16: number){
    let tmpBuffer = Buffer.alloc(2);
    tmpBuffer.writeUInt16LE(uint16);
    this.AppendData(tmpBuffer);
  }

  WriteInt32(int32: number){
    let tmpBuffer = Buffer.alloc(4);
    tmpBuffer.writeInt32LE(int32);
    this.AppendData(tmpBuffer);
  }

  WriteUInt32(uint32 = 0){
    let tmpBuffer = Buffer.alloc(4);
    tmpBuffer.writeUInt32LE(uint32);
    this.AppendData(tmpBuffer);
  }

  WriteChar(char: string, encoding='ascii'){
    if(char.length){
      let tmpBuffer = Buffer.alloc(1);
      tmpBuffer.writeUInt8(char.charCodeAt(0));
      this.AppendData(tmpBuffer);
    }
  }

  WriteChars(chars: any|any[] = [], encoding='ascii'){
    if(typeof chars === 'string')
      chars = chars.split('');

    if(chars.length){
      let tmpBuffer = Buffer.alloc(chars.length);
      for(let i = 0; i < chars.length; i++){
        tmpBuffer.writeUInt8(chars[i].charCodeAt(), i);
      }
      this.AppendData(tmpBuffer);
    }
  }

  WriteString(string: string, encoding='ascii'){
    this.WriteChars(string, encoding);
  }

  WriteByte(byte: number){
    this.WriteUInt8(byte);
  }

  WriteBytes(bytes: Uint8Array|Buffer|any[] = []){
    //console.log('Writing Bytes: ', bytes.length);
    let tmpBuffer = isBuffer(bytes) ? bytes as Buffer : Buffer.from(bytes);
    //this.buffer = Buffer.concat( [ this.buffer, (isBuffer(bytes) ? bytes as Buffer : Buffer.from(bytes)) ] );
    this.AppendData(tmpBuffer);
    //console.log('Buffer Concat: ');
    
  }

  Write(tmpBuffer = Buffer.alloc(0)){
    this.AppendData(tmpBuffer);
  }

  WriteSingle(single: number){
    let tmpBuffer = Buffer.alloc(4);
    tmpBuffer.writeFloatLE(single);
    this.AppendData(tmpBuffer);
  }

  WriteDouble(double: number){
    let tmpBuffer = Buffer.alloc(8);
    tmpBuffer.writeDoubleLE(double);
    this.AppendData(tmpBuffer);
  }

  WriteUInt64(uint64: number){
    let tmpBuffer = Buffer.alloc(8);
    tmpBuffer.writeDoubleLE(uint64);
    this.AppendData(tmpBuffer);
  }

  WriteInt64(int64: number){
    let tmpBuffer = Buffer.alloc(8);
    tmpBuffer.writeDoubleLE(int64);
    this.AppendData(tmpBuffer);
  }

  Close(){

  }

}
