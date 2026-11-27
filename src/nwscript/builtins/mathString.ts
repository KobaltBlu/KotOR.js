import * as THREE from "three";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, stringParam, vectorParam } from "@/nwscript/builtins/actionBuilder";

export const GetStringLength = defineAction({
  id: 59,
  name: "GetStringLength",
  comment: "59: Get the length of sString\n* Return value on error: -1\n",
  returnType: NWScriptDataType.INTEGER,
  params: [stringParam("sString")] as const,
  kotor(this: NWScriptInstance, sString) {
    return sString.length;
  },
});

export const GetStringUpperCase = defineAction({
  id: 60,
  name: "GetStringUpperCase",
  comment: "60: Convert sString into upper case\n* Return value on error: ''\n",
  returnType: NWScriptDataType.STRING,
  params: [stringParam("sString")] as const,
  kotor(this: NWScriptInstance, sString) {
    return sString.toUpperCase();
  },
});

export const GetStringLowerCase = defineAction({
  id: 61,
  name: "GetStringLowerCase",
  comment: "61: Convert sString into lower case\n* Return value on error: ''\n",
  returnType: NWScriptDataType.STRING,
  params: [stringParam("sString")] as const,
  kotor(this: NWScriptInstance, sString) {
    return sString.toLowerCase();
  },
});

export const GetStringRight = defineAction({
  id: 62,
  name: "GetStringRight",
  comment: "62: Get nCount characters from the right end of sString\n* Return value on error: ''\n",
  returnType: NWScriptDataType.STRING,
  params: [stringParam("sString"), intParam("nCount")] as const,
  kotor(this: NWScriptInstance, sString, nCount) {
    return sString.substr(-nCount, nCount);
  },
});

export const GetStringLeft = defineAction({
  id: 63,
  name: "GetStringLeft",
  comment: "63: Get nCounter characters from the left end of sString\n* Return value on error: ''\n",
  returnType: NWScriptDataType.STRING,
  params: [stringParam("sString"), intParam("nCount")] as const,
  kotor(this: NWScriptInstance, sString, nCount) {
    return sString.substr(0, nCount);
  },
});

export const InsertString = defineAction({
  id: 64,
  name: "InsertString",
  comment: "64: Insert sString into sDestination at nPosition\n* Return value on error: ''\n",
  returnType: NWScriptDataType.STRING,
  params: [stringParam("sDestination"), stringParam("sString"), intParam("nPosition")] as const,
  kotor(this: NWScriptInstance, sDestination, sString, nPosition) {
    return [
      sDestination.slice(0, nPosition),
      sString,
      sDestination.slice(nPosition),
    ].join("");
  },
});

export const GetSubString = defineAction({
  id: 65,
  name: "GetSubString",
  comment: "65: Get nCount characters from sString, starting at nStart\n* Return value on error: ''\n",
  returnType: NWScriptDataType.STRING,
  params: [stringParam("sString"), intParam("nStart"), intParam("nCount")] as const,
  kotor(this: NWScriptInstance, sString, nStart, nCount) {
    return sString.substr(nStart, nCount);
  },
});

export const FindSubString = defineAction({
  id: 66,
  name: "FindSubString",
  comment: "66: Find the position of sSubstring inside sString\n* Return value on error: -1\n",
  returnType: NWScriptDataType.INTEGER,
  params: [stringParam("sString"), stringParam("sSubstring")] as const,
  kotor(this: NWScriptInstance, sString, sSubstring) {
    return sString.indexOf(sSubstring);
  },
});

export const fabs = defineAction({
  id: 67,
  name: "fabs",
  comment: "67: Maths operation: absolute value of fValue\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fValue")] as const,
  kotor(this: NWScriptInstance, fValue) {
    return Math.abs(fValue);
  },
});

export const cos = defineAction({
  id: 68,
  name: "cos",
  comment: "68: Maths operation: cosine of fValue\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fValue")] as const,
  kotor(this: NWScriptInstance, fValue) {
    return Math.cos(fValue);
  },
});

export const sin = defineAction({
  id: 69,
  name: "sin",
  comment: "69: Maths operation: sine of fValue\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fValue")] as const,
  kotor(this: NWScriptInstance, fValue) {
    return Math.sin(fValue);
  },
});

export const tan = defineAction({
  id: 70,
  name: "tan",
  comment: "70: Maths operation: tan of fValue\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fValue")] as const,
  kotor(this: NWScriptInstance, fValue) {
    return Math.tan(fValue);
  },
});

