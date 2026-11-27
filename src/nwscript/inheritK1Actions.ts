import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";

type ActionTable = { [key: number]: INWScriptDefAction };

/**
 * TSL reuses most of K1's routine table, so a routine TSL has not implemented
 * can borrow K1's implementation, but only where both tables give the id the
 * same name.
 *
 * The tables diverge at 768-771: id 770 is PlayMovieQueue in K1 and
 * EffectForceBody in TSL. Inheriting by id alone made the Force Body power
 * play the movie queue.
 *
 * @param k1 - K1 action table to borrow from
 * @param k2 - TSL action table, filled in place
 */
export function inheritK1Actions(k1: ActionTable, k2: ActionTable): void {
  for (const property in k1) {
    if (!Object.prototype.hasOwnProperty.call(k1, property)) continue;
    const k1Action = k1[property];
    const k2Action = k2[property];
    if (!k2Action || k2Action.action !== undefined) continue;
    if (k1Action.name !== k2Action.name) continue;
    k2Action.action = k1Action.action;
  }
}
