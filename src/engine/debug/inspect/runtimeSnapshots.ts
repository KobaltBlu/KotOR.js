import { GameState } from "@engine/runtime/GameState";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { ModuleCreatureArmorSlot } from "@core/enums/module/ModuleCreatureArmorSlot";
import { ModuleDayPhase } from "@core/enums/module/ModuleDayPhase";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";
import { WeatherCondition } from "@core/enums/module/WeatherCondition";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { ModuleCalendar } from "@engine/module/ModuleCalendar";
import type { ModuleObject } from "@engine/module/ModuleObject";
import type { GFFField } from "@core/resource/GFFField";
import type { GFFStruct } from "@core/resource/GFFStruct";
import { BitWise } from "@core/utility/BitWise";
import { GlobalVariableManager } from "@engine/managers/GlobalVariableManager";

export type OverviewObjectKind =
  | 'party'
  | 'creature'
  | 'door'
  | 'placeable'
  | 'trigger'
  | 'waypoint'
  | 'sound'
  | 'store'
  | 'encounter'
  | 'item'
  | 'area'
  | 'module'
  | 'other';

export interface OverviewEntry {
  id: string;
  object: ModuleObject;
  kind: OverviewObjectKind;
  x: number;
  y: number;
  z: number;
  label: string;
  color: string;
  isPlayer: boolean;
  isParty: boolean;
}

export interface OverviewBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface GffTreeNode {
  key: string;
  label: string;
  typeName: string;
  valueText?: string;
  children?: GffTreeNode[];
}

export const OVERVIEW_KIND_COLORS: Record<OverviewObjectKind, string> = {
  party: '#4fc3f7',
  creature: '#e74c3c',
  door: '#e67e22',
  placeable: '#f1c40f',
  trigger: '#1abc9c',
  waypoint: '#2ecc71',
  sound: '#9b59b6',
  store: '#3498db',
  encounter: '#e91e63',
  item: '#95a5a6',
  area: '#26a69a',
  module: '#5c6bc0',
  other: '#7f8c8d',
};

/** Controlled PC — distinct from party companions. */
export const OVERVIEW_PC_COLOR = '#ffeb3b';
export const OVERVIEW_PARTY_RING = '#e1f5fe';

export const OVERVIEW_KIND_LABELS: Record<OverviewObjectKind, string> = {
  party: 'Party',
  creature: 'Creatures',
  door: 'Doors',
  placeable: 'Placeables',
  trigger: 'Triggers',
  waypoint: 'Waypoints',
  sound: 'Sounds',
  store: 'Stores',
  encounter: 'Encounters',
  item: 'Items',
  area: 'Areas',
  module: 'Module',
  other: 'Other',
};

export const DEFAULT_KIND_FILTERS: Record<OverviewObjectKind, boolean> = {
  party: true,
  creature: true,
  door: true,
  placeable: true,
  trigger: true,
  waypoint: true,
  sound: true,
  store: true,
  encounter: true,
  item: true,
  area: true,
  module: true,
  other: true,
};

function safeId(obj: ModuleObject, kind: OverviewObjectKind, index: number): string {
  const tag = (obj as any).getTag?.() || '';
  const id = (obj as any).id ?? (obj as any).uuid ?? index;
  return `${kind}:${tag}:${id}:${index}`;
}

function entryLabel(obj: ModuleObject): string {
  const name = (obj as any).getName?.();
  const tag = (obj as any).getTag?.() || '';
  if(typeof name === 'string' && name.trim()){ return name; }
  if(tag){ return tag; }
  return (obj as any).templateResRef || 'object';
}

function pushEntries(
  list: ModuleObject[] | undefined,
  kind: OverviewObjectKind,
  out: OverviewEntry[],
  partySet: Set<ModuleObject>
){
  if(!list){ return; }
  for(let i = 0; i < list.length; i++){
    const obj = list[i];
    if(!obj || !obj.position){ continue; }
    const isParty = partySet.has(obj);
    const resolvedKind = isParty ? 'party' : kind;
    out.push({
      id: safeId(obj, resolvedKind, out.length),
      object: obj,
      kind: resolvedKind,
      x: obj.position.x,
      y: obj.position.y,
      z: obj.position.z,
      label: entryLabel(obj),
      color: OVERVIEW_KIND_COLORS[resolvedKind],
      isPlayer: false,
      isParty,
    });
  }
}

export function collectOverviewEntries(): OverviewEntry[] {
  const area = GameState.module?.area;
  if(!area){ return []; }

  const party = GameState.PartyManager?.party || [];
  const partySet = new Set<ModuleObject>(party);
  const out: OverviewEntry[] = [];

  pushEntries(party, 'party', out, partySet);
  // Party members are often removed from area.creatures; skip any that remain.
  pushEntries(
    (area.creatures || []).filter((c) => !partySet.has(c)),
    'creature',
    out,
    partySet
  );
  pushEntries(area.doors, 'door', out, partySet);
  pushEntries(area.placeables, 'placeable', out, partySet);
  pushEntries(area.triggers, 'trigger', out, partySet);
  pushEntries(area.waypoints, 'waypoint', out, partySet);
  pushEntries(area.sounds, 'sound', out, partySet);
  pushEntries(area.stores, 'store', out, partySet);
  pushEntries(area.encounters, 'encounter', out, partySet);
  pushEntries(area.items, 'item', out, partySet);

  const player = GameState.PartyManager.getCurrentPlayer?.();
  if(player){
    for(const e of out){
      if(e.object === player){
        e.isPlayer = true;
        e.kind = 'party';
        e.color = OVERVIEW_PC_COLOR;
        e.label = e.label || 'Player';
      }
    }
  }

  return out;
}

