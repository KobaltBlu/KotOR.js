/**
 * Game lifecycle / render-frame event bus (init, start, ready, beforeRender, afterRender).
 */
export class GameStateEvents {

  static eventListeners: Record<string, Function[]> = {
    "init": [],
    "start": [],
    "ready": [],
    "beforeRender": [],
    "afterRender": [],
  };

  static addEventListener(event: string, callback: Function){
    if(GameStateEvents.eventListeners.hasOwnProperty(event)){
      const callbacks: Function[] = GameStateEvents.eventListeners[event];
      if(callbacks){
        callbacks.push(callback);
      }
    }
  }

  static processEventListener(event: string, args: any[] = []){
    if(GameStateEvents.eventListeners.hasOwnProperty(event)){
      const callbacks = GameStateEvents.eventListeners[event];
      if(callbacks && callbacks.length){
        for(let i = 0, len = callbacks.length; i < len; i++){
          const cb = callbacks[i];
          if(typeof cb === 'function')
            cb(...args);
        }
      }
    }
  }

}
