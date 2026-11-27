import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";
import { authoredActions, buildRuntimeActionMap, EngineVariant } from "@/nwscript/builtins";
import { upstreamKotorActions, upstreamTSLActions } from "@/nwscript/builtins/upstream";
import { buildEngineRoutineFallbackActionMap } from "@/nwscript/engineRoutineFallbacks";

/**
 * ABI metadata is independent of implementations: a refactor must never change
 * the number/types of VM operands consumed. Local variant definitions are checked
 * against the pinned upstream signatures before their implementations are used.
 * Preserved upstream bodies are explicit per-domain imports, not registration
 * side effects, and can never be overwritten by a metadata fallback.
 */
export function buildReconciledActionMap(engine: EngineVariant): { [id: number]: INWScriptDefAction } {
  const actions = buildEngineRoutineFallbackActionMap(engine);
  const local = buildRuntimeActionMap(authoredActions, engine);
  for (const [key, definition] of Object.entries(local)) {
    const id = Number(key);
    const abi = actions[id];
    if (!abi || abi.name !== definition.name || abi.type !== definition.type ||
        abi.args.length !== definition.args.length || abi.args.some((type, i) => type !== definition.args[i])) {
      throw new Error(`NWScript ${engine} ABI mismatch for ${definition.name} (#${id})`);
    }
    actions[id] = { ...abi, comment: definition.comment, action: definition.action ?? abi.action };
  }
  const preserved: { [id: number]: INWScriptDefAction } = engine === "kotor" ? upstreamKotorActions : upstreamTSLActions;
  for (const [key, definition] of Object.entries(preserved)) {
    const id = Number(key);
    if (actions[id]?.name !== definition.name || !definition.action) {
      throw new Error(`Invalid preserved ${engine} implementation ${definition.name} (#${id})`);
    }
    // K2 keeps its own argument signature even when inheriting the K1 body.
    actions[id] = { ...actions[id], comment: definition.comment, action: definition.action };
  }
  return actions;
}
