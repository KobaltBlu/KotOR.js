/**
 * Server Worker
 * This is a stub for the eventual server worker that will be used to handle the game server logic.
 */

import { IPCMessage } from "../server/ipc/IPCMessage";

/**
 * Odyssey Server
 * This is the main class for the server worker.
 */
class OdysseyServer {

  /**
   * Handle Message From Client
   * This is the message handler for the server worker.
   */
  static HandleMessageFromClient(msg: IPCMessage){
    console.log('Odyssey Server: IPC Message Received');
  }

  /**
   * Send Message To Client
   * This method sends a message to the client.
   */
  static SendMessageToClient(msg: IPCMessage){
    console.log('Odyssey Server: IPC Message Sent');
    postMessage(msg.toBuffer());
  }

}

/**
 * Message Handler
 * This is the message handler for the server worker.
 */
onmessage = function (e: MessageEvent){
  if(e.data?.constructor === Uint8Array ){
    const msg = IPCMessage.fromBuffer(e.data);
    OdysseyServer.HandleMessageFromClient(msg);
    return;
  }

  if(typeof e.data === 'string'){
    console.log('Odyssey Server: Debug Message Received', e.data);
    return;
  }

  console.log('Odyssey Server: Unknown Message Received', e.data);
}

/**
 * Debug Message
 * This is a debug message for the server worker.
 */
console.log('Odyssey Server: ONLINE');