/** JSON-safe pin for top-down Scene map / world markers (no ModuleObject refs). */
export interface SceneMapPin {
  id: string;
  kind: OverviewObjectKind;
  x: number;
  y: number;
  z: number;
  label: string;
  color: string;
  isPlayer: boolean;
  isParty: boolean;
}

export function overviewEntryToMapPin(entry: OverviewEntry): SceneMapPin {
  return {
    id: entry.id,
    kind: entry.kind,
    x: entry.x,
    y: entry.y,
    z: entry.z,
    label: entry.label,
    color: entry.color,
    isPlayer: entry.isPlayer,
    isParty: entry.isParty,
  };
}

export function computeOverviewBounds(
  entries: Array<{ x: number; y: number }>,
  pad: number = 4
): OverviewBounds {
  if(!entries.length){
    return { minX: -10, minY: -10, maxX: 10, maxY: 10, width: 20, height: 20 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for(const e of entries){
    if(e.x < minX) minX = e.x;
    if(e.y < minY) minY = e.y;
    if(e.x > maxX) maxX = e.x;
    if(e.y > maxY) maxY = e.y;
  }
  if(!Number.isFinite(minX)){
    return { minX: -10, minY: -10, maxX: 10, maxY: 10, width: 20, height: 20 };
  }
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  return { minX, minY, maxX, maxY, width, height };
}

const GFF_TYPE_NAMES: Record<number, string> = {
  [GFFDataType.BYTE]: 'BYTE',
  [GFFDataType.CHAR]: 'CHAR',
  [GFFDataType.WORD]: 'WORD',
  [GFFDataType.SHORT]: 'SHORT',
  [GFFDataType.DWORD]: 'DWORD',
  [GFFDataType.INT]: 'INT',
  [GFFDataType.DWORD64]: 'DWORD64',
  [GFFDataType.INT64]: 'INT64',
  [GFFDataType.FLOAT]: 'FLOAT',
  [GFFDataType.DOUBLE]: 'DOUBLE',
  [GFFDataType.CEXOSTRING]: 'CEXOSTRING',
  [GFFDataType.RESREF]: 'RESREF',
  [GFFDataType.CEXOLOCSTRING]: 'CEXOLOCSTRING',
  [GFFDataType.VOID]: 'VOID',
  [GFFDataType.STRUCT]: 'STRUCT',
  [GFFDataType.LIST]: 'LIST',
  [GFFDataType.ORIENTATION]: 'ORIENTATION',
  [GFFDataType.VECTOR]: 'VECTOR',
  [GFFDataType.STRREF]: 'STRREF',
};

function formatFieldValue(field: GFFField): string {
  try{
    const t = field.getType();
    if(t === GFFDataType.LIST || t === GFFDataType.STRUCT){
      const kids = field.getChildStructs?.() || [];
      return `${kids.length} struct(s)`;
    }
    if(t === GFFDataType.VECTOR){
      const v = field.getValue();
      if(v && typeof v === 'object' && 'x' in v){
        return `(${Number(v.x).toFixed(2)}, ${Number(v.y).toFixed(2)}, ${Number(v.z).toFixed(2)})`;
      }
    }
    if(t === GFFDataType.VOID){
      return '[void]';
    }
    const val = field.getValue();
    if(val == null){ return ''; }
    if(typeof val === 'object'){
      try{ return JSON.stringify(val); }catch{ return String(val); }
    }
    return String(val);
  }catch{
    return '?';
  }
}

function flattenStruct(struct: GFFStruct, path: string, depth: number, maxDepth: number): GffTreeNode[] {
  if(depth > maxDepth){ return []; }
  const fields = struct.getFields?.() || [];
  const nodes: GffTreeNode[] = [];
  for(let i = 0; i < fields.length; i++){
    const field = fields[i] as GFFField;
    const label = field.getLabel?.() || `field_${i}`;
    const type = field.getType();
    const typeName = GFF_TYPE_NAMES[type] || String(type);
    const key = `${path}.${label}[${i}]`;
    if(type === GFFDataType.LIST || type === GFFDataType.STRUCT){
      const children: GffTreeNode[] = [];
      const structs = field.getChildStructs?.() || [];
      for(let s = 0; s < structs.length; s++){
        children.push({
          key: `${key}.struct${s}`,
          label: `Struct ${s}`,
          typeName: 'STRUCT',
          children: flattenStruct(structs[s], `${key}.s${s}`, depth + 1, maxDepth),
        });
      }
      nodes.push({ key, label, typeName, valueText: formatFieldValue(field), children });
    }else{
      nodes.push({ key, label, typeName, valueText: formatFieldValue(field) });
    }
  }
  return nodes;
}

export function flattenGffTemplate(obj: ModuleObject, maxDepth: number = 4): GffTreeNode[] {
  const template = (obj as any).template;
  if(!template?.RootNode){ return []; }
  return flattenStruct(template.RootNode, 'root', 0, maxDepth);
}

/** Flatten a GFF root (e.g. from obj.save). */
export function flattenGffFromRoot(root: GFFStruct | undefined | null, maxDepth: number = 4): GffTreeNode[] {
  if(!root){ return []; }
  return flattenStruct(root, 'root', 0, maxDepth);
}

/**
 * Call obj.save once and flatten the returned GFF.
 * Side effect: most ModuleObject.save implementations also assign this.template.
 */
export function dumpLiveGff(obj: ModuleObject, maxDepth: number = 4): GffTreeNode[] {
  const save = (obj as any).save;
  if(typeof save !== 'function'){ return []; }
  try{
    const gff = save.call(obj);
    return flattenGffFromRoot(gff?.RootNode, maxDepth);
  }catch{
    return [];
  }
}

export function getObjectKind(obj: ModuleObject): OverviewObjectKind {
  const ot = obj.objectType;
  if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleCreature) || BitWise.InstanceOf(ot, ModuleObjectType.ModulePlayer)){
    const party = GameState.PartyManager?.party || [];
    if(party.includes(obj as any)){ return 'party'; }
    return 'creature';
  }
  if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleDoor)) return 'door';
  if(BitWise.InstanceOf(ot, ModuleObjectType.ModulePlaceable)) return 'placeable';
  if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleTrigger)) return 'trigger';
  if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleWaypoint)) return 'waypoint';
  if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleSound)) return 'sound';
  if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleStore)) return 'store';
  if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleEncounter)) return 'encounter';
  if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleItem)) return 'item';
  if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleArea)) return 'area';
  return 'other';
}

