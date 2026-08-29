/**
 * Open the New Project from Module wizard.
 *
 * @file openNewProjectFromModWizard.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { ModalNewProjectFromModState } from "@/apps/forge/states/modal/ModalNewProjectFromModState";
import { ForgeState } from "@/apps/forge/states/ForgeState";

export function openNewProjectFromModWizard(): void {
  const modal = new ModalNewProjectFromModState();
  ForgeState.modalManager.addModal(modal);
  modal.open();
}
