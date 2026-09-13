import type { ModuleObject } from "@/module/ModuleObject";

/**
 * Objects that support GetFortitude/Reflex/WillSavingThrow and Fortitude/Reflex/WillSave.
 * Retail: creatures, doors, and placeables only.
 */
export interface SaveCapable {
  getFortitudeSave(): number;
  getReflexSave(): number;
  getWillSave(): number;
  fortitudeSave(nDC?: number, nSaveType?: number, oVersus?: ModuleObject): number;
  reflexSave(nDC?: number, nSaveType?: number, oVersus?: ModuleObject): number;
  willSave(nDC?: number, nSaveType?: number, oVersus?: ModuleObject): number;
}
