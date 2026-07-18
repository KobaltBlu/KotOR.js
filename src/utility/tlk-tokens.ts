import { GameState } from "@/GameState";

/**
 * Read a talk-table string by id.
 */
export function tlkText(strRef: number): string {
  return GameState.TLKManager.GetStringById(strRef)?.getDisplayText?.()
    ?? GameState.TLKManager.GetStringById(strRef)?.Value
    ?? '';
}

/**
 * Substitute &lt;CUSTOM0&gt;… tokens like CTlkTable::SetCustomToken + Fetch.
 */
export function formatTlkWithCustoms(strRef: number, customs: string[]): string {
  let text = tlkText(strRef);
  for (let i = 0; i < customs.length; i++) {
    text = text.split(`<CUSTOM${i}>`).join(customs[i] ?? '');
  }
  return text;
}
