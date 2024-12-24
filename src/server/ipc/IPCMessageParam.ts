import { BinaryReader } from "../../BinaryReader";
import { IPCDataType } from "../../enums/server/IPCDataType";

/**
 * Represents an IPCMessageParam.
 */
export class IPCMessageParam {
  /**
   * The size of the header of the IPCMessageParam.
   */
  static HeaderSize = 8;
  /**
   * The type of the IPCMessageParam.
   */
  type: IPCDataType;
  /**
   * The value of the IPCMessageParam.
   */
  value: Uint8Array;
  /**
   * The size of the IPCMessageParam.
   */
  size: number = IPCMessageParam.HeaderSize;

  constructor(type: IPCDataType, value?: any){
    this.type = type;
    if(value?.constructor == Uint8Array){
      /**
       * Wrap the passed value in a Uint8Array to create a deep copy in memory.
       */
      this.value = new Uint8Array(value);
    }else if(type == IPCDataType.STRING){
      this.value = new TextEncoder().encode(value ? value : '');
    }else if(typeof value == 'number' && type == IPCDataType.INTEGER){
      this.value = new Uint8Array(4);
      const view = new DataView(this.value.buffer); 
      view.setInt32(0, value, true);
    }else if(typeof value == 'number' && type == IPCDataType.FLOAT){
      this.value = new Uint8Array(4);
      const view = new DataView(this.value.buffer); 
      view.setFloat32(0, value, true);
    }else{
      return;
    }
    this.size = IPCMessageParam.HeaderSize + this.value.length;
  }
  
  /**
   * Returns the value as a string.
   * @returns The decoded string.
   */
  getString(): string {
    return new TextDecoder().decode(this.value);
  }

  /**
   * Returns the value as an integer.
   * @returns The decoded integer.
   */
  getInt32(): number {
    const view = new DataView(this.value.buffer);
    return view.getInt32(0, true);
  }

  /**
   * Returns the value as a float.
   * @returns The decoded float.
   */
  getFloat(): number {
    const view = new DataView(this.value.buffer);
    return view.getFloat32(0, true);
  }

  /**
   * Returns the value as a void.
   * @returns The binary value.
   */
  getVoid(): Uint8Array {
    return this.value;
  }

  /**
   * Converts the IPCMessageParam to an ouptut buffer.
   * @returns The buffer.
   */
  toBuffer(): Uint8Array {
    const buffer = new Uint8Array(IPCMessageParam.HeaderSize + this.value.length);
    const view = new DataView(buffer.buffer);
    view.setInt32(0, this.type, true);
    view.setInt32(4, this.value.length, true);
    buffer.set(this.value, IPCMessageParam.HeaderSize);
    return buffer;
  }

  /**
   * Restores the IPCMessageParam from a buffer.
   * @param buffer The buffer to restore from.
   * @returns The restored IPCMessageParam.
   */
  static fromBuffer(buffer: Uint8Array): IPCMessageParam {
    const view = new DataView(buffer.buffer);
    const type = view.getInt32(0, true);
    const size = view.getInt32(4, true);
    const value = buffer.slice(IPCMessageParam.HeaderSize, IPCMessageParam.HeaderSize + size);
    return new IPCMessageParam(type, value);
  }
}