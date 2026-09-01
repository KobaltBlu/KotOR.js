import type { SWPortrait } from "@/engine/rules/SWPortrait";
import type { SWCreatureAppearance } from "@/engine/rules/SWCreatureAppearance";

/** Retail classSelection soundset (CHAR_TYPE). */
export const CHARGEN_SLOT_SOUNDSET: readonly number[] = [85, 85, 85, 83, 83, 83];

export interface CharGenPortraitEntry {
  portraitId: number;
  appearanceId: number;
}

/**
 * Retail GetPortraitsList — portraits.2da rows with
 * Sex match + ForPC == 1; appearance column by class:
 * Soldier(0)→Appearance_L, Scout(1)→AppearanceNumber, Scoundrel(2)→Appearance_S.
 */
export function buildCharGenPortraitList(
  portraits: readonly SWPortrait[],
  classId: number,
  gender: number,
): CharGenPortraitEntry[] {
  const list: CharGenPortraitEntry[] = [];
  if(!portraits?.length) return list;

  for(let i = 0; i < portraits.length; i++){
    const port = portraits[i];
    if(!port || port.forpc != 1) continue;
    if(port.sex != gender) continue;

    let appearanceId = -1;
    if(classId == 0){
      appearanceId = port.appearance_l | 0;
    }else if(classId == 1){
      appearanceId = port.appearancenumber | 0;
    }else if(classId == 2){
      appearanceId = port.appearance_s | 0;
    }else{
      appearanceId = port.appearancenumber | 0;
    }
    if(appearanceId < 0) continue;
    list.push({ portraitId: i, appearanceId });
  }
  return list;
}

/** Appearance_Head for save templates: appearance.2da NORMALHEAD. */
export function resolveCharGenAppearanceHead(
  appearances: readonly SWCreatureAppearance[] | undefined,
  appearanceId: number,
): number {
  const row = appearances?.[appearanceId | 0];
  const head = row?.normalhead;
  if(typeof head === 'number' && head >= 0) return head;
  return 0xff;
}

export function getCharGenSlotSoundSet(slot: number): number {
  const idx = slot | 0;
  if(idx >= 0 && idx < CHARGEN_SLOT_SOUNDSET.length){
    return CHARGEN_SLOT_SOUNDSET[idx];
  }
  return idx < 3 ? 85 : 83;
}
