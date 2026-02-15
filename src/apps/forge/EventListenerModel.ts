import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

/** Event listener callback - accepts event payload (caller passes appropriate args per event type). */
export type EventListenerCallback = (...args: unknown[]) => void;

/** Map of event type to list of callback functions */
type EventListenerMap = Record<string, EventListenerCallback[]>;

export class EventListenerModel {
  #eventListeners: EventListenerMap = {};

  addEventListener<T extends string>(type: T, cb: EventListenerCallback): void {
    log.trace('EventListenerModel.addEventListener', type);
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
    if(Array.isArray(this.#eventListeners[type])){
      const ev = this.#eventListeners[type];
      const index = ev.indexOf(cb);
      if(index === -1){
        ev.push(cb);
        log.trace('EventListenerModel.addEventListener added', type, ev.length);
      }else{
        log.warn('EventListenerModel', 'Event listener already added', String(type));
      }
    }else{
      log.warn('EventListenerModel', 'Unsupported event type', String(type));
    }
  }

  removeEventListener<T extends string>(type: T, cb: EventListenerCallback): void {
    log.trace('EventListenerModel.removeEventListener', type);
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
    if(Array.isArray(this.#eventListeners[type])){
      const ev = this.#eventListeners[type];
      const index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
        log.trace('EventListenerModel.removeEventListener removed', type);
      }else{
        log.warn('Event Listener: Already removed', type);
      }
    }else{
      log.warn('EventListenerModel', 'Unsupported event type', String(type));
    }
  }

  processEventListener<T extends string>(type: T, args: unknown[] = []): void {
    log.trace('EventListenerModel.processEventListener', type);
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
    if(Array.isArray(this.#eventListeners[type])){
      const ev = this.#eventListeners[type];
      log.trace('EventListenerModel.processEventListener listeners', ev.length);
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      log.warn('EventListenerModel', 'Unsupported event type', String(type));
    }
  }

  triggerEventListener<T extends string>(type: T, args: unknown[] = []): void {
    log.trace('EventListenerModel.triggerEventListener', type);
    this.processEventListener(type, args);
  }
}