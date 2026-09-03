/**
 * Open the Import Module wizard for the current project.
 *
 * @file openImportModuleWizard.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ModalImportModuleState } from "@/apps/forge/states/modal/ModalImportModuleState";
import { ForgeState } from "@/apps/forge/states/ForgeState";

export function openImportModuleWizard(): void {
  const modal = new ModalImportModuleState();
  ForgeState.modalManager.addModal(modal);
  modal.open();
}
