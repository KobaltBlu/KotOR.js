/**
 * Modal state for New Project from Module archive.
 *
 * @file ModalNewProjectFromModState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ModalNewProjectFromMod } from "@/apps/forge/components/modal/ModalNewProjectFromMod";
import { ModalState } from "@/apps/forge/states/modal/ModalState";

export class ModalNewProjectFromModState extends ModalState {

  title: string = "New Project from Module";

  constructor(){
    super();
    this.setView(<ModalNewProjectFromMod modal={this} />);
  }
}