export function kindTypeName(kind: OverviewObjectKind): string {
  return OVERVIEW_KIND_LABELS[kind] || kind;
}

export interface InspectorRow {
  label: string;
  value: string;
}

export interface InspectorSection {
  id: string;
  title: string;
  rows: InspectorRow[];
}

export interface LiveObjectSnapshot {
  type: string;
  kind: OverviewObjectKind;
  tag: string;
  name: string;
  templateResRef: string;
  objectId: number;
  x: number;
  y: number;
  z: number;
  facing: number;
  distanceToPlayer: number | null;
  sections: InspectorSection[];
}

/** Sections that should start expanded in the inspector. */
export const INSPECTOR_DEFAULT_OPEN: Record<string, boolean> = {
  identity: true,
  transform: true,
  faction: true,
  vitals: true,
  abilities: true,
  modes: true,
  door: true,
  placeable: true,
  trigger: true,
  waypoint: true,
  sound: true,
  store: true,
  encounter: true,
  item: true,
  scripts: false,
  effects: false,
  inventory: false,
};

function fmt(v: unknown): string {
  if(v == null){ return ''; }
  if(typeof v === 'boolean'){ return String(v); }
  if(typeof v === 'number'){
    if(!Number.isFinite(v)){ return ''; }
    return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(4)));
  }
  if(typeof v === 'object'){ return ''; }
  return String(v);
}

function pushRow(section: InspectorSection, label: string, value: unknown): void {
  if(value === undefined || value === null){ return; }
  const text = typeof value === 'string' ? value : fmt(value);
  if(text === ''){ return; }
  section.rows.push({ label, value: text });
}

function makeSection(id: string, title: string): InspectorSection {
  return { id, title, rows: [] };
}

const EFFECT_TYPE_NAMES: Record<number, string> = (() => {
  const out: Record<number, string> = {};
  for(const [name, val] of Object.entries(GameEffectType)){
    if(typeof val === 'number'){ out[val] = name; }
  }
  return out;
})();

function itemShortLabel(item: any): string {
  if(!item){ return ''; }
  const tag = item.getTag?.() || '';
  const name = item.getName?.() || item.getLocalizedName?.() || '';
  const stack = item.getStackSize?.() ?? item.stackSize;
  const base = (typeof name === 'string' && name.trim()) ? name : (tag || 'item');
  if(stack != null && stack > 1){ return `${base} ×${stack}`; }
  return tag ? `${base} [${tag}]` : base;
}

function collectScripts(obj: ModuleObject): InspectorSection {
  const section = makeSection('scripts', 'Scripts');
  const scripts = (obj as any).scripts;
  if(scripts && typeof scripts === 'object'){
    const keys = Object.keys(scripts).sort();
    for(const key of keys){
      const inst = scripts[key];
      if(!inst){ continue; }
      const resref = inst.name || inst.resref || '';
      if(!resref){ continue; }
      pushRow(section, key, resref);
    }
  }
  const onOpenStore = (obj as any).onOpenStore;
  if(onOpenStore){
    const name = typeof onOpenStore === 'string'
      ? onOpenStore
      : (onOpenStore.name || '');
    pushRow(section, 'OnOpenStore', name);
  }
  if(!section.rows.length){
    pushRow(section, 'Scripts', 'None');
  }
  return section;
}

