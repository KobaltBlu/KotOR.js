import React from "react";
import { ModalState } from "./ModalState";
import { ModalHelpBrowser } from "../../components/modal/ModalHelpBrowser";
import { HELP_FOLDERS, type HelpFolder } from "../../data";

export class ModalHelpBrowserState extends ModalState {
  title: string = "Forge Help & Tutorials";
  #folders: HelpFolder[] = HELP_FOLDERS;

  constructor() {
    super();
    this.setView(<ModalHelpBrowser modal={this} />);
  }

  getFolders(): HelpFolder[] {
    return this.#folders;
  }
}
