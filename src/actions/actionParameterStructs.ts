import { GFFStruct } from "@/resource/GFFStruct";
import type { ActionParameter } from "@/actions/ActionParameter";

/**
 * Serialises one entry of an action's `parameters` array for the save file.
 *
 * A loaded action legitimately carries holes. `ActionParameter.FromStruct`
 * returns `undefined` by design for a parameter struct it cannot read — it
 * documents that `getParameter` tolerates the gap — and `Action.setParameters`
 * writes that straight into the array, indexing up to the stored `NumParams`.
 *
 * The save side had no matching guard and called `.toStruct()` on every index,
 * so it threw on the very state the load side deliberately produces: a game
 * could be saved once and never again once it had been loaded.
 *
 * A hole becomes an **empty struct**, not a skipped entry. `setParameters` is
 * positional, so dropping one would shift every later parameter and silently
 * change what the action means. An empty struct carries no 'Type' field, so
 * `FromStruct` reads it back as the same absent parameter and `NumParams`
 * stays honest.
 */
export function actionParameterToStruct(parameter: ActionParameter | undefined | null): GFFStruct {
  if (!parameter || typeof parameter.toStruct !== 'function') return new GFFStruct(0);
  return parameter.toStruct();
}