function collectEffects(obj: ModuleObject): InspectorSection {
  const section = makeSection('effects', 'Effects');
  const effects = (obj as any).effects || [];
  if(!effects.length){
    pushRow(section, 'Effects', 'None');
    return section;
  }
  const max = 40;
  for(let i = 0; i < Math.min(effects.length, max); i++){
    const e = effects[i];
    if(!e){ continue; }
    const typeName = EFFECT_TYPE_NAMES[e.type] || `Type ${e.type}`;
    const dur = e.getDuration?.() ?? e.duration;
    const creator = e.getCreator?.() ?? e.creator;
    const creatorTag = creator?.getTag?.() || (typeof creator === 'object' && creator?.id != null ? `id:${creator.id}` : '');
    const parts = [typeName];
    if(dur != null && dur > 0){ parts.push(`dur ${Number(dur).toFixed(2)}`); }
    if(creatorTag){ parts.push(`by ${creatorTag}`); }
    pushRow(section, `#${i}`, parts.join(' · '));
  }
  if(effects.length > max){
    pushRow(section, '…', `+${effects.length - max} more`);
  }
  return section;
}

function collectInventory(obj: ModuleObject): InspectorSection | null {
  const isCreature = BitWise.InstanceOf(obj.objectType, ModuleObjectType.ModuleCreature)
    || BitWise.InstanceOf(obj.objectType, ModuleObjectType.ModulePlayer);
  const isPlaceable = BitWise.InstanceOf(obj.objectType, ModuleObjectType.ModulePlaceable);
  const isStore = BitWise.InstanceOf(obj.objectType, ModuleObjectType.ModuleStore);
  if(!isCreature && !isPlaceable && !isStore){ return null; }

  const section = makeSection('inventory', 'Inventory');
  if(isCreature){
    const c = obj as any;
    const slots: [string, number][] = [
      ['RHAND', ModuleCreatureArmorSlot.RIGHTHAND],
      ['LHAND', ModuleCreatureArmorSlot.LEFTHAND],
      ['ARMOR', ModuleCreatureArmorSlot.ARMOR],
    ];
    for(const [label, slot] of slots){
      const equipped = c.getItemInSlot?.(slot);
      pushRow(section, label, equipped ? itemShortLabel(equipped) : '—');
    }
  }

  let list: any[] = [];
  try{
    const inv = (obj as any).getInventory?.() ?? (obj as any).inventory;
    list = Array.isArray(inv) ? inv : [];
  }catch{
    list = [];
  }
  pushRow(section, 'Count', String(list.length));
  const max = 25;
  for(let i = 0; i < Math.min(list.length, max); i++){
    pushRow(section, `[${i}]`, itemShortLabel(list[i]));
  }
  if(list.length > max){
    pushRow(section, '…', `+${list.length - max} more`);
  }
  return section;
}

function collectCreatureSections(obj: ModuleObject): InspectorSection[] {
  const c = obj as any;
  const vitals = makeSection('vitals', 'Vitals');
  pushRow(vitals, 'HP', `${c.getHP?.() ?? '?'}/${c.getMaxHP?.() ?? '?'}`);
  pushRow(vitals, 'FP', `${c.getFP?.() ?? '?'}/${c.getMaxFP?.() ?? '?'}`);
  pushRow(vitals, 'Dead', c.isDead?.());
  pushRow(vitals, 'Injured', c.isInjured?.());
  pushRow(vitals, 'Debilitated', c.isDebilitated?.());
  pushRow(vitals, 'Gold', c.getGold?.() ?? c.gold);
  pushRow(vitals, 'GoodEvil', c.getGoodEvil?.() ?? c.goodEvil);
  pushRow(vitals, 'XP', c.getXP?.() ?? c.xp);
  pushRow(vitals, 'CR', c.challengeRating);
  const classes = (c.classes || []).map((cl: any) => `${cl.label || cl.constant || cl.id} L${cl.level}`).join(', ');
  pushRow(vitals, 'Classes', classes);

  const abilities = makeSection('abilities', 'Abilities');
  pushRow(abilities, 'STR', c.getSTR?.());
  pushRow(abilities, 'DEX', c.getDEX?.());
  pushRow(abilities, 'CON', c.getCON?.());
  pushRow(abilities, 'INT', c.getINT?.());
  pushRow(abilities, 'WIS', c.getWIS?.());
  pushRow(abilities, 'CHA', c.getCHA?.());
  pushRow(abilities, 'AC', c.getAC?.());
  pushRow(abilities, 'Appearance', c.appearance);
  pushRow(abilities, 'Portrait', c.getPortraitId?.());
  pushRow(abilities, 'Gender', c.getGender?.());
  pushRow(abilities, 'Race', c.getRace?.());
  pushRow(abilities, 'SubRace', c.getSubRace?.());

  const modes = makeSection('modes', 'Modes');
  pushRow(modes, 'Combat', !!c.combatData?.combatState);
  pushRow(modes, 'CombatMode', c.combatMode);
  pushRow(modes, 'Stealth', c.stealthMode);
  pushRow(modes, 'Detect', c.detectMode);
  pushRow(modes, 'Perception', (c.perceptionList || []).length);
  pushRow(modes, 'Commandable', c.commandable);
  pushRow(modes, 'Min1HP', c.min1HP);

  return [vitals, abilities, modes];
}

