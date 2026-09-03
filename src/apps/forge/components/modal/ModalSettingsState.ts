/**
 * Show/hide events for the Settings dialog.
 *
 * @file ModalSettingsState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type ModalSettingsEventListenerTypes = "onShow" | "onHide";

export interface ModalSettingsEventListeners {
  onShow: Function[];
  onHide: Function[];
}

export class ModalSettingsState {

  static eventListeners: ModalSettingsEventListeners = {
    onShow: [],
    onHide: [],
  };

  static AddEventListener(type: ModalSettingsEventListenerTypes, cb: Function){
    if(Array.isArray(ModalSettingsState.eventListeners[type])){
      let ev = ModalSettingsState.eventListeners[type];
      let index = ev.indexOf(cb);
      if(index == -1){
        ev.push(cb);
      }else{
        console.warn('Event Listener: Already added', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static RemoveEventListener(type: ModalSettingsEventListenerTypes, cb: Function){
    if(Array.isArray(ModalSettingsState.eventListeners[type])){
      let ev = ModalSettingsState.eventListeners[type];
      let index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
      }else{
        console.warn('Event Listener: Already removed', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static ProcessEventListener(type: ModalSettingsEventListenerTypes, args: any[] = []){
    if(Array.isArray(ModalSettingsState.eventListeners[type])){
      let ev = ModalSettingsState.eventListeners[type];
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static TriggerEventListener(type: ModalSettingsEventListenerTypes, args: any[] = []){
    ModalSettingsState.ProcessEventListener(type, args);
  }

  static Show(pageId?: string) {
    ModalSettingsState.TriggerEventListener('onShow', pageId ? [pageId] : []);
  }

  static Hide() {
    ModalSettingsState.TriggerEventListener('onHide');
  }
}
