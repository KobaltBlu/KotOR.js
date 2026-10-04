import { EventListener } from "@core/utility/EventListener";

export type EventCallback = (event: any) => void;

export class EventManager {
  static #listener = new EventListener();

  static AddListener(name: string, callback: EventCallback): void {
    if(!name || typeof callback !== 'function')
      return;

    EventManager.#listener.addEventListener(name, callback);
  }

  static RemoveListener(name: string, callback: EventCallback): void {
    if(!name || typeof callback !== 'function')
      return;

    EventManager.#listener.removeEventListener(name, callback);
  }

  static ClearListeners(name?: string): void {
    EventManager.#listener.clearEventListeners(name);
  }

  static FireEvent(name: string, event: any = {}): void {
    if(!name)
      return;

    EventManager.#listener.processEventListener(name, [event]);
  }
}
