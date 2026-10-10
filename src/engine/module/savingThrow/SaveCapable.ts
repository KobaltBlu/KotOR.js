import type { GameObject } from "@engine/module/GameObject";

/**
 * Objects that support GetFortitude/Reflex/WillSavingThrow and Fortitude/Reflex/WillSave.
 * Creatures, doors, and placeables only.
 */
export interface SaveCapable {
  getFortitudeSave(): number;
  getReflexSave(): number;
  getWillSave(): number;
  fortitudeSave(nDC?: number, nSaveType?: number, oVersus?: GameObject): number;
  reflexSave(nDC?: number, nSaveType?: number, oVersus?: GameObject): number;
  willSave(nDC?: number, nSaveType?: number, oVersus?: GameObject): number;
}
