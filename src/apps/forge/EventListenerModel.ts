import { createScopedLogger, LogScope } from "../../utility/Logger";

const log = createScopedLogger(LogScope.Forge);

/** Map of event type to list of callback functions */
type EventListenerMap = Record<string, Function[]>;

export class EventListenerModel {
  #eventListeners: EventListenerMap = {};

  addEventListener<T>(type: T, cb: Function): void {
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
    if(Array.isArray(this.#eventListeners[type])){
      const ev = this.#eventListeners[type];
      const index = ev.indexOf(cb);
      if(index == -1){
        ev.push(cb);
      }else{
        log.warn('EventListenerModel', 'Event listener already added', String(type));
      }
    }else{
      log.warn('EventListenerModel', 'Unsupported event type', String(type));
    }
  }

  removeEventListener<T>(type: T, cb: Function): void {
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
      log.warn('EventListenerModel', 'Unsupported event type', String(type));
    }
  }

  processEventListener<T>(type: T, args: unknown[] = []): void {
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
    if(Array.isArray(this.#eventListeners[type])){
      const ev = this.#eventListeners[type];
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

  triggerEventListener<T>(type: T, args: unknown[] = []): void {
    this.processEventListener(type, args);
  }
}0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      log.warn('Event Listener: Unsupported', type);
    }
  }

  triggerEventListener<T extends string>(type: T, args: (string | number | boolean | object | null)[] = []): void {
    this.processEventListener(type, args);
  }
}