import React from "react";
import { ModalNewModule } from "@/apps/forge/components/modal/ModalNewModule";
import { ModalState } from "@/apps/forge/states/modal/ModalState";

export class ModalNewModuleState extends ModalState {

  title: string = "New Module";

  constructor(){
    super();
    this.setView(<ModalNewModule modal={this} />);
  }
}
