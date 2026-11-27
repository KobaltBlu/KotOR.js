import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";
import type { EngineVariant } from "@/nwscript/builtins/actionBuilder";
import { kotorRoutineMetadata, tslRoutineMetadata } from "@/nwscript/routineMetadata";

const warned = new Set<string>();
const fallbackImplementations = new WeakSet<Function>();

/** Diagnostic placeholders are explicitly distinguishable from implementations. */
export function isEngineRoutineFallback(action: INWScriptDefAction): boolean {
  return !!action?.action && fallbackImplementations.has(action.action);
}

function emptyReturn(type: NWScriptDataType): any {
  switch (type) {
    case NWScriptDataType.INTEGER:
    case NWScriptDataType.FLOAT:
      return 0;
    case NWScriptDataType.STRING:
      return "";
    case NWScriptDataType.VECTOR:
      return { x: 0, y: 0, z: 0 };
    default:
      return undefined;
  }
}

/**
 * Keep the original fail-soft diagnostic policy for genuinely missing routines.
 * This is not an implementation of those routines. Explicit builtin and preserved
 * upstream bodies are layered over these placeholders by reconciledActions.
 */
export function buildEngineRoutineFallbackActionMap(engine: EngineVariant): { [id: number]: INWScriptDefAction } {
  if (engine !== "kotor" && engine !== "tsl") {
    throw new Error(`Unsupported NWScript engine: ${engine}`);
  }
  const metadata = engine === "kotor" ? kotorRoutineMetadata : tslRoutineMetadata;
  const actions: { [id: number]: INWScriptDefAction } = {};
  for (const [id, name, type, args] of metadata) {
    if (actions[id]) throw new Error(`Duplicate ${engine} routine metadata ID ${id}`);
    const implementation = function(rawArgs: any[]) {
      const key = `${engine}:${id}`;
      if (!warned.has(key)) {
        warned.add(key);
        console.warn(`[NWScript] Unimplemented ${engine} routine ${name} (#${id}); using diagnostic fallback.`, rawArgs);
      }
      return emptyReturn(type);
    };
    fallbackImplementations.add(implementation);
    actions[id] = { comment: `${id}: ${name} (diagnostic placeholder until implemented)`, name, type, args: [...args], action: implementation };
  }
  return actions;
}
