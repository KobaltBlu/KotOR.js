import { GameEngineType } from "@/enums/engine/GameEngineType";
import { GameState } from "@/GameState";

export interface CharGenClassInterface {
  /** classes.2da row id */
  id: number;
  strings: {
    name: number,
    gender: number,
    description: number,
  },
  /** appearance.2da rows selectable on the portrait screen (one body size per class) */
  appearances: number[]
}

/**
 * K1 class-select slots (classsel.gui BTN_SEL1..6): male Scoundrel/Scout/Soldier,
 * female Soldier/Scout/Scoundrel. Appearance rows come from the vanilla K1
 * portraits.2da PC rows: small body (appearance_s) for the Scoundrel, medium
 * (appearancenumber) for the Scout, large (appearance_l) for the Soldier.
 */
export const CharGenClasses: {[key: number]: CharGenClassInterface} = {
  0: {
    id: 2,
    strings: {
      name: 135,
      gender: 358,
      description: 32109
    },
    appearances: [136, 139, 142, 145, 148, 151, 154, 157, 160, 163, 166, 169, 172, 175, 178]
  },
  1: {
    id: 1,
    strings: {
      name: 133,
      gender: 358,
      description: 32110
    },
    appearances: [137, 140, 143, 146, 149, 152, 155, 158, 161, 164, 167, 170, 173, 176, 179]
  },
  2: {
    id: 0,
    strings: {
      name: 134,
      gender: 358,
      description: 32111
    },
    appearances: [138, 141, 144, 147, 150, 153, 156, 159, 162, 165, 168, 171, 174, 177, 180]
  },
  3: {
    id: 0,
    strings: {
      name: 134,
      gender: 359,
      description: 32111
    },
    appearances: [93, 96, 99, 102, 105, 108, 111, 114, 117, 120, 123, 126, 129, 132, 135]
  },
  4: {
    id: 1,
    strings: {
      name: 133,
      gender: 359,
      description: 32110
    },
    appearances: [92, 95, 98, 101, 104, 107, 110, 113, 116, 119, 122, 125, 128, 131, 134]
  },
  5: {
    id: 2,
    strings: {
      name: 135,
      gender: 359,
      description: 32109
    },
    appearances: [91, 94, 97, 100, 103, 106, 109, 112, 115, 118, 121, 124, 127, 130, 133]
  }
};

/** Body size of a PC appearance: which portraits.2da column / appearance label it comes from */
export enum CharGenBodySize {
  SMALL = 0,
  MEDIUM = 1,
  LARGE = 2,
}

/**
 * TSL class-select slots (classsel_p.gui BTN_SEL1..6), mirroring the K1
 * pattern: BTN_SEL1 male Consular, BTN_SEL2 male Sentinel, BTN_SEL3 male
 * Guardian, BTN_SEL4 female Guardian, BTN_SEL5 female Sentinel, BTN_SEL6
 * female Consular (reone classselect.cpp; classes.2da ids 4/5/3 are the same
 * in both games). Body size: Consular small, Sentinel medium, Guardian large.
 *
 * UNCERTAIN (no TSL data available to verify): reone and xoreos disagree on
 * whether BTN_SEL2/BTN_SEL3 (and SEL4/SEL5) are Sentinel/Guardian or
 * Guardian/Sentinel; reone's order is used because it is consistent with the
 * K1 button pattern. Class names are taken from the TSL classes.2da 'name'
 * column at runtime (resolveCharGenClasses); 353/354/355 are the K1 values and
 * only a fallback. Gender strrefs 646/647 (reone + xoreos agree). Description
 * strrefs 48031 (Consular) / 48032 (Sentinel) / 48033 (Guardian) are reone's
 * assignment (xoreos swaps 48032/48033).
 *
 * The appearance lists are empty here and filled at runtime from the TSL
 * portraits.2da PC rows (forpc == 1, by sex: appearance_s / appearancenumber /
 * appearance_l), with the appearance.2da P_MAL_ / P_FEM_ labels as a fallback.
 */
export const CharGenClassesTSL: {[key: number]: CharGenClassInterface} = {
  0: {
    id: 4,
    strings: {
      name: 354,
      gender: 646,
      description: 48031
    },
    appearances: []
  },
  1: {
    id: 5,
    strings: {
      name: 355,
      gender: 646,
      description: 48032
    },
    appearances: []
  },
  2: {
    id: 3,
    strings: {
      name: 353,
      gender: 646,
      description: 48033
    },
    appearances: []
  },
  3: {
    id: 3,
    strings: {
      name: 353,
      gender: 647,
      description: 48033
    },
    appearances: []
  },
  4: {
    id: 5,
    strings: {
      name: 355,
      gender: 647,
      description: 48032
    },
    appearances: []
  },
  5: {
    id: 4,
    strings: {
      name: 354,
      gender: 647,
      description: 48031
    },
    appearances: []
  }
};