function collectDoorSection(obj: ModuleObject): InspectorSection {
  const d = obj as any;
  const section = makeSection('door', 'Door');
  pushRow(section, 'Open', d.isOpen?.());
  pushRow(section, 'Locked', d.isLocked?.());
  pushRow(section, 'Lockable', d.lockable);
  pushRow(section, 'Useable', d.isUseable?.());
  pushRow(section, 'Static', d.isStatic?.() ?? d.static);
  if(d.getHP && d.getMaxHP){
    pushRow(section, 'HP', `${d.getHP()}/${d.getMaxHP()}`);
  }
  pushRow(section, 'Hardness', d.hardness);
  pushRow(section, 'Plot', d.plot);
  pushRow(section, 'Min1HP', d.min1HP);
  pushRow(section, 'OpenLockDC', d.openLockDC);
  pushRow(section, 'KeyRequired', d.keyRequired);
  pushRow(section, 'KeyName', d.keyName);
  pushRow(section, 'LinkedToModule', d.getLinkedToModule?.() ?? d.linkedToModule);
  pushRow(section, 'LinkedTo', d.getLinkedTo?.() ?? d.linkedTo);
  pushRow(section, 'TransitionDestin', d.getTransitionDestin?.());
  pushRow(section, 'Type', d.type);
  pushRow(section, 'Appearance', d.appearance ?? d.getGenericType?.());
  pushRow(section, 'Trap', d.trapFlag);
  pushRow(section, 'TrapType', d.trapType);
  pushRow(section, 'TrapDetected', d.trapDetected);
  return section;
}

function collectPlaceableSection(obj: ModuleObject): InspectorSection {
  const p = obj as any;
  const section = makeSection('placeable', 'Placeable');
  pushRow(section, 'Open', p.isOpen?.());
  pushRow(section, 'Locked', p.isLocked?.());
  pushRow(section, 'Lockable', p.lockable);
  pushRow(section, 'Useable', p.isUseable?.());
  pushRow(section, 'Static', p.isStatic?.() ?? p.static);
  if(p.getHP && p.getMaxHP){
    pushRow(section, 'HP', `${p.getHP()}/${p.getMaxHP()}`);
  }
  pushRow(section, 'Hardness', p.hardness);
  pushRow(section, 'Plot', p.plot);
  pushRow(section, 'Min1HP', p.min1HP);
  pushRow(section, 'OpenLockDC', p.openLockDC);
  pushRow(section, 'KeyRequired', p.keyRequired);
  pushRow(section, 'KeyName', p.keyName);
  pushRow(section, 'HasInventory', p.hasInventory);
  pushRow(section, 'PartyInteract', p.partyInteract);
  pushRow(section, 'BodyBag', p.isBodyBag);
  pushRow(section, 'Corpse', p.isCorpse);
  pushRow(section, 'DieWhenEmpty', p.dieWhenEmpty);
  pushRow(section, 'Appearance', p.appearance ?? p.genericType);
  pushRow(section, 'Trap', p.trapFlag);
  pushRow(section, 'TrapType', p.trapType);
  pushRow(section, 'TrapDetected', p.trapDetected);
  return section;
}

function collectTriggerSection(obj: ModuleObject): InspectorSection {
  const t = obj as any;
  const section = makeSection('trigger', 'Trigger');
  pushRow(section, 'Type', t.getType?.() ?? t.type);
  pushRow(section, 'TrapDetected', t.trapDetected);
  pushRow(section, 'TrapTriggered', t.trapTriggered);
  pushRow(section, 'TrapResRef', t.trapResRef);
  pushRow(section, 'TrapType', t.trapType);
  pushRow(section, 'Triggered', t.triggered);
  pushRow(section, 'ObjectsInside', (t.objectsInside || []).length);
  pushRow(section, 'LinkedToModule', t.getLinkedToModule?.() ?? t.linkedToModule);
  pushRow(section, 'LinkedTo', t.getLinkedTo?.() ?? t.linkedTo);
  pushRow(section, 'TransitionDestin', t.getTransitionDestin?.());
  pushRow(section, 'KeyName', t.keyName);
  const verts = t.vertices || t.getGeometry?.();
  pushRow(section, 'Vertices', Array.isArray(verts) ? verts.length : undefined);
  pushRow(section, 'Useable', t.isUseable?.());
  pushRow(section, 'SetByParty', t.setByPlayerParty);
  return section;
}

function collectWaypointSection(obj: ModuleObject): InspectorSection {
  const w = obj as any;
  const section = makeSection('waypoint', 'Waypoint');
  pushRow(section, 'HasMapNote', w.hasMapNote);
  pushRow(section, 'MapNoteEnabled', w.mapNoteEnabled);
  pushRow(section, 'MapNote', w.mapNote);
  pushRow(section, 'XOrientation', w.getXOrientation?.());
  pushRow(section, 'YOrientation', w.getYOrientation?.());
  pushRow(section, 'ZOrientation', w.getZOrientation?.());
  pushRow(section, 'Commandable', w.commandable);
  return section;
}

