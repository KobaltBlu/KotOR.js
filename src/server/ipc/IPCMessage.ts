import { IPCMessageType } from "../../enums/server/IPCMessageType";
import { IPCMessageParam } from "./IPCMessageParam";

/**
 * Represents an IPCMessage.
 */
export class IPCMessage {
  /**
   * The size of the header of the IPCMessage.
   */
  static HeaderSize = 8;
  /**
   * The parameters of the IPCMessage.
   */
  #params: IPCMessageParam[] = [];
  /**
   * The type of the IPCMessage.
   */
  type: IPCMessageType;
  /**
   * The size of the data of the IPCMessage.
   */
  dataSize: number = 0;
  /**
   * The number of parameters in the IPCMessage.
   */
  paramCount: number = 0;

  constructor(type: IPCMessageType){
    this.type = type;
  }
  
  /**
   * Adds a parameter to the IPCMessage.
   * @param param The parameter to add.
   */
  addParam(param: IPCMessageParam){
    this.#params.push(param);
    this.dataSize += param.size;
    this.paramCount++;
  }

  /**
   * Gets a parameter from the IPCMessage.
   * @param index The index of the parameter to get.
   * @returns The parameter.
   */
  getParam(index: number): IPCMessageParam {
    return this.#params[index];
  }

  /**
   * Converts the IPCMessage to an output buffer.
   * @returns The buffer.
   */
  toBuffer(): Uint8Array {
    const buffer = new Uint8Array(IPCMessage.HeaderSize + this.dataSize);
    const view = new DataView(buffer.buffer);
    view.setInt32(0, this.type, true);
    view.setInt32(4, this.paramCount, true);
    let offset = IPCMessage.HeaderSize;
    for(let i = 0; i < this.#params.length; i++){
      const param = this.#params[i];
      buffer.set(param.toBuffer(), offset);
      offset += param.size;
    }
    return buffer;
  }

  /**
   * Restores the IPCMessage from a buffer.
   * @param buffer The buffer to restore from.
   * @returns The restored IPCMessage.
   */
  static fromBuffer(buffer: Uint8Array): IPCMessage {
    const view = new DataView(buffer.buffer);
    const message = new IPCMessage(view.getInt32(0, true) as IPCMessageType);
    const paramCount = view.getInt32(4, true);
    let offset = IPCMessage.HeaderSize;
    for(let i = 0; i < paramCount; i++){
      /**
       * Extract the data size from the buffer.
       */
      const dataSize = view.getInt32(offset + 4, true);
      /**
       * Calculate the total size of the parameter.
       */
      const paramSize = IPCMessageParam.HeaderSize + dataSize;
      /**
       * Restore the parameter from the buffer.
       */
      const param = IPCMessageParam.fromBuffer(buffer.slice(offset, offset + paramSize));
      message.addParam(param);
      /**
       * Move the offset to the next parameter.
       */
      offset += paramSize;
    }
    return message;
  }
}