/** Slot -> gender (0 male, 1 female); identical in both games */
export function getCharGenSlotGender(slot: number): number {
  return slot < 3 ? 0 : 1;
}

/** Slot -> body size; the K1 and TSL slot orders share the small/medium/large/large/medium/small pattern */
export function getCharGenSlotBodySize(slot: number): CharGenBodySize {
  switch(slot){
    case 0: case 5: return CharGenBodySize.SMALL;
    case 1: case 4: return CharGenBodySize.MEDIUM;
    default: return CharGenBodySize.LARGE;
  }
}

let tslResolved = false;

/**
 * PC appearance rows for a gender/body size from portraits.2da (rows with
 * forpc == 1 and the matching sex). Returns an empty list when the table has
 * no PC rows (e.g. the column is missing).
 */
function getPCAppearancesFromPortraits(gender: number, size: CharGenBodySize): number[] {
  const portraits = GameState.SWRuleSet?.portraits || [];
  const rows: number[] = [];
  for(let i = 0; i < portraits.length; i++){
    const portrait = portraits[i];
    if(!portrait || portrait.forpc != 1 || portrait.sex != gender){ continue; }
    let appearance = 0;
    switch(size){
      case CharGenBodySize.SMALL: appearance = portrait.appearance_s; break;
      case CharGenBodySize.MEDIUM: appearance = portrait.appearancenumber; break;
      default: appearance = portrait.appearance_l; break;
    }
    if(appearance > 0 && rows.indexOf(appearance) == -1){
      rows.push(appearance);
    }
  }
  return rows;
}

/**
 * Fallback: PC appearance rows by appearance.2da label (P_FEM_A_SML_01,
 * P_MAL_C_LRG_04, ...), which both games use for the player bodies.
 */
function getPCAppearancesFromLabels(gender: number, size: CharGenBodySize): number[] {
  const appearances = GameState.SWRuleSet?.creatureAppearances || [];
  const sizeCode = size == CharGenBodySize.SMALL ? 'SML' : (size == CharGenBodySize.MEDIUM ? 'MED' : 'LRG');
  const pattern = new RegExp(`^P_${gender == 0 ? 'MAL' : 'FEM'}_[A-Z]_${sizeCode}_\\d+$`, 'i');
  const rows: number[] = [];
  for(let i = 0; i < appearances.length; i++){
    const appearance = appearances[i];
    if(!appearance || !pattern.test(appearance.label || '')){ continue; }
    rows.push(typeof appearance.id === 'number' && appearance.id >= 0 ? appearance.id : i);
  }
  return rows;
}

/**
 * Fills the runtime-derived parts of the TSL table (class name strrefs from
 * classes.2da, PC appearance rows from portraits.2da / appearance.2da). Safe
 * to call repeatedly; it only does work once the rule set is loaded.
 */
export function resolveCharGenClasses(){
  if(GameState.GameKey != GameEngineType.TSL || tslResolved){ return; }
  if(!GameState.SWRuleSet || !GameState.SWRuleSet.classes || !GameState.SWRuleSet.classes.length){ return; }

  for(let slot = 0; slot < 6; slot++){
    const entry = CharGenClassesTSL[slot];
    const creatureClass = GameState.SWRuleSet.classes[entry.id];
    if(creatureClass && typeof creatureClass.name === 'number' && creatureClass.name >= 0){
      entry.strings.name = creatureClass.name;
    }

    const gender = getCharGenSlotGender(slot);
    const size = getCharGenSlotBodySize(slot);
    let rows = getPCAppearancesFromPortraits(gender, size);
    if(!rows.length){
      rows = getPCAppearancesFromLabels(gender, size);
    }
    if(!rows.length){
      //Last resort: the K1 rows keep the screen usable, but the bodies will be wrong
      console.warn('CharGenClasses', 'no TSL PC appearances found for slot', slot, '- falling back to the K1 rows');
      rows = CharGenClasses[slot].appearances.slice(0);
    }
    entry.appearances = rows;
  }
  tslResolved = true;
}

/**
 * The class-select slot table of the running game.
 */
export function getCharGenClassTable(): {[key: number]: CharGenClassInterface} {
  if(GameState.GameKey == GameEngineType.TSL){
    resolveCharGenClasses();
    return CharGenClassesTSL;
  }
  return CharGenClasses;
}

/**
 * Class-select slot entry (0-5) of the running game.
 */
export function getCharGenClass(slot: number): CharGenClassInterface {
  const table = getCharGenClassTable();
  return table[slot] || table[0];
}
