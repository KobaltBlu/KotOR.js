import { ModuleObject } from "./module";

export class CombatRoundAction {
  actionTimer: number = 0;
  animation: number = 0;
  animationTime: number = 0;
  numAttacks: number = 0;
  actionType: number = 0;
  target: ModuleObject;
  retargettable: number = 0;
  inventorySlot: ModuleObject;
  targetRepository: ModuleObject;
}