import React from 'react';

import { ModalHelpBrowser } from '@/apps/forge/components/modal/ModalHelpBrowser';
import { HELP_FOLDERS, type HelpFolder } from '@/apps/forge/data';
import { ModalState } from '@/apps/forge/states/modal/ModalState';

export class ModalHelpBrowserState extends ModalState {
  title: string = 'Forge Help & Tutorials';
  #folders: HelpFolder[] = HELP_FOLDERS;

  constructor() {
    super();
    this.setView(<ModalHelpBrowser modal={this} />);
  }

  getFolders(): HelpFolder[] {
    return this.#folders;
  }
}
