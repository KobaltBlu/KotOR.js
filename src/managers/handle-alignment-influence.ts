import { GameEngineType } from "@/enums/engine";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { TwoDAManager } from "@/managers/TwoDAManager";

/** TSL companion tag → NPC_* slot (RebuildPartyTable order). */
export const TSL_NPC_TAG_TO_ID: Record<string, number> = {
  atton: 0,
  baodur: 1,
  mand: 2,
  g0t0: 3,
  handmaiden: 4,
  hk47: 5,
  kreia: 6,
  mira: 7,
  t3m4: 8,
  visasmarr: 9,
  hanharr: 10,
  disciple: 11,
};

/** Prestige feats used by retail HandleAlignmentInfluence (PC). */
const FEAT_PRESTIGE_A = 0x95;
const FEAT_PRESTIGE_B = 0xa7;
/** Class ids checked for prestige tier (retail 0xC / 0xF). */
const CLASS_PRESTIGE_A = 0x0c;
const CLASS_PRESTIGE_B = 0x0f;

function clampAlign(v: number): number {
  if(v < 0) return 0;
  if(v > 100) return 100;
  return v | 0;
}

function prestigeTierFromLevel(level: number): number {
  const lv = level | 0;
  if(lv <= 0) return 0;
  if(lv < 7) return 1;
  if(lv < 11) return 2;
  if(lv < 15) return 3;
  if(lv < 19) return 4;
  return 5;
}

/**
 * Retail PC prestige multiplier factor (local_2c = 1 + 0.2 * tier).
 */
function getPcPrestigeFactor(pc: ModuleCreature | undefined): { factor: number; bonus: number } {
  if(!pc){
    return { factor: 1.0, bonus: 0 };
  }
  // Retail local_41 = charisma * 3 (stats +0xf8)
  const cha = typeof pc.getCHA === 'function' ? (pc.getCHA() | 0) : (pc.cha | 0);
  const bonus = cha * 3;
  let tier = 0;
  const goodEvil = pc.getGoodEvil?.() ?? pc.goodEvil | 0;

  if(pc.getHasFeat?.(FEAT_PRESTIGE_A)){
    // Feat A path when goodEvil < 0x29
    if(goodEvil < 0x29){
      for(let i = 0; i < (pc.classes?.length || 0) && i < 2; i++){
        const cls = pc.classes[i];
        if((cls?.id | 0) === CLASS_PRESTIGE_B){
          tier = prestigeTierFromLevel(cls.level | 0);
          break;
        }
      }
    }
  }else if(pc.getHasFeat?.(FEAT_PRESTIGE_B)){
    // Feat B path when goodEvil > 0x3b
    if(goodEvil > 0x3b){
      for(let i = 0; i < (pc.classes?.length || 0) && i < 2; i++){
        const cls = pc.classes[i];
        if((cls?.id | 0) === CLASS_PRESTIGE_A){
          tier = prestigeTierFromLevel(cls.level | 0);
          break;
        }
      }
    }
  }

  return { factor: 1.0 + tier * 0.2, bonus };
}

function findInfluence2daRow(tag: string): { rowIndex: number; baseInfluence: number } | undefined {
  const table = TwoDAManager.datatables.get('influence');
  if(!table) return undefined;
  const want = (tag || '').toLowerCase();
  const row =
    table.getRowByColumnAndValue?.('tag', want) ||
    table.getRowByColumnAndValue?.('Tag', want);
  if(!row){
    // Case-insensitive scan
    const keys = Object.keys(table.rows || {});
    for(let i = 0; i < keys.length; i++){
      const r = table.rows[keys[i]];
      if(!r) continue;
      const rowTag = String(r.tag ?? r.Tag ?? '').toLowerCase();
      if(rowTag === want){
        const base = parseInt(String(r.baseinfluence ?? r.BaseInfluence ?? '50'), 10);
        return { rowIndex: i, baseInfluence: Number.isFinite(base) ? base : 50 };
      }
    }
    return undefined;
  }
  const base = parseInt(String(row.baseinfluence ?? row.BaseInfluence ?? '50'), 10);
  return { rowIndex: 0, baseInfluence: Number.isFinite(base) ? base : 50 };
}

export function resolveNpcIdFromCreature(creature: ModuleCreature): number {
  if(typeof creature.npcId === 'number' && creature.npcId >= 0){
    return creature.npcId | 0;
  }
  const tag = (creature.getTag?.() || creature.tag || '').toLowerCase();
  if(tag && TSL_NPC_TAG_TO_ID[tag] != null){
    return TSL_NPC_TAG_TO_ID[tag];
  }
  return -1;
}

/**
 * Retail CSWSCreature::HandleAlignmentInfluence.
 * Kreia: Influence.2da + PC align + prestige math → goodEvil.
 * Other CNPCs: goodEvil = baseGoodEvil.
 */
export function handleAlignmentInfluence(creature: ModuleCreature | undefined): void {
  if(!creature || GameState.GameKey !== GameEngineType.TSL){
    return;
  }

  const tag = (creature.getTag?.() || creature.tag || '').toLowerCase();
  if(tag !== 'kreia'){
    const base = typeof creature.baseGoodEvil === 'number'
      ? creature.baseGoodEvil
      : (creature.goodEvil | 0);
    creature.setGoodEvilQuiet(clampAlign(base));
    return;
  }

  const row = findInfluence2daRow(tag);
  if(!row){
    return;
  }

  let npcId = resolveNpcIdFromCreature(creature);
  if(npcId < 0){
    npcId = TSL_NPC_TAG_TO_ID.kreia;
  }

  let influence = GameState.PartyManager.getInfluence(npcId);
  if(influence === -1){
    influence = clampAlign(row.baseInfluence);
    // Seed without recursive status/align side effects
    GameState.PartyManager.InfluenceMap.set(npcId, influence);
  }

  const pcAlign = GameState.GlobalVariableManager?.GetGlobalNumber?.('G_PC_Align_Val') ?? 50;
  const pc =
    GameState.PartyManager.Player ||
    GameState.getCurrentPlayer?.() ||
    GameState.PartyManager.party?.[0];
  const { factor, bonus } = getPcPrestigeFactor(pc);

  const baseNpc = typeof creature.baseGoodEvil === 'number'
    ? creature.baseGoodEvil
    : (creature.goodEvil | 0);

  let combined = (influence | 0) + (bonus | 0);
  if(combined > 100) combined = 100;
  if(combined < 0) combined = 0;

  const inflNorm = ((combined - 50) * factor) / 50.0;
  const pcNorm = ((pcAlign | 0) - 50) / 50.0;
  const product = pcNorm * inflNorm;

  let next: number;
  if(product >= 0){
    next = baseNpc + (100 - baseNpc) * product;
  }else{
    next = (product + 1.0) * baseNpc;
  }

  creature.setGoodEvilQuiet(clampAlign(Math.round(next)));
}

/**
 * When the PC's alignment changes, refresh all companion alignment-from-influence.
 */
export function fanoutAlignmentInfluenceFromPC(): void {
  if(GameState.GameKey !== GameEngineType.TSL){
    return;
  }
  const max = GameState.PartyManager.MaxPartyCount || 12;
  for(let i = 0; i < max; i++){
    const cre =
      GameState.PartyManager.GetPartyMemberByNPCId?.(i) ||
      GameState.PartyManager.NPCS?.[i]?.moduleObject;
    if(cre){
      handleAlignmentInfluence(cre);
    }
  }
}
