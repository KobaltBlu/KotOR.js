import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { ModuleObject } from "@/module";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import {
  defineAction,
  floatParam,
  intParam,
  objectParam,
  stringParam,
} from "@/nwscript/builtins/actionBuilder";

export const Random = defineAction({
  id: 0,
  name: "Random",
  comment: "0: Get an integer between 0 and nMaxInteger-1. Return value on error: 0.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nMaxInteger"),
  ] as const,

  kotor(this: NWScriptInstance, nMaxInteger) {
    return Math.round(Math.random() * (nMaxInteger - 1));
  },
});

export const PrintString = defineAction({
  id: 1,
  name: "PrintString",
  comment: "1: Output sString to the log file.",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sString"),
  ] as const,

  kotor(this: NWScriptInstance, sString) {
    // Preserve current behavior.
    // console.log("PrintString", sString);
  },
});

export const PrintFloat = defineAction({
  id: 2,
  name: "PrintFloat",
  comment:
    "2: Output a formatted float to the log file.\n" +
    "- nWidth should be a value from 0 to 18 inclusive.\n" +
    "- nDecimals should be a value from 0 to 9 inclusive.",
  returnType: NWScriptDataType.VOID,
  params: [
    floatParam("fFloat"),
    intParam("nWidth", { optional: true, default: 18 }),
    intParam("nDecimals", { optional: true, default: 2 }),
  ] as const,

  kotor(this: NWScriptInstance, fFloat, nWidth, nDecimals) {
    const output = fFloat.toFixed(nDecimals);
    // console.log(output);
  },
});

export const FloatToString = defineAction({
  id: 3,
  name: "FloatToString",
  comment:
    "3: Convert fFloat into a string.\n" +
    "- nWidth should be a value from 0 to 18 inclusive.\n" +
    "- nDecimals should be a value from 0 to 9 inclusive.",
  returnType: NWScriptDataType.STRING,
  params: [
    floatParam("fFloat"),
    intParam("nWidth", { optional: true, default: 18 }),
    intParam("nDecimals", { optional: true, default: 2 }),
  ] as const,

  kotor(this: NWScriptInstance, fFloat, nWidth, nDecimals) {
    const output =
      ("0000000000000000000" + parseInt(fFloat.toString())).substr(-nWidth) +
      (nDecimals ? (((fFloat % 1) + "00000000000").substr(1, nDecimals)) : "");

    return output;
  },
});

export const PrintInteger = defineAction({
  id: 4,
  name: "PrintInteger",
  comment: "4: Output nInteger to the log file.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nInteger"),
  ] as const,

  kotor(this: NWScriptInstance, nInteger) {
    // Preserve current behavior.
    // console.log(nInteger);
  },
});

export const PrintObject = defineAction({
  id: 5,
  name: "PrintObject",
  comment: "5: Output oObject's ID to the log file.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oObject) {
    // Preserve current behavior.
    // console.log(oObject?.id);
  },
});

export const IntToString = defineAction({
  id: 92,
  name: "IntToString",
  comment: "92: Convert nInteger into a string. Return value on error: ''.",
  returnType: NWScriptDataType.STRING,
  params: [
    intParam("nInteger"),
  ] as const,

  kotor(this: NWScriptInstance, nInteger) {
    return parseInt(nInteger as any) + "";
  },
});

export const IntToFloat = defineAction({
  id: 230,
  name: "IntToFloat",
  comment: "230: Convert nInteger into a floating point number.",
  returnType: NWScriptDataType.FLOAT,
  params: [
    intParam("nInteger"),
  ] as const,

  kotor(this: NWScriptInstance, nInteger) {
    return parseFloat(nInteger as any);
  },
});

export const FloatToInt = defineAction({
  id: 231,
  name: "FloatToInt",
  comment: "231: Convert fFloat into the nearest integer.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    floatParam("fFloat"),
  ] as const,

  kotor(this: NWScriptInstance, fFloat) {
    return parseInt(fFloat as any);
  },
});

export const StringToInt = defineAction({
  id: 232,
  name: "StringToInt",
  comment: "232: Convert sNumber into an integer.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    stringParam("sNumber"),
  ] as const,

  kotor(this: NWScriptInstance, sNumber) {
    return parseInt(sNumber);
  },
});

export const StringToFloat = defineAction({
  id: 233,
  name: "StringToFloat",
  comment: "233: Convert sNumber into a floating point number.",
  returnType: NWScriptDataType.FLOAT,
  params: [
    stringParam("sNumber"),
  ] as const,

  kotor(this: NWScriptInstance, sNumber) {
    return parseFloat(sNumber);
  },
});

export const ObjectToString = defineAction({
  id: 272,
  name: "ObjectToString",
  comment: "272: Convert oObject into a hexadecimal string.",
  returnType: NWScriptDataType.STRING,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oObject) {
    if (oObject && typeof oObject === "object") {
      return oObject.getName();
    }

    return "OBJECT_INVALID";
  },
});

export const coreActions = [
  Random,
  PrintString,
  PrintFloat,
  FloatToString,
  PrintInteger,
  PrintObject,
  IntToString,
  IntToFloat,
  FloatToInt,
  StringToInt,
  StringToFloat,
  ObjectToString,
] as const;
