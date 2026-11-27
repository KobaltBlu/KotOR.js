import { Dice } from "@/utility/Dice";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam } from "@/nwscript/builtins/actionBuilder";

export const d2 = defineAction({
  id: 95,
  name: "d2",
  comment: "95: Get the total from rolling (nNumDice x d2 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNumDice", { optional: true, default: 1 })] as const,
  kotor(this: NWScriptInstance, nNumDice) {
    return Dice.rollD2(nNumDice || 1);
  },
});

export const d3 = defineAction({
  id: 96,
  name: "d3",
  comment: "96: Get the total from rolling (nNumDice x d3 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNumDice", { optional: true, default: 1 })] as const,
  kotor(this: NWScriptInstance, nNumDice) {
    return Dice.rollD3(nNumDice || 1);
  },
});

export const d4 = defineAction({
  id: 97,
  name: "d4",
  comment: "97: Get the total from rolling (nNumDice x d4 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNumDice", { optional: true, default: 1 })] as const,
  kotor(this: NWScriptInstance, nNumDice) {
    return Dice.rollD4(nNumDice || 1);
  },
});

export const d6 = defineAction({
  id: 98,
  name: "d6",
  comment: "98: Get the total from rolling (nNumDice x d6 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNumDice", { optional: true, default: 1 })] as const,
  kotor(this: NWScriptInstance, nNumDice) {
    return Dice.rollD6(nNumDice || 1);
  },
});

export const d8 = defineAction({
  id: 99,
  name: "d8",
  comment: "99: Get the total from rolling (nNumDice x d8 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNumDice", { optional: true, default: 1 })] as const,
  kotor(this: NWScriptInstance, nNumDice) {
    return Dice.rollD8(nNumDice || 1);
  },
});

export const d10 = defineAction({
  id: 100,
  name: "d10",
  comment: "100: Get the total from rolling (nNumDice x d10 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNumDice", { optional: true, default: 1 })] as const,
  kotor(this: NWScriptInstance, nNumDice) {
    return Dice.rollD10(nNumDice || 1);
  },
});

export const d12 = defineAction({
  id: 101,
  name: "d12",
  comment: "101: Get the total from rolling (nNumDice x d12 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNumDice", { optional: true, default: 1 })] as const,
  kotor(this: NWScriptInstance, nNumDice) {
    return Dice.rollD12(nNumDice || 1);
  },
});

export const d20 = defineAction({
  id: 102,
  name: "d20",
  comment: "102: Get the total from rolling (nNumDice x d20 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNumDice", { optional: true, default: 1 })] as const,
  kotor(this: NWScriptInstance, nNumDice) {
    return Dice.rollD20(nNumDice || 1);
  },
});

export const d100 = defineAction({
  id: 103,
  name: "d100",
  comment: "103: Get the total from rolling (nNumDice x d100 dice).\n- nNumDice: If this is less than 1, the value 1 will be used.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNumDice", { optional: true, default: 1 })] as const,
  kotor(this: NWScriptInstance, nNumDice) {
    return Dice.rollD100(nNumDice || 1);
  },
});

export const RoundsToSeconds = defineAction({
  id: 121,
  name: "RoundsToSeconds",
  comment: "121: Convert nRounds into a number of seconds.\nA round is always 3.0 seconds in KotOR/TSL.",
  returnType: NWScriptDataType.FLOAT,
  params: [intParam("nRounds")] as const,
  kotor(this: NWScriptInstance, nRounds) {
    return nRounds * 3.0;
  },
});

export const HoursToSeconds = defineAction({
  id: 122,
  name: "HoursToSeconds",
  comment: "122: Convert nHours into a number of seconds.\nThe result will depend on how many minutes there are per hour (game-time).",
  returnType: NWScriptDataType.FLOAT,
  params: [intParam("nHours")] as const,
  kotor(this: NWScriptInstance, nHours) {
    return nHours * 60.0;
  },
});

export const TurnsToSeconds = defineAction({
  id: 123,
  name: "TurnsToSeconds",
  comment: "123: Convert nTurns into a number of seconds.\nA turn is always 60.0 seconds.",
  returnType: NWScriptDataType.FLOAT,
  params: [intParam("nTurns")] as const,
  kotor(this: NWScriptInstance, nTurns) {
    return nTurns * 3.0 * 10.0;
  },
});

export const diceActions = [
  d2,
  d3,
  d4,
  d6,
  d8,
  d10,
  d12,
  d20,
  d100,
  RoundsToSeconds,
  HoursToSeconds,
  TurnsToSeconds,
] as const;
