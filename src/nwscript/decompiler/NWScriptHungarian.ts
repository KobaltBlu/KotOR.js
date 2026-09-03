import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";

/**
 * BioWare / DeNCS hungarian prefixes and identifier sanitization for decompiled NSS names.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file NWScriptHungarian.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/** Language keywords and engine constants that must not become identifiers. */
const NSS_RESERVED = new Set([
  "switch",
  "case",
  "default",
  "if",
  "else",
  "while",
  "do",
  "for",
  "continue",
  "const",
  "void",
  "int",
  "string",
  "float",
  "vector",
  "struct",
  "action",
  "object",
  "object_id",
  "return",
  "break",
  "true",
  "false",
  "null",
  "effect",
  "event",
  "location",
  "talent",
  "object_self",
  "object_invalid",
  "main",
  "startingconditional",
]);

const PARAM_INTERNAL = /^(?:int|float|string|object|vector|effect|event|location|talent|struct)Param(\d+)$/;

export type NWScriptIdentifierKind = "local" | "global" | "param";

export function nwscriptHungarianPrefix(dataType: NWScriptDataType): string {
  switch (dataType) {
    case NWScriptDataType.INTEGER:
      return "n";
    case NWScriptDataType.FLOAT:
      return "f";
    case NWScriptDataType.STRING:
      return "s";
    case NWScriptDataType.OBJECT:
      return "o";
    case NWScriptDataType.VECTOR:
      return "v";
    case NWScriptDataType.LOCATION:
      return "l";
    case NWScriptDataType.EFFECT:
      return "e";
    case NWScriptDataType.EVENT:
      return "ev";
    case NWScriptDataType.TALENT:
      return "t";
    case NWScriptDataType.STRUCTURE:
      return "st";
    default:
      return "n";
  }
}

/** Split a tag/resref into PascalCase without the hungarian prefix. */
export function nwscriptTagToPascalStem(value: string): string | undefined {
  const parts = value
    .split(/[_\-\s]+/)
    .map(part => part.replace(/[^A-Za-z0-9]/g, ""))
    .filter(part => part.length > 0);
  if (parts.length === 0) return undefined;
  const stem = parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return stem.length > 0 ? stem : undefined;
}

export function nwscriptIsValidIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

export function nwscriptIsReservedIdentifier(name: string): boolean {
  return NSS_RESERVED.has(name.toLowerCase());
}

export function nwscriptSplitFieldAccess(name: string): { base: string; suffix: string } {
  const dot = name.indexOf(".");
  if (dot < 0) return { base: name, suffix: "" };
  return { base: name.slice(0, dot), suffix: name.slice(dot) };
}

export function nwscriptParseInternalVariableName(
  name: string
): { kind: NWScriptIdentifierKind; index: number } | undefined {
  const local = /^localVar_(\d+)$/.exec(name);
  if (local) return { kind: "local", index: Number(local[1]) + 1 };
  const global = /^globalVar_(\d+)$/.exec(name);
  if (global) return { kind: "global", index: Number(global[1]) + 1 };
  const param = PARAM_INTERNAL.exec(name);
  if (param) return { kind: "param", index: Number(param[1]) };
  return undefined;
}

export function nwscriptFallbackStem(kind: NWScriptIdentifierKind): string {
  switch (kind) {
    case "local":
      return "Local";
    case "global":
      return "Global";
    case "param":
      return "Param";
  }
}

/** First unused name; collisions append 2, 3, ... */
export function nwscriptUniqueIdentifier(desired: string, taken: Set<string>): string {
  const candidate = (suffix: string): string => `${desired}${suffix}`;
  if (
    nwscriptIsValidIdentifier(desired) &&
    !nwscriptIsReservedIdentifier(desired) &&
    !taken.has(desired)
  ) {
    return desired;
  }
  let ordinal = 2;
  while (
    !nwscriptIsValidIdentifier(candidate(String(ordinal))) ||
    nwscriptIsReservedIdentifier(candidate(String(ordinal))) ||
    taken.has(candidate(String(ordinal)))
  ) {
    ordinal += 1;
  }
  return candidate(String(ordinal));
}

export function nwscriptComposeHungarianName(
  dataType: NWScriptDataType,
  stem: string
): string | undefined {
  if (!stem) return undefined;
  const name = `${nwscriptHungarianPrefix(dataType)}${stem}`;
  if (!nwscriptIsValidIdentifier(name) || nwscriptIsReservedIdentifier(name)) {
    return undefined;
  }
  return name;
}
