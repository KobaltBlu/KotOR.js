/**
 * Open the New Module wizard for the current project.
 *
 * @file openNewModuleWizard.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ModalNewModuleState } from "@/apps/forge/states/modal/ModalNewModuleState";
import { ForgeState } from "@/apps/forge/states/ForgeState";

export function openNewModuleWizard(): void {
  const modal = new ModalNewModuleState();
  ForgeState.modalManager.addModal(modal);
  modal.open();
}