function collectSoundSection(obj: ModuleObject): InspectorSection {
  const s = obj as any;
  const section = makeSection('sound', 'Sound');
  pushRow(section, 'Active', s.active);
  pushRow(section, 'Looping', s.looping);
  pushRow(section, 'Continuous', s.continuous);
  pushRow(section, 'Positional', s.positional);
  pushRow(section, 'Volume', s.volume);
  pushRow(section, 'MinDistance', s.minDistance);
  pushRow(section, 'MaxDistance', s.maxDistance);
  pushRow(section, 'Interval', s.interval);
  pushRow(section, 'Random', s.random);
  pushRow(section, 'SoundType', s.soundType);
  const refs = s.soundResRefs || [];
  if(Array.isArray(refs) && refs.length){
    const joined = refs.map((r: any) => String(r)).filter(Boolean).join(', ');
    pushRow(section, 'ResRefs', joined.length > 120 ? `${joined.slice(0, 117)}…` : joined);
  }
  return section;
}

function collectStoreSection(obj: ModuleObject): InspectorSection {
  const s = obj as any;
  const section = makeSection('store', 'Store');
  const inv = s.getInventory?.() || s.inventory || [];
  pushRow(section, 'Inventory', Array.isArray(inv) ? inv.length : 0);
  pushRow(section, 'MarkUp', s.getMarkUp?.() ?? s.markUp);
  pushRow(section, 'MarkDown', s.getMarkDown?.() ?? s.markDown);
  pushRow(section, 'BuySellFlag', s.buySellFlag);
  const onOpen = s.onOpenStore;
  pushRow(section, 'OnOpenStore', typeof onOpen === 'string' ? onOpen : (onOpen?.name || ''));
  return section;
}

function collectEncounterSection(obj: ModuleObject): InspectorSection {
  const e = obj as any;
  const section = makeSection('encounter', 'Encounter');
  pushRow(section, 'Active', e.active);
  pushRow(section, 'Started', e.started);
  pushRow(section, 'Exhausted', e.exhausted);
  pushRow(section, 'Triggered', e.triggered);
  pushRow(section, 'Difficulty', e.difficulty ?? e.difficultyIndex);
  pushRow(section, 'MaxCreatures', e.maxCreatures);
  pushRow(section, 'RecCreatures', e.recCreatures);
  pushRow(section, 'NumberSpawned', e.numberSpawned);
  pushRow(section, 'Reset', e.reset);
  pushRow(section, 'ResetTime', e.resetTime);
  pushRow(section, 'PlayerOnly', e.playerOnly);
  pushRow(section, 'ObjectsInside', (e.objectsInside || []).length);
  pushRow(section, 'CreatureList', (e.creatureList || []).length);
  pushRow(section, 'SpawnPoints', (e.spawnPointList || []).length);
  return section;
}

function collectItemSection(obj: ModuleObject): InspectorSection {
  const it = obj as any;
  const section = makeSection('item', 'Item');
  pushRow(section, 'BaseItem', it.getBaseItemId?.() ?? it.baseItem);
  pushRow(section, 'Stack', it.getStackSize?.() ?? it.stackSize);
  pushRow(section, 'Charges', it.charges != null ? `${it.charges}/${it.maxCharges ?? '?'}` : undefined);
  pushRow(section, 'Cost', it.getGoldPieceValue?.() ?? it.cost);
  const possessor = it.getPossessor?.();
  pushRow(section, 'Possessor', possessor?.getTag?.() || (possessor?.id != null ? `id:${possessor.id}` : ''));
  pushRow(section, 'Dropable', it.isDropable?.());
  pushRow(section, 'Stolen', it.isStolen?.());
  pushRow(section, 'Identified', it.identified);
  pushRow(section, 'Infinite', it.isInfinite?.());
  return section;
}

