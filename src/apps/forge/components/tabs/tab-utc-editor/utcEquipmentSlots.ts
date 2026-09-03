import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";

/** Retail `racialtypes`: 5 = droid, 6 = human. */
export const RACIALTYPE_DROID = 5;
export const RACIALTYPE_HUMAN = 6;

export type CreatureEquipProperty =
  | "slotHead"
  | "slotArmor"
  | "slotArms"
  | "slotRightHand"
  | "slotLeftHand"
  | "slotLeftArmband"
  | "slotRightArmband"
  | "slotImplant"
  | "slotBelt"
  | "slotClaw1"
  | "slotClaw2"
  | "slotClaw3"
  | "slotHide"
  | "slotRightHand2"
  | "slotLeftHand2";

export interface EquipSlotDef {
  id: string;
  label: string;
  slot: ModuleCreatureArmorSlot;
  property: CreatureEquipProperty;
  emptyHuman: string;
  emptyDroid: string;
}

export const EQUIP_SLOT_PROPERTY: Record<ModuleCreatureArmorSlot, CreatureEquipProperty> = {
  [ModuleCreatureArmorSlot.HEAD]: "slotHead",
  [ModuleCreatureArmorSlot.ARMOR]: "slotArmor",
  [ModuleCreatureArmorSlot.ARMS]: "slotArms",
  [ModuleCreatureArmorSlot.RIGHTHAND]: "slotRightHand",
  [ModuleCreatureArmorSlot.LEFTHAND]: "slotLeftHand",
  [ModuleCreatureArmorSlot.LEFTARMBAND]: "slotLeftArmband",
  [ModuleCreatureArmorSlot.RIGHTARMBAND]: "slotRightArmband",
  [ModuleCreatureArmorSlot.IMPLANT]: "slotImplant",
  [ModuleCreatureArmorSlot.BELT]: "slotBelt",
  [ModuleCreatureArmorSlot.CLAW1]: "slotClaw1",
  [ModuleCreatureArmorSlot.CLAW2]: "slotClaw2",
  [ModuleCreatureArmorSlot.CLAW3]: "slotClaw3",
  [ModuleCreatureArmorSlot.HIDE]: "slotHide",
  [ModuleCreatureArmorSlot.RIGHTHAND2]: "slotRightHand2",
  [ModuleCreatureArmorSlot.LEFTHAND2]: "slotLeftHand2",
};

export const PAPERDOLL_SLOTS: EquipSlotDef[] = [
  { id: "implant", label: "Implant", slot: ModuleCreatureArmorSlot.IMPLANT, property: "slotImplant", emptyHuman: "iimplant", emptyDroid: "idimplant" },
  { id: "head", label: "Head", slot: ModuleCreatureArmorSlot.HEAD, property: "slotHead", emptyHuman: "ihead", emptyDroid: "idhead" },
  { id: "hands", label: "Hands", slot: ModuleCreatureArmorSlot.ARMS, property: "slotArms", emptyHuman: "ihands", emptyDroid: "idhands" },
  { id: "larm", label: "L Arm", slot: ModuleCreatureArmorSlot.LEFTARMBAND, property: "slotLeftArmband", emptyHuman: "iforearm_l", emptyDroid: "idforearm_l" },
  { id: "armor", label: "Armor", slot: ModuleCreatureArmorSlot.ARMOR, property: "slotArmor", emptyHuman: "iarmor", emptyDroid: "idarmor" },
  { id: "rarm", label: "R Arm", slot: ModuleCreatureArmorSlot.RIGHTARMBAND, property: "slotRightArmband", emptyHuman: "iforearm_r", emptyDroid: "idforearm_r" },
  { id: "lweap", label: "L Weapon", slot: ModuleCreatureArmorSlot.LEFTHAND, property: "slotLeftHand", emptyHuman: "iweap_l", emptyDroid: "idweap_l" },
  { id: "belt", label: "Belt", slot: ModuleCreatureArmorSlot.BELT, property: "slotBelt", emptyHuman: "ibelt", emptyDroid: "idbelt" },
  { id: "rweap", label: "R Weapon", slot: ModuleCreatureArmorSlot.RIGHTHAND, property: "slotRightHand", emptyHuman: "iweap_r", emptyDroid: "idweap_r" },
];

export const TSL_WEAPON2_SLOTS: EquipSlotDef[] = [
  { id: "lweap2", label: "L Weapon 2", slot: ModuleCreatureArmorSlot.LEFTHAND2, property: "slotLeftHand2", emptyHuman: "iweap_l", emptyDroid: "idweap_l" },
  { id: "rweap2", label: "R Weapon 2", slot: ModuleCreatureArmorSlot.RIGHTHAND2, property: "slotRightHand2", emptyHuman: "iweap_r", emptyDroid: "idweap_r" },
];

export const NATURAL_SLOTS: EquipSlotDef[] = [
  { id: "hide", label: "Hide", slot: ModuleCreatureArmorSlot.HIDE, property: "slotHide", emptyHuman: "", emptyDroid: "" },
  { id: "claw1", label: "Claw 1", slot: ModuleCreatureArmorSlot.CLAW1, property: "slotClaw1", emptyHuman: "", emptyDroid: "" },
  { id: "claw2", label: "Claw 2", slot: ModuleCreatureArmorSlot.CLAW2, property: "slotClaw2", emptyHuman: "", emptyDroid: "" },
  { id: "claw3", label: "Claw 3", slot: ModuleCreatureArmorSlot.CLAW3, property: "slotClaw3", emptyHuman: "", emptyDroid: "" },
];

export function isDroidRace(race: number): boolean {
  return race === RACIALTYPE_DROID;
}

/** Matches `InventoryManager.isItemUsableInSlot`. */
export function itemMatchesSlot(equipableSlots: number, slot: number): boolean {
  return !!(equipableSlots & slot) || equipableSlots === slot;
}

/** Matches `InventoryManager.isItemUsableBy` (droidorhuman 0=any, 1=human, 2=droid). */
export function itemMatchesRace(droidOrHuman: number, race: number): boolean {
  return !droidOrHuman ||
    (droidOrHuman === 1 && race === RACIALTYPE_HUMAN) ||
    (droidOrHuman === 2 && race === RACIALTYPE_DROID);
}

export function emptySlotTexture(human: string, droid: string, race: number): string {
  return isDroidRace(race) ? droid : human;
}

export function padModelVariation(modelVariation: number): string {
  return ("000" + modelVariation).slice(-3);
}

export function itemIconResRef(itemClass: string, modelVariation: number): string {
  const cls = (itemClass || "").toLowerCase();
  if (!cls) return "";
  return `i${cls}_${padModelVariation(modelVariation)}`;
}
