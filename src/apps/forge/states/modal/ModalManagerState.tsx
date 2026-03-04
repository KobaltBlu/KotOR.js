import { EventListenerModel } from "@/apps/forge/EventListenerModel";
import { ModalState } from "@/apps/forge/states/modal/ModalState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class ModalManagerState extends EventListenerModel {

  public modals: ModalState[] = [];

  constructor(){
    super();
    log.trace('ModalManagerState constructor');
  }

  getIndexOfModal(modal: ModalState): number {
    const idx = this.modals.indexOf(modal);
    log.trace('ModalManagerState.getIndexOfModal', idx);
    return idx;
  }

  hasModal(modal: ModalState): boolean {
    const has = this.getIndexOfModal(modal) >= 0;
    log.trace('ModalManagerState.hasModal', has);
    return has;
  }

  addModal(modal: ModalState){
    log.trace('ModalManagerState.addModal');
    const idx = this.getIndexOfModal(modal);
    if(idx === -1){
      this.modals.push(modal);
      modal.attachToModalManager(this);
      this.processEventListener('onModalAdded');
      log.debug('ModalManagerState.addModal done', this.modals.length);
    } else {
      log.trace('ModalManagerState.addModal already present');
    }
  }

  removeModal(modal: ModalState){
    log.trace('ModalManagerState.removeModal');
    const idx = this.getIndexOfModal(modal);
    if(idx >= 0){
      this.modals.splice(idx, 1);
      this.processEventListener('onModalRemoved');
      log.debug('ModalManagerState.removeModal done', this.modals.length);
    }
  }

}