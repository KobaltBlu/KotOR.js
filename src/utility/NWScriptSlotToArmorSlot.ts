import { ModuleCreatureArmorSlot } from "../enums/module/ModuleCreatureArmorSlot";

export const NWScriptSlotToArmorSlot = function(slot = 0){
  switch(slot){
    case 0:
      return ModuleCreatureArmorSlot.HEAD;
    case 1:
      return ModuleCreatureArmorSlot.ARMOR;
    case 2:
      return ModuleCreatureArmorSlot.ARMS;
    case 3:
      return ModuleCreatureArmorSlot.RIGHTHAND;
    case 4:
      return ModuleCreatureArmorSlot.LEFTHAND;
    case 5:
      return ModuleCreatureArmorSlot.LEFTARMBAND;
    case 6:
      return ModuleCreatureArmorSlot.RIGHTARMBAND;
    case 7:
      return ModuleCreatureArmorSlot.IMPLANT;
    case 8:
      return ModuleCreatureArmorSlot.BELT;
    case 9:
      return ModuleCreatureArmorSlot.CLAW1;
    case 10:
      return ModuleCreatureArmorSlot.CLAW2;
    case 14:
      return ModuleCreatureArmorSlot.CLAW3;
    case 15:
      return ModuleCreatureArmorSlot.HIDE;
    case 16:
      return ModuleCreatureArmorSlot.HEAD;
    case 17:
      return ModuleCreatureArmorSlot.ARMOR; //Creature Armor
  }
}