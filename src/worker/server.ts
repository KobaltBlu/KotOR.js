/* eslint-disable no-console */
/**
 * Server Worker
 * This is a stub for the eventual server worker that will be used to handle the game server logic.
 */


import { createScopedLogger, LogScope } from "../utility/Logger";

const log = createScopedLogger(LogScope.Manager);
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
  static HandleMessageFromClient(_msg: IPCMessage){
    log.info('Odyssey Server: IPC Message Received');
  }

  /**
   * Send Message To Client
   * This method sends a message to the client.
   */
  static SendMessageToClient(msg: IPCMessage){
    log.info('Odyssey Server: IPC Message Sent');
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
    log.info('Odyssey Server: Debug Message Received', e.data);
    return;
  }

  log.info('Odyssey Server: Unknown Message Received', e.data);
}

/**
 * Debug Message
 * This is a debug message for the server worker.
 */
log.info('Odyssey Server: ONLINE');
