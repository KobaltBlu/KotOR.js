import type { InventoryItemEntry } from "@/apps/forge/module-editor/ForgeCreature";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import {
  InventoryEditorMode,
  ModalInventoryBrowserState,
} from "@/apps/forge/states/modal/ModalInventoryBrowserState";

export function openInventoryBrowserModal(
  inventory: InventoryItemEntry[],
  onSave?: (inventory: InventoryItemEntry[]) => void,
  mode: InventoryEditorMode = 'creature',
): ModalInventoryBrowserState {
  const modal = new ModalInventoryBrowserState(inventory, onSave, mode);
  modal.attachToModalManager(ForgeState.modalManager);
  modal.open();
  return modal;
}
