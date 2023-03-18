import React from "react";
import { EventListenerModel } from "../../EventListenerModel";
import { ModalManagerState } from "./ModalManagerState";

export class ModalState extends EventListenerModel {

  static NEXT_ID: number = 0;

  id: number;
  type: string = this.constructor.name;
  visible: boolean = false;
  title: string = '';

  #manager: ModalManagerState;
  #modalView: JSX.Element = (<></>);

  constructor(){
    super();
    this.id = ++ModalState.NEXT_ID;

  }

  setView(view: JSX.Element){
    this.#modalView = view;
  }

  getView(){
    return this.#modalView;
  }

  attachToModalManager(manager: ModalManagerState){
    this.#manager = manager;
    if(!this.#manager.hasModal(this)){
      this.#manager.addModal(this);
    }
    this.processEventListener('onAttach', [this]);
  }

  hide(){
    this.visible = false;
    this.processEventListener('onHide', [this]);
  }

  show(){
    this.visible = true;
    this.processEventListener('onShow', [this]);
  }

  open(){
    this.show();
    this.processEventListener('onOpen', [this]);
  }

  close(){
    this.hide();
    this.processEventListener('onClose', [this]);
  }

  destroy(){
    this.close();
    this.#manager.removeModal(this);
    this.processEventListener('onDestory', [this]);
  }

}