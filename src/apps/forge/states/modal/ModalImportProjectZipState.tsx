/**
 * Modal state: Import Project from ZIP.
 *
 * @file ModalImportProjectZipState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ModalImportProjectZip } from "@/apps/forge/components/modal/ModalImportProjectZip";
import { ModalState } from "@/apps/forge/states/modal/ModalState";

export class ModalImportProjectZipState extends ModalState {
  title: string = "Import Project from ZIP";

  constructor() {
    super();
    this.setView(<ModalImportProjectZip modal={this} />);
  }
}
