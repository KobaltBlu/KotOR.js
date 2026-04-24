import { createScopedLogger, LogScope } from '@/utility/Logger';

const log = createScopedLogger(LogScope.Debug);

export class EventListenerModel {
  #eventListeners: Record<string, ((...args: (string | number | boolean | object | null)[]) => void)[]> = {};

  addEventListener<T extends string>(
    type: T,
    cb: (...args: (string | number | boolean | object | null)[]) => void
  ): void {
    log.trace('addEventListener', type);
    if (!Array.isArray(this.#eventListeners[type])) {
      this.#eventListeners[type] = [];
    }
    if (Array.isArray(this.#eventListeners[type])) {
      const ev = this.#eventListeners[type];
      const index = ev.indexOf(cb);
      if (index == -1) {
        ev.push(cb);
      } else {
        log.warn('Event Listener: Already added', type);
      }
    } else {
      log.warn('Event Listener: Unsupported', type);
    }
  }

  removeEventListener<T extends string>(type: T, cb: (...args: unknown[]) => void): void {
    if (!Array.isArray(this.#eventListeners[type])) {
      this.#eventListeners[type] = [];
    }
    if (Array.isArray(this.#eventListeners[type])) {
      const ev = this.#eventListeners[type];
      const index = ev.indexOf(cb);
      if (index >= 0) {
        ev.splice(index, 1);
      } else {
        log.warn('Event Listener: Already removed', type);
      }
    } else {
      log.warn('Event Listener: Unsupported', type);
    }
  }

  processEventListener<T extends string>(type: T, args: (string | number | boolean | object | null)[] = []): void {
    if (!Array.isArray(this.#eventListeners[type])) {
      this.#eventListeners[type] = [];
    }
    if (Array.isArray(this.#eventListeners[type])) {
      const ev = this.#eventListeners[type];
      for (let i = 0; i < ev.length; i++) {
        const callback = ev[i];
        if (typeof callback === 'function') {
          callback(...args);
        }
      }
    } else {
      log.warn('Event Listener: Unsupported', type);
    }
  }

  triggerEventListener<T extends string>(type: T, args: (string | number | boolean | object | null)[] = []): void {
    this.processEventListener(type, args);
  }
}
