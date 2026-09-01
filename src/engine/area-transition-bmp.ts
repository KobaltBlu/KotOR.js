import { GameState } from "@/GameState";

/**
 * Retail SetAreaTransitionBMP +
 * SendServerToPlayerArea_ClientArea consumption.
 *
 * Pending id is one-shot for the next module/area load, then reset to -1.
 * -1 / unset → area LoadScreenID or `load_<module>`
 * 0 → random loadscreens.2da row (≥2)
 * 1 (USER_DEFINED) → retail ClientArea remaps to area LoadScreenID
 * >1 → loadscreens.2da row id
 */

let pendingBmpId = -1;
let pendingCustom = '';

export function setAreaTransitionBMP(predefined: number, customBmp: string = ''){
  const id = predefined | 0;
  if(id === 1){
    pendingCustom = (customBmp || '').trim();
  }
  pendingBmpId = id;
}

export function clearAreaTransitionBMP(){
  pendingBmpId = -1;
  pendingCustom = '';
}

export function peekAreaTransitionBMPId(): number {
  return pendingBmpId;
}

/**
 * Resolve load-screen texture resref for the next LoadModule call, then clear pending.
 * @param moduleName - destination module resref (used for `load_<name>` fallback)
 * @param destAreaLoadScreenId - destination area LoadScreenID when known (else 0)
 */
export function consumeAreaTransitionLoadBackground(
  moduleName: string,
  destAreaLoadScreenId: number = 0,
): string {
  let id = pendingBmpId;
  const custom = pendingCustom;
  clearAreaTransitionBMP();

  // Retail ClientArea: -1 or USER_DEFINED(1) → destination area load_screen_ID
  if(id === -1 || id === 1){
    if(destAreaLoadScreenId > 0){
      id = destAreaLoadScreenId;
    }else if(id === 1 && custom){
      return custom.toLowerCase();
    }else{
      return defaultModuleLoadBackground(moduleName);
    }
  }

  if(id === 0){
    id = pickRandomLoadscreenRowId();
  }

  const resref = loadscreensRowToResref(id);
  return resref || defaultModuleLoadBackground(moduleName);
}

function defaultModuleLoadBackground(moduleName: string): string {
  return 'load_' + (moduleName || '').toLowerCase();
}

function pickRandomLoadscreenRowId(): number {
  const table = GameState.TwoDAManager?.datatables?.get('loadscreens');
  const count = table?.RowCount ?? 0;
  if(count < 3) return 0;
  return 2 + Math.floor(Math.random() * (count - 2));
}

function loadscreensRowToResref(id: number): string | undefined {
  const table = GameState.TwoDAManager?.datatables?.get('loadscreens');
  if(!table) return undefined;

  const row =
    (typeof table.getByID === 'function' ? table.getByID(id) : undefined) ||
    table.rows?.[id];
  if(!row) return undefined;

  const raw =
    row.bmpresref ??
    row.BMPResRef ??
    row.loadscreen ??
    row.LoadScreen ??
    row.label ??
    row.Label;
  if(typeof raw !== 'string' || !raw.trim()) return undefined;
  return raw.trim().toLowerCase();
}
