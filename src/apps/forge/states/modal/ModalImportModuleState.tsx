import React from "react";
import { ModalImportModule } from "@/apps/forge/components/modal/ModalImportModule";
import { ModalState } from "@/apps/forge/states/modal/ModalState";

export class ModalImportModuleState extends ModalState {

  title: string = "Import Module";

  constructor(){
    super();
    this.setView(<ModalImportModule modal={this} />);
  }
}
