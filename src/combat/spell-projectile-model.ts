import type { ModuleItem } from "@/module/ModuleItem";
import type { TalentSpell } from "@/talents/TalentSpell";

/**
 * Resolve the MDL resref used for a spell projectile visual.
 * Retail projectile loads spells.2da projmodel; grenades fall back to the
 * thrown item's defaultModel when projmodel is empty.
 *
 * @file spell-projectile-model.ts
 */

function isEmptyResRef(value: unknown): boolean {
  const s = String(value ?? '').trim();
  return !s || s === '****';
}

/** Mirror ModuleItem.loadModel resref resolution without mutating the item. */
export function resolveItemModelResRef(item: ModuleItem | undefined): string {
  if(!item?.baseItem) return '';
  let itemclass = String(item.baseItem.itemClass || '').replace(/\0[\s\S]*$/g, '').trim().toLowerCase();
  let defaultModel = String(item.baseItem.defaultModel || '').replace(/\0[\s\S]*$/g, '').trim().toLowerCase();
  if(!defaultModel || defaultModel === 'i_null') return '';
  const nth = item.getModelVariation?.() ?? 1;
  const value = String(nth);
  defaultModel = defaultModel.substr(0, Math.max(0, defaultModel.length - value.length)) + value;
  if(!parseInt(defaultModel.substr(-3), 10)){
    defaultModel = itemclass + '_' + (('000' + nth).substr(-3));
  }
  return defaultModel;
}

/**
 * Prefer spells.2da projmodel; for item casts with empty projmodel use the item MDL.
 */
export function resolveSpellProjectileModelResRef(
  spell: Pick<TalentSpell, 'projmodel' | 'proj'> | undefined,
  item?: ModuleItem
): string {
  const fromSpell = String(spell?.projmodel ?? '').trim().toLowerCase();
  if(!isEmptyResRef(fromSpell)){
    return fromSpell;
  }
  return resolveItemModelResRef(item);
}

/**
 * Ordered unique resrefs to try when spawning a spell projectile mesh.
 * Snapshot at cast start so async load survives item destroy after DecrementUses.
 */
export function resolveSpellProjectileModelCandidates(
  spell: Pick<TalentSpell, 'projmodel' | 'proj'> | undefined,
  item?: ModuleItem
): string[] {
  // Retail client skips projectile when spells.2da proj == 0
  if(spell && typeof spell.proj === 'number' && (spell.proj | 0) === 0){
    return [];
  }
  const primary = resolveSpellProjectileModelResRef(spell, item);
  const itemOnly = resolveSpellProjectileModelResRef(undefined, item);
  return [primary, itemOnly].filter((r, i, a) => !!r && a.indexOf(r) === i);
}
