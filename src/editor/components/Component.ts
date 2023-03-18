import { EditorTab } from "../tabs";

export class Component {
  $component: JQuery<HTMLElement>;
  tab: EditorTab;
  eventListeners: any = {};

  constructor(){
    this.$component = $('<div class="forge-component" />');
  }

  attachTo($element: JQuery<HTMLElement>){
    if($element instanceof jQuery){
      $element.append(this.$component);
    }
  }

  

  addEventListener(key: string = '', cb?: Function){
    if(typeof cb === 'function'){
      if(this.eventListeners.hasOwnProperty(key)){
        let ev = this.eventListeners[key];
        if(Array.isArray(ev)){
          let exists = ev.indexOf(cb) >= 0 ? true : false;
          if(!exists){
            ev.push(cb);
          }
        }
      }
    }
  }

  removeEventListener(key: string = '', cb?: Function){
    if(typeof cb === 'function'){
      if(this.eventListeners.hasOwnProperty(key)){
        let ev = this.eventListeners[key];
        if(Array.isArray(ev)){
          let index = ev.indexOf(cb);
          if(index >= 0){
            ev.splice(index, 1);
          }
        }
      }
    }
  }

  processEventListener(key: string = '', data: any = {}){
    if(this.eventListeners.hasOwnProperty(key)){
      let ev = this.eventListeners[key];
      if(Array.isArray(ev)){
        for(let i = 0, len = ev.length; i < len; i++){
          let event = ev[i];
          if(typeof event === 'function'){
            event(data);
          }
        }
      }
    }
  }

}