export function snapshotLiveObject(obj: ModuleObject): LiveObjectSnapshot {
  const kind = getObjectKind(obj);
  const player = GameState.PartyManager.getCurrentPlayer?.();
  let distanceToPlayer: number | null = null;
  if(player?.position && obj.position){
    distanceToPlayer = player.position.distanceTo(obj.position);
  }

  const tag = (obj as any).getTag?.() || '';
  const nameRaw = (obj as any).getName?.();
  const name = typeof nameRaw === 'string' ? nameRaw : String(nameRaw ?? '');
  const templateResRef = String((obj as any).templateResRef || (obj as any).getTemplateResRef?.() || '');
  const objectId = Number((obj as any).id ?? 0);
  const facing = Number((obj as any).getFacing?.() ?? obj.facing ?? 0);
  const x = obj.position?.x ?? 0;
  const y = obj.position?.y ?? 0;
  const z = obj.position?.z ?? 0;

  const sections: InspectorSection[] = [];

  const identity = makeSection('identity', 'Identity');
  pushRow(identity, 'Tag', tag);
  pushRow(identity, 'Name', name);
  pushRow(identity, 'Type', kindTypeName(kind));
  pushRow(identity, 'Kind', kind);
  pushRow(identity, 'Template', templateResRef);
  pushRow(identity, 'ObjectId', objectId);
  const conversation = (obj as any).getConversation?.() ?? (obj as any).conversation;
  const convName = typeof conversation === 'string'
    ? conversation
    : (conversation?.resref || conversation?.name || '');
  pushRow(identity, 'Conversation', convName);
  if(BitWise.InstanceOf(obj.objectType, ModuleObjectType.ModuleCreature)
    || BitWise.InstanceOf(obj.objectType, ModuleObjectType.ModulePlayer)){
    pushRow(identity, 'PartyMember', (obj as any).isPartyMember?.());
    pushRow(identity, 'IsPC', (obj as any).getIsPC?.() ?? (obj as any).isPlayer);
  }
  sections.push(identity);

  const transform = makeSection('transform', 'Transform');
  pushRow(transform, 'X', x.toFixed(3));
  pushRow(transform, 'Y', y.toFixed(3));
  pushRow(transform, 'Z', z.toFixed(3));
  pushRow(transform, 'Facing', facing.toFixed(3));
  const room = (obj as any).getCurrentRoom?.();
  pushRow(transform, 'Room', room?.roomName || room?.getName?.() || '');
  pushRow(transform, 'Distance', distanceToPlayer == null ? undefined : `${distanceToPlayer.toFixed(2)} m`);
  sections.push(transform);

  const faction = makeSection('faction', 'Faction');
  const factionId = (obj as any).factionId;
  pushRow(faction, 'FactionId', factionId);
  pushRow(faction, 'Faction', (obj as any).faction?.label);
  if(faction.rows.length){ sections.push(faction); }

  const ot = obj.objectType;
  if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleCreature) || BitWise.InstanceOf(ot, ModuleObjectType.ModulePlayer)){
    sections.push(...collectCreatureSections(obj));
  }else if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleDoor)){
    sections.push(collectDoorSection(obj));
  }else if(BitWise.InstanceOf(ot, ModuleObjectType.ModulePlaceable)){
    sections.push(collectPlaceableSection(obj));
  }else if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleTrigger)){
    sections.push(collectTriggerSection(obj));
  }else if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleWaypoint)){
    sections.push(collectWaypointSection(obj));
  }else if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleSound)){
    sections.push(collectSoundSection(obj));
  }else if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleStore)){
    sections.push(collectStoreSection(obj));
  }else if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleEncounter)){
    sections.push(collectEncounterSection(obj));
  }else if(BitWise.InstanceOf(ot, ModuleObjectType.ModuleItem)){
    sections.push(collectItemSection(obj));
  }

  sections.push(collectScripts(obj));
  sections.push(collectEffects(obj));
  const invSection = collectInventory(obj);
  if(invSection){ sections.push(invSection); }

  return {
    type: kindTypeName(kind),
    kind,
    tag,
    name,
    templateResRef,
    objectId,
    x, y, z,
    facing,
    distanceToPlayer,
    sections,
  };
}

const DAY_PHASE_LABELS: Record<number, string> = {
  [ModuleDayPhase.Day]: 'Day',
  [ModuleDayPhase.Night]: 'Night',
  [ModuleDayPhase.Dawn]: 'Dawn',
  [ModuleDayPhase.Dusk]: 'Dusk',
};

const WEATHER_LABELS: Record<number, string> = {
  [WeatherCondition.CLEAR]: 'Clear',
  [WeatherCondition.RAIN]: 'Rain',
  [WeatherCondition.SNOW]: 'Snow',
};

function locStringValue(loc: any): string {
  if(!loc){ return ''; }
  if(typeof loc === 'string'){ return loc; }
  if(typeof loc.getValue === 'function'){
    try{ return String(loc.getValue() || ''); }catch{ return ''; }
  }
  return '';
}

function pad2(n: number): string {
  return (n | 0).toString().padStart(2, '0');
}

export interface ModuleAreaSnapshot {
  loaded: boolean;
  moduleFilename: string;
  moduleName: string;
  moduleTag: string;
  entryArea: string;
  areaResRef: string;
  areaName: string;
  areaTag: string;
  time: string;
  dayPhase: string;
  dawnHour: number;
  duskHour: number;
  calendar: string;
  weather: string;
  rooms: number;
  dayNightCycle: boolean;
  noRest: boolean;
  partyGold: number;
  partySize: number;
  objectCounts: {
    creatures: number;
    doors: number;
    placeables: number;
    triggers: number;
    waypoints: number;
    sounds: number;
    stores: number;
    encounters: number;
    items: number;
  };
}

