/**
 * Field mappings and search configuration for reference finding.
 * Ported from Holocron Toolset's reference_search_config.py
 *
 * Defines which GFF fields should be searched for different types of references,
 * based on the KotOR findrefs utility functionality.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * @file ReferenceSearchConfig.ts
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GFFDataType } from "../../../enums/resource/GFFDataType";

// Field types to search for each reference type
export const SCRIPT_FIELD_TYPES = new Set<GFFDataType>([GFFDataType.RESREF]);
export const TAG_FIELD_TYPES = new Set<GFFDataType>([GFFDataType.CEXOSTRING]);
export const TEMPLATE_RESREF_FIELD_TYPES = new Set<GFFDataType>([GFFDataType.RESREF]);
export const CONVERSATION_FIELD_TYPES = new Set<GFFDataType>([GFFDataType.RESREF]);
export const ITEMLIST_FIELD_TYPES = new Set<GFFDataType>([
  GFFDataType.CEXOSTRING,
  GFFDataType.RESREF,
]);

// Field mappings for script references (ResRef fields that contain script names)
export const SCRIPT_FIELDS: Record<string, Set<string>> = {
  IFO: new Set([
    "Mod_OnAcquireItem",
    "Mod_OnActivateItem",
    "Mod_OnClientLeave",
    "Mod_OnHeartbeat",
    "Mod_OnLoad",
    "Mod_OnStart",
    "Mod_OnPlrDeath",
    "Mod_OnPlrLvlUp",
    "Mod_OnPlrRest",
    "Mod_OnSpawnBtnDn",
    "Mod_OnUnAqreItem",
    "Mod_OnUsrDefined",
  ]),
  ARE: new Set([
    "OnEnter",
    "OnExit",
    "OnHeartbeat",
    "OnUserDefined",
  ]),
  UTC: new Set([
    "ScriptHeartbeat",
    "ScriptAttacked",
    "ScriptDamaged",
    "ScriptDeath",
    "ScriptDialogue",
    "ScriptDisturbed",
    "ScriptEndDialogu",
    "ScriptEndRound",
    "ScriptOnNotice",
    "ScriptRested",
    "ScriptSpawn",
    "ScriptSpellAt",
    "ScriptUserDefine",
  ]),
  UTD: new Set([
    "OnClick",
    "OnClosed",
    "OnDamaged",
    "OnDeath",
    "OnFailToOpen",
    "OnHeartbeat",
    "OnLock",
    "OnMeleeAttacked",
    "OnOpen",
    "OnSpellCastAt",
    "OnTrapTriggered",
    "OnUnlock",
    "OnUserDefined",
  ]),
  UTM: new Set([
    "OnOpenStore",
  ]),
  UTP: new Set([
    "OnClosed",
    "OnDamaged",
    "OnDeath",
    "OnDisarm",
    "OnEndDialogue",
    "OnHeartbeat",
    "OnInvDisturbed",
    "OnLock",
    "OnMeleeAttacked",
    "OnOpen",
    "OnSpellCastAt",
    "OnTrapTriggered",
    "OnUnlock",
    "OnUsed",
    "OnUserDefined",
  ]),
  UTT: new Set([
    "ScriptHeartbeat",
    "ScriptOnEnter",
    "ScriptOnExit",
    "ScriptUserDefine",
  ]),
  DLG: new Set([
    "StartingList",
    "EntryList",
    "ReplyList",
  ]),
};

// Field mappings for tag references (String fields)
export const TAG_FIELDS: Record<string, Set<string>> = {
  UTC: new Set(["Tag"]),
  UTD: new Set(["Tag"]),
  UTM: new Set(["Tag"]),
  UTP: new Set(["Tag"]),
  UTT: new Set(["Tag"]),
  UTI: new Set(["Tag"]),
};

// Field mappings for TemplateResRef references (ResRef fields)
export const TEMPLATE_RESREF_FIELDS: Record<string, Set<string>> = {
  UTC: new Set(["TemplateResRef"]),
  UTD: new Set(["TemplateResRef"]),
  UTM: new Set(["TemplateResRef"]),
  UTP: new Set(["TemplateResRef"]),
  UTT: new Set(["TemplateResRef"]),
  UTI: new Set(["TemplateResRef"]),
};

// Field mappings for conversation references (ResRef fields)
export const CONVERSATION_FIELDS: Record<string, Set<string>> = {
  UTC: new Set(["Conversation"]),
  UTD: new Set(["Conversation"]),
  UTP: new Set(["Conversation"]),
  IFO: new Set(["Mod_OnStart"]),
};

// Field mappings for ItemList searches (for tag/resref searches in inventory)
export const ITEMLIST_FIELDS: Record<string, Set<string>> = {
  UTC: new Set(["ItemList", "Equip_ItemList"]),
  UTP: new Set(["ItemList"]),
  UTM: new Set(["ItemList"]),
};

// Nested field paths for DLG script searches
export const DLG_SCRIPT_PATHS: [string, string][] = [
  ["StartingList", "Active"],
  ["StartingList", "Active2"],
  ["StartingList", "ParamStrA"],
  ["StartingList", "ParamStrB"],
  ["EntryList", "Script"],
  ["EntryList", "Script2"],
  ["EntryList", "ActionParamStrA"],
  ["EntryList", "ActionParamStrB"],
  ["EntryList", "RepliesList"],
  ["ReplyList", "Script"],
  ["ReplyList", "Script2"],
  ["ReplyList", "ActionParamStrA"],
  ["ReplyList", "ActionParamStrB"],
  ["ReplyList", "EntriesList"],
];

// Nested field paths for DLG reply/entry condition searches
export const DLG_CONDITION_PATHS: [string, string][] = [
  ["EntryList", "RepliesList"],
  ["ReplyList", "EntriesList"],
];

export function getScriptFieldsForType(fileType: string): Set<string> {
  return SCRIPT_FIELDS[fileType] ?? new Set();
}

export function getTagFieldsForType(fileType: string): Set<string> {
  const fields = new Set(TAG_FIELDS[fileType] ?? []);
  if (["UTC", "UTP", "UTM"].includes(fileType)) {
    (ITEMLIST_FIELDS[fileType] ?? new Set()).forEach((f) => fields.add(f));
  }
  return fields;
}

export function getTemplateResrefFieldsForType(fileType: string): Set<string> {
  return TEMPLATE_RESREF_FIELDS[fileType] ?? new Set();
}

export function getConversationFieldsForType(fileType: string): Set<string> {
  return CONVERSATION_FIELDS[fileType] ?? new Set();
}

export function getItemListFieldsForType(fileType: string): Set<string> {
  return ITEMLIST_FIELDS[fileType] ?? new Set();
}

export function getAllSearchableFileTypes(): string[] {
  const all = new Set<string>();
  Object.keys(SCRIPT_FIELDS).forEach((k) => all.add(k));
  Object.keys(TAG_FIELDS).forEach((k) => all.add(k));
  Object.keys(TEMPLATE_RESREF_FIELDS).forEach((k) => all.add(k));
  Object.keys(CONVERSATION_FIELDS).forEach((k) => all.add(k));
  Object.keys(ITEMLIST_FIELDS).forEach((k) => all.add(k));
  all.add("NCS");
  return Array.from(all).sort();
}
