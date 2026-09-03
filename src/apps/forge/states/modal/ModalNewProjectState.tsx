import React from "react";
import { ModalNewProject } from "@/apps/forge/components/modal/ModalNewProject";
import { ModalState } from "@/apps/forge/states/modal/ModalState";

export class ModalNewProjectState extends ModalState {

  title: string = 'New Project';

  constructor(){
    super();
    this.setView(<ModalNewProject modal={this} />);
  }
}