export const acos = defineAction({
  id: 71,
  name: "acos",
  comment: "71: Maths operation: arccosine of fValue\n* Returns zero if fValue > 1 or fValue < -1\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fValue")] as const,
  kotor(this: NWScriptInstance, fValue) {
    return Math.acos(fValue);
  },
});

export const asin = defineAction({
  id: 72,
  name: "asin",
  comment: "72: Maths operation: arcsine of fValue\n* Returns zero if fValue >1 or fValue < -1\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fValue")] as const,
  kotor(this: NWScriptInstance, fValue) {
    return Math.asin(fValue);
  },
});

export const atan = defineAction({
  id: 73,
  name: "atan",
  comment: "73: Maths operation: arctan of fValue\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fValue")] as const,
  kotor(this: NWScriptInstance, fValue) {
    return Math.atan(fValue);
  },
});

export const log = defineAction({
  id: 74,
  name: "log",
  comment: "74: Maths operation: log of fValue\n* Returns zero if fValue <= zero\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fValue")] as const,
  kotor(this: NWScriptInstance, fValue) {
    return Math.log(fValue);
  },
});

export const pow = defineAction({
  id: 75,
  name: "pow",
  comment: "75: Maths operation: fValue is raised to the power of fExponent\n* Returns zero if fValue ==0 and fExponent <0\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fValue"), floatParam("fExponent")] as const,
  kotor(this: NWScriptInstance, fValue, fExponent) {
    return Math.pow(fValue, fExponent);
  },
});

export const sqrt = defineAction({
  id: 76,
  name: "sqrt",
  comment: "76: Maths operation: square root of fValue\n* Returns zero if fValue <0\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fValue")] as const,
  kotor(this: NWScriptInstance, fValue) {
    return Math.sqrt(fValue);
  },
});

export const abs = defineAction({
  id: 77,
  name: "abs",
  comment: "77: Maths operation: integer absolute value of nValue\n* Return value on error: 0\n",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nValue")] as const,
  kotor(this: NWScriptInstance, nValue) {
    return Math.abs(nValue);
  },
});

export const VectorNormalize = defineAction({
  id: 137,
  name: "VectorNormalize",
  comment: "137: Normalize vVector\n",
  returnType: NWScriptDataType.VECTOR,
  params: [vectorParam<THREE.Vector3>("vVector")] as const,
  kotor(this: NWScriptInstance, vVector) {
    return new THREE.Vector3(vVector.x, vVector.y, vVector.z).normalize();
  },
});

export const Vector = defineAction({
  id: 142,
  name: "Vector",
  comment: "142: Create a vector with the specified values for x, y and z\n",
  returnType: NWScriptDataType.VECTOR,
  params: [floatParam("fX"), floatParam("fY"), floatParam("fZ")] as const,
  kotor(this: NWScriptInstance, fX, fY, fZ) {
    return { x: fX, y: fY, z: fZ };
  },
});

export const FeetToMeters = defineAction({
  id: 218,
  name: "FeetToMeters",
  comment: "218: Convert fFeet into a number of meters.\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fFeet")] as const,
  kotor(this: NWScriptInstance, fFeet) {
    return fFeet * 0.3048;
  },
});

export const YardsToMeters = defineAction({
  id: 219,
  name: "YardsToMeters",
  comment: "219: Convert fYards into a number of meters.\n",
  returnType: NWScriptDataType.FLOAT,
  params: [floatParam("fYards")] as const,
  kotor(this: NWScriptInstance, fYards) {
    return fYards * 0.9144;
  },
});

export const IntToHexString = defineAction({
  id: 396,
  name: "IntToHexString",
  comment: "396: Convert nInteger to hex, returning the hex value as a string.\n* Return value has the format '0x????????' where each ? will be a hex digit\n(8 digits in total).\n",
  returnType: NWScriptDataType.STRING,
  params: [intParam("nInteger")] as const,
  kotor(this: NWScriptInstance, nInteger) {
    let number = Number(nInteger ? nInteger : 0);

    if (number < 0) {
      number = 0xFFFFFFFF + number + 1;
    }

    return number.toString(16).padStart(8, "0").toLocaleUpperCase();
  },
});

export const mathStringActions = [
  GetStringLength,
  GetStringUpperCase,
  GetStringLowerCase,
  GetStringRight,
  GetStringLeft,
  InsertString,
  GetSubString,
  FindSubString,
  fabs,
  cos,
  sin,
  tan,
  acos,
  asin,
  atan,
  log,
  pow,
  sqrt,
  abs,
  VectorNormalize,
  Vector,
  FeetToMeters,
  YardsToMeters,
  IntToHexString,
] as const;
