import { Endians } from "../../enums/resource/Endians";

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

  /**
   * Constructor for the BinaryWriter class.
   * 
   * @param buffer - The buffer to write to.
   * @param endians - The endianness of the data.
   */
  constructor( buffer = new Uint8Array(0), endians = Endians.LITTLE ){
    this.position = 0;
    this.buffer = buffer;
    this.length = this.buffer.length; 
    this.endians = endians;
  }

  /**
   * Disposes of the BinaryWriter class.
   */
  dispose(): void {
    this.buffer = new Uint8Array(0);
  }

  /**
   * Seeks to a position in the buffer.
   * 
   * @param pos - The position to seek to.
   */
  seek(pos: number){
    this.position = pos;
  }

  /**
   * Skips a number of bytes in the buffer.
   * 
   * @param num - The number of bytes to skip.
   */
  skip(num: number){
    this.position += num;
  }

  /**
   * Returns the current position in the buffer.
   * 
   * @returns The current position in the buffer.
   */
  tell(){
    return this.position;
  }

  /**
   * Enlarges the buffer to a target length.
   * 
   * @param buffer - The buffer to enlarge.
   */
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

  /**
   * Appends data to the buffer.
   * 
   * @param buffer - The data to append.
   */
  appendData(buffer: Uint8Array){
    if(!buffer || buffer.length === 0){ return; }

    this.enlargeBuffer(buffer);
    this.length = this.buffer.length;
    this.buffer.set(buffer, this.position);
    this.skip(buffer.length);
  }

  /**
   * Writes an 8-bit integer to the buffer.
   * 
   * @param int8 - The integer to write.
   */
  writeInt8(int8: number = 0){
    this.tmp8[0] = int8 & 0xFF;
    this.appendData(this.tmp8);
  }

  /**
   * Writes an unsigned 8-bit integer to the buffer.
   * 
   * @param uint8 - The unsigned integer to write.
   */
  writeUInt8(uint8: number = 0){
    this.tmp8[0] = uint8 & 0xFF;
    this.appendData(this.tmp8);
  }

  /**
   * Writes a 16-bit integer to the buffer.
   * 
   * @param int16 - The integer to write.
   */
  writeInt16(int16: number = 0){
    this.tmp16.set([int16 & 0xFF, (int16 >> 8) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp16.reverse();
    }
    this.appendData(this.tmp16);
  }

  /**
   * Writes an unsigned 16-bit integer to the buffer.
   * 
   * @param uint16 - The unsigned integer to write.
   */
  writeUInt16(uint16: number = 0){
    this.tmp16.set([uint16 & 0xFF, (uint16 >> 8) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp16.reverse();
    }
    this.appendData(this.tmp16);
  }

  /**
   * Writes a 32-bit integer to the buffer.
   * 
   * @param int32 - The integer to write.
   */
  writeInt32(int32: number = 0){
    this.tmp32.set([int32 & 0xFF, (int32 >> 8) & 0xFF, (int32 >> 16) & 0xFF, (int32 >> 24) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp32.reverse();
    }
    this.appendData(this.tmp32);
  }

  /**
   * Writes an unsigned 32-bit integer to the buffer.
   * 
   * @param uint32 - The unsigned integer to write.
   */
  writeUInt32(uint32: number = 0){
    this.tmp32.set([uint32 & 0xFF, (uint32 >> 8) & 0xFF, (uint32 >> 16) & 0xFF, (uint32 >> 24) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp32.reverse();
    }
    this.appendData(this.tmp32);
  }

  /**
   * Writes a character to the buffer.
   * 
   * @param char - The character to write.
   * @param encoding - The encoding of the character.
   */
  writeChar(char: string){
    if(!char.length){ return; }

    this.tmp8[0] = char.charCodeAt(0) & 0xFF;
    this.appendData(this.tmp8);
  }

  /**
   * Writes a string to the buffer.
   * 
   * @param chars - The string to write.
   * @param encoding - The encoding of the string.
   */
  writeChars(chars: any|any[] = []){
    if(typeof chars === 'string')
      chars = chars.split('');

    if(!chars.length){ return; }

    const tmpBuffer = new Uint8Array(chars.length);
    for(let i = 0; i < chars.length; i++){
      tmpBuffer[i] = chars[i].charCodeAt(0) & 0xFF;
    }
    this.appendData(tmpBuffer);
  }

  /**
   * Writes a string to the buffer.
   * 
   * @param string - The string to write.
   * @param encoding - The encoding of the string.
   */
  writeString(string: string){
    this.writeChars(string);
  }

  /**
   * Writes a string to the buffer with a null terminator.
   * 
   * @param string - The string to write.
   * @param encoding - The encoding of the string.
   */
  writeStringNullTerminated(string: string){
    this.writeChars(string);
    this.writeByte(0);
  }

  /**
   * Writes a byte to the buffer.
   * 
   * @param byte - The byte to write.
   */
  writeByte(byte: number){
    this.writeUInt8(byte & 0xFF);
  }

  /**
   * Writes an array of bytes to the buffer.
   * 
   * @param bytes - The array of bytes to write.
   */
  writeBytes(bytes: Uint8Array){
    this.appendData(bytes);
  }

  /**
   * Writes a buffer to the buffer.
   * 
   * @param tmpBuffer - The buffer to write.
   */
  write(tmpBuffer: Uint8Array){
    this.appendData(tmpBuffer);
  }

  /**
   * Writes a single-precision floating point number to the buffer.
   * 
   * @param single - The single-precision floating point number to write.
   */
  writeSingle(single: number = 0){
    const floatView = new Float32Array(1);
    floatView[0] = single;
    const uint8View = new Uint8Array(floatView.buffer);
    this.tmp32.set(uint8View);
    if(this.endians == Endians.BIG){
      this.tmp32.reverse();
    }
    this.appendData(this.tmp32);
  }

  /**
   * Writes a double-precision floating point number to the buffer.
   * 
   * @param double - The double-precision floating point number to write.
   */
  writeDouble(double: number = 0){
    const doubleView = new Float64Array(1);
    doubleView[0] = double;
    const uint8View = new Uint8Array(doubleView.buffer);
    this.tmp64.set(uint8View);
    if(this.endians == Endians.BIG){
      this.tmp64.reverse();
    }
    this.appendData(this.tmp64);
  }

  /**
   * Writes a 64-bit unsigned integer to the buffer.
   * 
   * @param uint64 - The 64-bit unsigned integer to write.
   */
  writeUInt64(uint64: number = 0){
    this.tmp64.set([uint64 & 0xFF, (uint64 >> 8) & 0xFF, (uint64 >> 16) & 0xFF, (uint64 >> 24) & 0xFF, (uint64 >> 32) & 0xFF, (uint64 >> 40) & 0xFF, (uint64 >> 48) & 0xFF, (uint64 >> 56) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp64.reverse();
    }
    this.appendData(this.tmp64);
  }

  /**
   * Writes a 64-bit integer to the buffer.
   * 
   * @param int64 - The 64-bit integer to write.
   */
  writeInt64(int64: number = 0){
    this.tmp64.set([int64 & 0xFF, (int64 >> 8) & 0xFF, (int64 >> 16) & 0xFF, (int64 >> 24) & 0xFF, (int64 >> 32) & 0xFF, (int64 >> 40) & 0xFF, (int64 >> 48) & 0xFF, (int64 >> 56) & 0xFF]);
    if(this.endians == Endians.BIG){
      this.tmp64.reverse();
    }
    this.appendData(this.tmp64);
  }

  /**
   * Closes the BinaryWriter class.
   */
  close(){
    //todo: implement this
  }

}