export function snapshotModuleAreaInfo(): ModuleAreaSnapshot {
  const emptyCounts = {
    creatures: 0, doors: 0, placeables: 0, triggers: 0, waypoints: 0,
    sounds: 0, stores: 0, encounters: 0, items: 0,
  };
  const module = GameState.module;
  if(!module){
    return {
      loaded: false,
      moduleFilename: '',
      moduleName: '',
      moduleTag: '',
      entryArea: '',
      areaResRef: '',
      areaName: '',
      areaTag: '',
      time: '',
      dayPhase: '',
      dawnHour: 0,
      duskHour: 0,
      calendar: '',
      weather: '',
      rooms: 0,
      dayNightCycle: false,
      noRest: false,
      partyGold: GameState.PartyManager?.Gold ?? 0,
      partySize: (GameState.PartyManager?.party || []).length,
      objectCounts: emptyCounts,
    };
  }

  const area = module.area;
  const tm = module.timeManager;
  const hour = tm?.hour ?? 0;
  const minute = tm?.minute ?? 0;
  const phase = tm?.dayPhase;
  let calendarText = '';
  if(tm){
    calendarText = ModuleCalendar.formatPauseDayLabel(tm.pauseDay);
  }

  const weatherVal = area?.weather?.currentWeather;
  let weatherLabel = '';
  if(weatherVal != null && weatherVal !== 0xFF){
    weatherLabel = WEATHER_LABELS[weatherVal as number] || String(weatherVal);
  }else if(weatherVal === 0xFF){
    weatherLabel = 'Unset';
  }

  return {
    loaded: true,
    moduleFilename: String(module.filename || ''),
    moduleName: locStringValue(module.name),
    moduleTag: String(module.tag || ''),
    entryArea: String(module.entryArea || module.areaName || ''),
    areaResRef: String(area?.name || ''),
    areaName: locStringValue(area?.areaName),
    areaTag: String(area?.tag || ''),
    time: `${pad2(hour)}:${pad2(minute)}`,
    dayPhase: DAY_PHASE_LABELS[phase as number] || String(phase ?? ''),
    dawnHour: tm?.dawnHour ?? 0,
    duskHour: tm?.duskHour ?? 0,
    calendar: calendarText,
    weather: weatherLabel,
    rooms: area?.rooms?.length ?? 0,
    dayNightCycle: !!area?.dayNightCycle,
    noRest: !!area?.noRest,
    partyGold: GameState.PartyManager?.Gold ?? 0,
    partySize: (GameState.PartyManager?.party || []).length,
    objectCounts: {
      creatures: (area?.creatures || []).length,
      doors: (area?.doors || []).length,
      placeables: (area?.placeables || []).length,
      triggers: (area?.triggers || []).length,
      waypoints: (area?.waypoints || []).length,
      sounds: (area?.sounds || []).length,
      stores: (area?.stores || []).length,
      encounters: (area?.encounters || []).length,
      items: (area?.items || []).length,
    },
  };
}

/** JSON-safe object list entry for Dev Tools IPC (no live ModuleObject refs). */
export interface ObjectListEntry {
  id: number;
  mapId: string;
  kind: OverviewObjectKind;
  tag: string;
  templateResRef: string;
  label: string;
  x: number;
  y: number;
  z: number;
  isPlayer: boolean;
  isParty: boolean;
}

export interface SnapshotObjectListOptions {
  /** When set, only include this kind (e.g. "creature", "party"). */
  kind?: OverviewObjectKind | string;
}

export function objectListToMapPins(list: ObjectListEntry[]): SceneMapPin[] {
  return list.map((e) => ({
    id: e.mapId,
    kind: e.kind,
    x: e.x,
    y: e.y,
    z: e.z,
    label: e.label,
    color: e.isPlayer ? OVERVIEW_PC_COLOR : OVERVIEW_KIND_COLORS[e.kind],
    isPlayer: e.isPlayer,
    isParty: e.isParty,
  }));
}

export function snapshotObjectList(filters?: SnapshotObjectListOptions): ObjectListEntry[] {
  const kindFilter = filters?.kind ? String(filters.kind).toLowerCase() : '';
  const entries = collectOverviewEntries();
  const out: ObjectListEntry[] = [];
  for(const e of entries){
    if(kindFilter && e.kind !== kindFilter){ continue; }
    const obj = e.object as any;
    out.push({
      id: Number(obj?.id ?? 0),
      mapId: e.id,
      kind: e.kind,
      tag: String(obj?.getTag?.() || ''),
      templateResRef: String(obj?.templateResRef || obj?.getTemplateResRef?.() || ''),
      label: e.label,
      x: e.x,
      y: e.y,
      z: e.z,
      isPlayer: e.isPlayer,
      isParty: e.isParty,
    });
  }
  return out;
}

export type GlobalsSnapshotValue = boolean | number | string | {
  x: number;
  y: number;
  z: number;
  facing: number;
};

export interface GlobalsSnapshotEntry {
  name: string;
  type: 'Boolean' | 'Number' | 'String' | 'Location';
  value: GlobalsSnapshotValue;
}

/** Catalog-ordered globals as plain JSON-safe values. */
export function snapshotGlobals(): GlobalsSnapshotEntry[] {
  const out: GlobalsSnapshotEntry[] = [];
  for(const entry of GlobalVariableManager.Catalog){
    switch(entry.type){
      case 'Boolean':
        out.push({
          name: entry.name,
          type: 'Boolean',
          value: GlobalVariableManager.GetGlobalBoolean(entry.name),
        });
        break;
      case 'Number':
        out.push({
          name: entry.name,
          type: 'Number',
          value: GlobalVariableManager.GetGlobalNumber(entry.name),
        });
        break;
      case 'String':
        out.push({
          name: entry.name,
          type: 'String',
          value: GlobalVariableManager.GetGlobalString(entry.name),
        });
        break;
      case 'Location': {
        const loc = GlobalVariableManager.GetGlobalLocation(entry.name);
        out.push({
          name: entry.name,
          type: 'Location',
          value: {
            x: loc?.position?.x ?? 0,
            y: loc?.position?.y ?? 0,
            z: loc?.position?.z ?? 0,
            facing: loc?.facing ?? 0,
          },
        });
        break;
      }
    }
  }
  return out;
}
