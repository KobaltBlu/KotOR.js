import { Endians } from "./enums/resource/Endians";

/**
 * BinaryWriter class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file BinaryWriter.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class BinaryWriter {

  position: number = 0;
  buffer: Uint8Array;
  length: number;
  endians: Endians = Endians.LITTLE;

  tmp8: Uint8Array = new Uint8Array(1);
  tmp16: Uint8Array = new Uint8Array(2);
  tmp32: Uint8Array = new Uint8Array(4);
  tmp64: Uint8Array = new Uint8Array(8);

  constructor( buffer = new Uint8Array(0), endians = Endians.LITTLE ){
    this.position = 0;
    this.buffer = buffer;
    this.length = this.buffer.length; 
    this.endians = endians;
  }

  dispose(): void {
    this.buffer = new Uint8Array(0);
  }

  seek(pos: number){
    this.position = pos;
  }

  skip(num: number){
    this.position += num;
  }

  tell(){
    return this.position;
  }

  enlargeBuffer(buffer: Uint8Array){
    //Check to see if we need to enlarge the buffer size
    const targetLength = this.position + buffer.length;
    if(targetLength <= this.buffer.length){
      return;
    }
    //This is the amount that we will increase the buffer by
    // let paddingLength = targetLength - this.buffer.length;

    const tmpBuffer = new Uint8Array(targetLength);
    tmpBuffer.set(this.buffer, 0);
    this.buffer = tmpBuffer;
  }

  appendData(buffer: Uint8Array){
    if(!buffer || buffer.length === 0){ return; }

    this.enlargeBuffer(buffer);
    this.length = this.buffer.length;
    this.buffer.set(buffer, this.position);
    this.skip(buffer.length);
  }

  writeInt8(int8: number = 0){
    this.tmp8[0] = int8 & 0xFF;
    this.appendData(this.tmp8);
  }

  writeUInt8(uint8: number = 0){
    this.tmp8[0] = uint8 & 0xFF;
    this.appendData(this.tmp8);
  }

  writeInt16(int16: number = 0){
    this.tmp16.set([int16 & 0xFF, (int16 >> 8) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp16.reverse();
    }
    this.appendData(this.tmp16);
  }

  writeUInt16(uint16: number = 0){
    this.tmp16.set([uint16 & 0xFF, (uint16 >> 8) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp16.reverse();
    }
    this.appendData(this.tmp16);
  }

  writeInt32(int32: number = 0){
    this.tmp32.set([int32 & 0xFF, (int32 >> 8) & 0xFF, (int32 >> 16) & 0xFF, (int32 >> 24) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp32.reverse();
    }
    this.appendData(this.tmp32);
  }

  writeUInt32(uint32: number = 0){
    this.tmp32.set([uint32 & 0xFF, (uint32 >> 8) & 0xFF, (uint32 >> 16) & 0xFF, (uint32 >> 24) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp32.reverse();
    }
    this.appendData(this.tmp32);
  }

  writeChar(char: string, encoding='ascii'){
    if(!char.length){ return; }

    this.tmp8[0] = char.charCodeAt(0) & 0xFF;
    this.appendData(this.tmp8);
  }

  writeChars(chars: any|any[] = [], encoding='ascii'){
    if(typeof chars === 'string')
      chars = chars.split('');

    if(!chars.length){ return; }

    const tmpBuffer = new Uint8Array(chars.length);
    for(let i = 0; i < chars.length; i++){
      tmpBuffer[i] = chars[i].charCodeAt(0) & 0xFF;
    }
    this.appendData(tmpBuffer);
  }

  writeString(string: string, encoding='ascii'){
    this.writeChars(string, encoding);
  }

  writeStringNullTerminated(string: string, encoding='ascii'){
    this.writeChars(string, encoding);
    this.writeByte(0);
  }

  writeByte(byte: number){
    this.writeUInt8(byte & 0xFF);
  }

  writeBytes(bytes: Uint8Array){
    this.appendData(bytes);
  }

  write(tmpBuffer: Uint8Array){
    this.appendData(tmpBuffer);
  }

  writeSingle(single: number = 0){
    this.tmp32.set([single & 0xFF, (single >> 8) & 0xFF, (single >> 16) & 0xFF, (single >> 24) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp32.reverse();
    }
    this.appendData(this.tmp32);
  }

  writeDouble(double: number = 0){
    this.tmp64.set([double & 0xFF, (double >> 8) & 0xFF, (double >> 16) & 0xFF, (double >> 24) & 0xFF, (double >> 32) & 0xFF, (double >> 40) & 0xFF, (double >> 48) & 0xFF, (double >> 56) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp64.reverse();
    }
    this.appendData(this.tmp64);
  }

  writeUInt64(uint64: number = 0){
    this.tmp64.set([uint64 & 0xFF, (uint64 >> 8) & 0xFF, (uint64 >> 16) & 0xFF, (uint64 >> 24) & 0xFF, (uint64 >> 32) & 0xFF, (uint64 >> 40) & 0xFF, (uint64 >> 48) & 0xFF, (uint64 >> 56) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp64.reverse();
    }
    this.appendData(this.tmp64);
  }

  writeInt64(int64: number = 0){
    this.tmp64.set([int64 & 0xFF, (int64 >> 8) & 0xFF, (int64 >> 16) & 0xFF, (int64 >> 24) & 0xFF, (int64 >> 32) & 0xFF, (int64 >> 40) & 0xFF, (int64 >> 48) & 0xFF, (int64 >> 56) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp64.reverse();
    }
    this.appendData(this.tmp64);
  }

  close(){

  }

}
