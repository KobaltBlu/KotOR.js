import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class ModalManagerState extends EventListenerModel {

  public modals: ModalState[] = [];

  constructor(){
    super();
  }

  getIndexOfModal(modal: ModalState): number {
    return this.modals.indexOf(modal);
  }

  hasModal(modal: ModalState): boolean {
    return this.getIndexOfModal(modal) >= 0;
  }

  addModal(modal: ModalState){
    const idx = this.getIndexOfModal(modal);
    if(idx == -1){
      this.modals.push(modal);
      modal.attachToModalManager(this);
      this.processEventListener('onModalAdded');
    }
  }

  removeModal(modal: ModalState){
    const idx = this.getIndexOfModal(modal);
    if(idx >= 0){
      this.modals.splice(idx, 1);
      this.processEventListener('onModalRemoved');
    }
  }

}