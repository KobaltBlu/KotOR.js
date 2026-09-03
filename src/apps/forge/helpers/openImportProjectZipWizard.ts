/**
 * Open the Import Project from ZIP wizard.
 *
 * @file openImportProjectZipWizard.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ModalImportProjectZipState } from "@/apps/forge/states/modal/ModalImportProjectZipState";
import { ForgeState } from "@/apps/forge/states/ForgeState";

export function openImportProjectZipWizard(): void {
  const modal = new ModalImportProjectZipState();
  ForgeState.modalManager.addModal(modal);
  modal.open();
}
