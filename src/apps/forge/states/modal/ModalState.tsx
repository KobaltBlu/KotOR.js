import React from "react";

import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import { ModalManagerState } from "@/apps/forge/states/modal/ModalManagerState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class ModalState extends EventListenerModel {

  static NEXT_ID: number = 0;

  id: number;
  type: string = this.constructor.name;
  visible: boolean = false;
  title: string = '';

  #manager: ModalManagerState;
  #modalView: React.ReactElement = (<></>);

  constructor(){
    super();
    this.id = ++ModalState.NEXT_ID;
    log.trace('ModalState constructor', this.constructor.name, this.id);
  }

  setView(view: React.ReactElement){
    log.trace('ModalState setView', this.constructor.name);
    this.#modalView = view;
  }

  getView(){
    return this.#modalView;
  }

  attachToModalManager(manager: ModalManagerState){
    log.trace('ModalState attachToModalManager', this.constructor.name);
    this.#manager = manager;
    if(!this.#manager.hasModal(this)){
      this.#manager.addModal(this);
    }
    this.processEventListener('onAttach', [this]);
  }

  hide(){
    log.trace('ModalState hide', this.constructor.name);
    this.visible = false;
    this.processEventListener('onHide', [this]);
  }

  show(){
    log.trace('ModalState show', this.constructor.name);
    this.visible = true;
    this.processEventListener('onShow', [this]);
  }

  open(){
    log.trace('ModalState open', this.constructor.name);
    this.show();
    this.processEventListener('onOpen', [this]);
  }

  close(){
    log.trace('ModalState close', this.constructor.name);
    this.hide();
    this.processEventListener('onClose', [this]);
    if(this.#manager){
      this.#manager.removeModal(this);
    }
  }

  destroy(){
    log.trace('ModalState destroy', this.constructor.name);
    this.close();
    if(this.#manager){
      this.#manager.removeModal(this);
    }
    this.processEventListener('onDestory', [this]);
  }
}
