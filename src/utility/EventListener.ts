import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Manager);

/** Callback type for event listeners (args match processEventListener). */
export type EventListenerCallback = (...args: (string | number | boolean | object)[]) => void;

/**
 * Event Listener
 * @description A class that manages event listeners
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file EventListener.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EventListener {

  /**
   * Event listeners
   */
  #eventListeners: Record<string, EventListenerCallback[]> = {};

  /**
   * Constructor
   */
  constructor(){
    this.#eventListeners = {};
  }

  /**
   * Add an event listener
   * @param type
   * @param cb
   */
  addEventListener<T extends string>(type: T, cb: EventListenerCallback): void {
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
    if(Array.isArray(this.#eventListeners[type])){
      const ev = this.#eventListeners[type];
      const index = ev.indexOf(cb);
      if(index == -1){
        ev.push(cb);
      }else{
        log.warn('Event Listener: Already added', type);
      }
    }else{
      log.warn('Event Listener: Unsupported', type);
    }
  }

  /**
   * Remove an event listener
   * @param type
   * @param cb
   */
  removeEventListener<T extends string>(type: T, cb: EventListenerCallback): void {
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
    if(Array.isArray(this.#eventListeners[type])){
      const ev = this.#eventListeners[type];
      const index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
      }else{
        log.warn('Event Listener: Already removed', type);
      }
    }else{
      log.warn('Event Listener: Unsupported', type);
    }
  }

  /**
   * Process an event listener
   * @param type
   * @param args
   */
  processEventListener<T extends string>(type: T, args: (string | number | boolean | object)[] = []): void {
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
    if(Array.isArray(this.#eventListeners[type])){
      const ev = this.#eventListeners[type];
      for (let i = 0; i < ev.length; i++) {
        const callback = ev[i];
        callback(...args);
      }
    }else{
      log.warn('Event Listener: Unsupported', type);
    }
  }
}
