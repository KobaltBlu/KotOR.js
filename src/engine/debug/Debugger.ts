import { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { NWScriptInstruction } from "@core/nwscript/NWScriptInstruction";
import { IPCMessage } from "@engine/debug/server/ipc/IPCMessage";
import { IPCMessageParam } from "@engine/debug/server/ipc/IPCMessageParam";
import { DebuggerState, type DebuggerPendingResume } from "@engine/enums/server/DebuggerState";
import { NWScriptStack } from "@engine/nwscript/NWScriptStack";

export type DebuggerHostMode = 'iframe' | 'window';

const HOST_PREF_KEY = 'kotor.devTools.host';

/**
 * Debugger / Dev Tools host bridge.
 *
 * Supports an in-game iframe modal and a popped-out window, sharing one
 * BroadcastChannel session (`debugger-${uuid}`).
 */
export class Debugger {
  static IPCMessage: typeof IPCMessage = IPCMessage;
  static IPCMessageParam: typeof IPCMessageParam = IPCMessageParam;

  static broadcastChannel: BroadcastChannel | null;
  static uuid: string = crypto.randomUUID();
  /** Popped-out window, or iframe contentWindow when embedded. */
  static window: WindowProxy | null;
  static iframe: HTMLIFrameElement | null = null;
  static hostMode: DebuggerHostMode | null = null;

  static #eventListener: any = {};
  static #windowWatchId: number | null = null;
  static #migrating = false;

  static state: DebuggerState = DebuggerState.Idle;

  static currentScript: NWScriptInstance;
  static currentStack: NWScriptStack;
  static currentInstruction: NWScriptInstruction;
  static mainLoopPaused: boolean = false;

  /** Continue / Step queued for the next GameState.Update tick. */
  static pendingResume: DebuggerPendingResume | null = null;

  static showFPS: boolean = false;
  static statsMode: number = 0;

  static get preferredHost(): DebuggerHostMode {
    try{
      const v = localStorage.getItem(HOST_PREF_KEY);
      if(v === 'window' || v === 'iframe'){ return v; }
    }catch{ /* ignore */ }
    return 'iframe';
  }

  static setPreferredHost(mode: DebuggerHostMode){
    try{ localStorage.setItem(HOST_PREF_KEY, mode); }catch{ /* ignore */ }
  }

  static isOpen(): boolean {
    return !!this.broadcastChannel && this.hostMode != null;
  }

  static getDebuggerUrl(host: DebuggerHostMode): string {
    return `../debugger/index.html?uuid=${this.uuid}&host=${host}`;
  }

  /**
   * Sends a message to the debugger client.
   */
  static send(message: IPCMessage|string) {
    if(!this.broadcastChannel) {
      return;
    }
    if(typeof message == 'string')
    {
      this.broadcastChannel.postMessage(message);
    }
    else
    {
      this.broadcastChannel.postMessage(message.toBuffer());
    }
  }

  static ensureChannel(){
    if(this.broadcastChannel){ return; }
    this.broadcastChannel = new BroadcastChannel(`debugger-${this.uuid}`);
    this.broadcastChannel.onmessage = (event: MessageEvent) => {
      if(typeof event.data == 'string') {
        if(event.data == 'close') {
          Debugger.close();
        }else if(event.data == 'popout') {
          Debugger.popOut();
        }else if(event.data == 'dock') {
          Debugger.dock();
        }
        return;
      }

      if(event.data?.constructor == Uint8Array){
        const msg = IPCMessage.fromBuffer(event.data);
        this.dispatchEvent('message', msg);
      }
    };
  }

  static #clearWindowWatch(){
    if(this.#windowWatchId != null){
      window.clearInterval(this.#windowWatchId);
      this.#windowWatchId = null;
    }
  }

  static #watchPopoutWindow(){
    this.#clearWindowWatch();
    this.#windowWatchId = window.setInterval(() => {
      if(this.hostMode !== 'window'){
        this.#clearWindowWatch();
        return;
      }
      if(this.window && this.window.closed){
        this.close();
      }
    }, 500);
  }

  /**
   * Opens Dev Tools (iframe by default, or last preferred host).
   */
  static open(opts?: { mode?: DebuggerHostMode }) {
    const mode = opts?.mode ?? this.preferredHost;

    if(this.isOpen()) {
      if(this.hostMode === mode){
        this.focus();
        return;
      }
      if(mode === 'window'){
        this.popOut();
      }else{
        this.dock();
      }
      return;
    }

    this.ensureChannel();
    this.hostMode = mode;
    this.setPreferredHost(mode);

    if(mode === 'window'){
      this.window = window.open(this.getDebuggerUrl('window'), '_blank', 'width=1600,height=1200');
      if(!this.window){
        // Popup blocked — fall back to iframe.
        this.hostMode = 'iframe';
        this.setPreferredHost('iframe');
        this.dispatchEvent('iframe-open');
      }else{
        this.#watchPopoutWindow();
      }
    }else{
      this.window = null;
      this.dispatchEvent('iframe-open');
    }

    this.dispatchEvent('open');
  }

  /** Toggle: close if open, otherwise open preferred host. */
  static toggle(opts?: { mode?: DebuggerHostMode }) {
    if(this.isOpen()){
      this.close();
      return;
    }
    this.open(opts);
  }

  /** Attach the in-game iframe element after React mounts it. */
  static attachIframe(iframe: HTMLIFrameElement | null) {
    this.iframe = iframe;
    if(iframe?.contentWindow){
      this.window = iframe.contentWindow;
    }
  }

  static focus() {
    if(this.hostMode === 'window' && this.window && !this.window.closed){
      this.window.focus();
      return;
    }
    if(this.hostMode === 'iframe'){
      this.dispatchEvent('iframe-focus');
    }
  }

  /**
   * Move from iframe → popped-out window without ending the debug session.
   */
  static popOut() {
    this.ensureChannel();
    this.#migrating = true;
    this.setPreferredHost('window');

    const popup = window.open(this.getDebuggerUrl('window'), '_blank', 'width=1600,height=1200');
    if(!popup){
      this.#migrating = false;
      return;
    }

    this.hostMode = 'window';
    this.window = popup;
    this.iframe = null;
    this.#watchPopoutWindow();
    this.dispatchEvent('iframe-close');
    this.#migrating = false;
    window.setTimeout(() => this.dispatchEvent('client-reconnected'), 300);
  }

  /**
   * Move from popped-out window → in-game iframe without ending the session.
   */
  static dock() {
    this.ensureChannel();
    this.#migrating = true;
    this.setPreferredHost('iframe');
    this.#clearWindowWatch();

    if(this.window && this.hostMode === 'window' && !this.window.closed){
      try{ this.window.close(); }catch{ /* ignore */ }
    }

    this.hostMode = 'iframe';
    this.window = null;
    this.iframe = null;
    this.dispatchEvent('iframe-open');
    this.#migrating = false;
    window.setTimeout(() => this.dispatchEvent('client-reconnected'), 300);
  }

  /**
   * Closes the inspector (iframe and/or window) and ends the debug session.
   */
  static close() {
    if(this.#migrating){
      return;
    }

    this.#clearWindowWatch();

    if (this.window && this.hostMode === 'window') {
      try{ this.window.close(); }catch{ /* ignore */ }
    }
    this.window = null;
    this.iframe = null;
    this.hostMode = null;

    if(this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    this.broadcastChannel = null;
    this.pendingResume = null;
    this.dispatchEvent('iframe-close');
    this.dispatchEvent('close');
  }

  static queueResume(action: DebuggerPendingResume['action'], seek: number) {
    this.pendingResume = { action, seek };
  }

  static clearDebugHalt() {
    this.state = DebuggerState.Idle;
    this.currentScript = undefined as any;
    this.currentInstruction = undefined as any;
    this.pendingResume = null;
  }

  static addEventListener(event: string, listener: any) {
    if(!Array.isArray(this.#eventListener[event])) {
      this.#eventListener[event] = [];
    }
    const index = this.#eventListener[event].indexOf(listener);
    if(index == -1) {
      this.#eventListener[event].push(listener);
    }
  }

  static removeEventListener(event: string, listener: any) {
    if(!Array.isArray(this.#eventListener[event])) {
      this.#eventListener[event] = [];
    }
    const index = this.#eventListener[event].indexOf(listener);
    if(index >= 0) {
      this.#eventListener[event].splice(index, 1);
    }
  }

  static dispatchEvent(event: string, ...args: any) {
    if(!Array.isArray(this.#eventListener[event])) {
      return;
    }
    this.#eventListener[event].forEach((listener: any) => listener(...args));
  }
}
