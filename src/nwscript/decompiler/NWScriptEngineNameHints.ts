/**
 * Engine ACTION name hints for decompiled identifier inference (DeNCS-style).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file NWScriptEngineNameHints.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type NWScriptEngineSeedRole = "Tag" | "Name" | "Template";

export interface NWScriptEngineNameHint {
  /** Index of a string argument that can seed a PascalCase stem, when present. */
  seedArgIndex?: number;
  seedRole?: NWScriptEngineSeedRole;
  /** Replacement stem when the ACTION has no useful string (after hungarian prefix). */
  aliasStem?: string;
}

const ENGINE_NAME_HINTS: Map<string, NWScriptEngineNameHint> = new Map([
  ["GetObjectByTag", { seedArgIndex: 0, seedRole: "Tag" }],
  ["GetNearestObjectByTag", { seedArgIndex: 0, seedRole: "Tag" }],
  ["GetWaypointByTag", { seedArgIndex: 0, seedRole: "Tag" }],
  ["GetItemPossessedBy", { seedArgIndex: 1, seedRole: "Tag" }],
  ["CreateObject", { seedArgIndex: 1, seedRole: "Template" }],
  ["GetGlobalNumber", { seedArgIndex: 0, seedRole: "Name" }],
  ["GetGlobalBoolean", { seedArgIndex: 0, seedRole: "Name" }],
  ["GetGlobalString", { seedArgIndex: 0, seedRole: "Name" }],
  ["GetFirstPC", { aliasStem: "PC" }],
  ["GetPosition", { aliasStem: "Position" }],
  ["GetModule", { aliasStem: "Module" }],
]);

export function nwscriptEngineNameHint(actionName: string): NWScriptEngineNameHint | undefined {
  return ENGINE_NAME_HINTS.get(actionName);
}

/**
 * Stem taken from an engine routine name when no string seed is available.
 * Leading Get/Set is stripped unless an alias is registered.
 */
export function nwscriptEngineActionStem(actionName: string): string | undefined {
  const alias = ENGINE_NAME_HINTS.get(actionName)?.aliasStem;
  if (alias) return alias;
  if (!actionName || actionName.startsWith("__")) return undefined;
  if (/^sub\d+$/.test(actionName)) return undefined;
  if (actionName === "Vector" || actionName === "main" || actionName === "StartingConditional") {
    return undefined;
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(actionName)) return undefined;
  let rest = actionName;
  if (/^Get[A-Z_]/.test(rest) && rest.length > 3) rest = rest.slice(3);
  else if (/^Set[A-Z_]/.test(rest) && rest.length > 3) rest = rest.slice(3);
  return rest.length > 0 ? rest : undefined;
}
