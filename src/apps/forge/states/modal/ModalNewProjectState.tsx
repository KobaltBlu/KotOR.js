import React from "react";
import { ModalNewProject } from "../../components/modal/ModalNewProject";
import { ModalState } from "./ModalState";

export class ModalNewProjectState extends ModalState {

  title: string = 'New Project';

  constructor(){
    super();
    this.setView(<ModalNewProject modal={this} />);
  }
}