import { NWScriptInstance } from "./nwscript/NWScriptInstance";
import { NWScriptInstruction } from "./nwscript/NWScriptInstruction";
import { IPCMessage } from "./server/ipc/IPCMessage";
import { IPCMessageParam } from "./server/ipc/IPCMessageParam";
import { DebuggerState } from "./enums/server/DebuggerState";
import { NWScriptStack } from "./nwscript/NWScriptStack";

/**
 * Debugger class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file Debugger.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class Debugger {
  /**
   * The IPCMessage class.
   */
  static IPCMessage: typeof IPCMessage = IPCMessage;
  /**
   * The IPCMessageParam class.
   */
  static IPCMessageParam: typeof IPCMessageParam = IPCMessageParam;
  /**
   * The broadcast channel.
   */
  static broadcastChannel: BroadcastChannel | null;
  /**
   * The UUID of the debugger.
   */
  static uuid: string = crypto.randomUUID();
  /**
   * The window of the debugger.
   */
  static window: WindowProxy | null;

  static #eventListener: any = {};

  static state: DebuggerState = DebuggerState.Idle;

  static currentScript: NWScriptInstance;
  static currentStack: NWScriptStack;
  static currentInstruction: NWScriptInstruction;
  static mainLoopPaused: boolean = false;

  static showFPS: boolean = false;
  static statsMode: number = 0;

  /**
   * Sends a message to the debugger.
   * @param message The message to send.
   */
  static send(message: IPCMessage|string) {
    if(!this.window || !this.broadcastChannel) {
      return;
    }
    /**
     * Debug string messages are sent as-is.
     */
    if(typeof message == 'string')
    {
      this.broadcastChannel.postMessage(message);
    }
    /**
     * Complex messages are sent as binary data.
     */
    else
    {
      this.broadcastChannel.postMessage(message.toBuffer());
    }
  }

  /**
   * Opens the debugger window.
   */
  static open() {
    if(this.window) { 
      this.window.focus();
      return;
    }

    this.window = window.open(`../debugger/index.html?uuid=${this.uuid}`, '_blank', 'width=1600,height=1200');
    if(this.window) {
      console.log(`Debugger window opened: ${this.uuid}`);
      this.broadcastChannel = new BroadcastChannel(`debugger-${this.uuid}`);
      this.broadcastChannel.onmessage = (event: MessageEvent) => {
        if(typeof event.data == 'string') {
          if(event.data == 'close') {
            Debugger.close();
          }
          return;
        }
        
        if(event.data?.constructor == Uint8Array){
          const msg = IPCMessage.fromBuffer(event.data);
          this.dispatchEvent('message', msg);
        }
      };
      this.window.addEventListener('close', () => {
        console.log(`Debugger window closed: ${this.uuid}`);
      });
      this.dispatchEvent('open');
    }
  }

  /**
   * Closes the debugger window.
   */
  static close() {
    if (this.window) {
      this.window.close();
    }
    this.window = null;
    if(this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    this.broadcastChannel = null;
    this.dispatchEvent('close');
  }

  /**
   * Adds an event listener to the debugger.
   * @param event The event to listen for.
   * @param listener The listener to add.
   */
  static addEventListener(event: string, listener: any) {
    if(!Array.isArray(this.#eventListener[event])) {
      this.#eventListener[event] = [];
    }
    const index = this.#eventListener[event].indexOf(listener);
    if(index == -1) {
      this.#eventListener[event].push(listener);
    }
  }

  /**
   * Removes an event listener from the debugger.
   * @param event The event to remove the listener from.
   * @param listener The listener to remove.
   */
  static removeEventListener(event: string, listener: any) {
    if(!Array.isArray(this.#eventListener[event])) {
      this.#eventListener[event] = [];
    }
    const index = this.#eventListener[event].indexOf(listener);
    if(index >= 0) {
      this.#eventListener[event].splice(index, 1);
    }
  }

  /**
   * Dispatches an event to the debugger.
   * @param event The event to dispatch.
   * @param args The arguments to pass to the event.
   */
  static dispatchEvent(event: string, ...args: any) {
    if(!Array.isArray(this.#eventListener[event])) {
      return;
    }
    this.#eventListener[event].forEach((listener: any) => listener(...args));
  }
}