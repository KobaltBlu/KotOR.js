import React from "react";

import { ModalHelpBrowser } from "../../components/modal/ModalHelpBrowser";

import { HELP_FOLDERS, type HelpFolder } from "../../data";

import { ModalState } from "./ModalState";

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
