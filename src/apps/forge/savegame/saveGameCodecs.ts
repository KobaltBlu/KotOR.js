/**
 * GameState-free GFF codecs for KotOR/TSL save-folder files.
 *
 * @file saveGameCodecs.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { BinaryReader } from "@/utility/binary/BinaryReader";

const WIN_EPOCH_MS = Date.parse("1601-01-01T00:00:00Z");

export type SaveFsKind = "game" | "project" | "disk";

export interface SaveNfoFields {
  areaname: string;
  lastModule: string;
  saveGameName: string;
  pcName: string;
  timePlayed: number;
  timestampMs: number | undefined;
  cheatUsed: boolean;
  portrait0: string;
  portrait1: string;
  portrait2: string;
  gameplayHint: number;
  storyHint: number;
}

export interface SaveGlobalNumber {
  name: string;
  value: number;
}

export interface SaveGlobalBoolean {
  name: string;
  value: boolean;
}

export interface SaveGlobalString {
  name: string;
  value: string;
}

export interface SaveGlobalLocation {
  name: string;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface SaveGlobals {
  numbers: SaveGlobalNumber[];
  booleans: SaveGlobalBoolean[];
  strings: SaveGlobalString[];
  locations: SaveGlobalLocation[];
}

export interface SavePartyMember {
  isLeader: boolean;
  memberId: number;
}

export interface SaveAvailNpc {
  available: boolean;
  canSelect: boolean;
  influence: number;
}

export interface SaveJournalEntry {
  plotId: string;
  state: number;
  date: number;
  time: number;
}

export interface SavePartyTable {
  gold: number;
  members: SavePartyMember[];
  availNpcs: SaveAvailNpc[];
  journal: SaveJournalEntry[];
  chemicalCount: number | undefined;
  componentCount: number | undefined;
}

export interface SaveErfKey {
  resRef: string;
  resType: number;
  ext: string;
  name: string;
}

export interface SaveLooseFile {
  fileName: string;
  relPath: string;
}

export interface SavePackedModule {
  resRef: string;
  name: string;
  resources: SaveErfKey[];
}

export interface SaveThumbnail {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

export interface SaveGameDocumentSnapshot {
  nfo: SaveNfoFields;
  globals: SaveGlobals;
  party: SavePartyTable;
}

export function emptyNfo(): SaveNfoFields {
  return {
    areaname: "",
    lastModule: "",
    saveGameName: "",
    pcName: "",
    timePlayed: 0,
    timestampMs: undefined,
    cheatUsed: false,
    portrait0: "",
    portrait1: "",
    portrait2: "",
    gameplayHint: 0,
    storyHint: 0,
  };
}

export function emptyGlobals(): SaveGlobals {
  return { numbers: [], booleans: [], strings: [], locations: [] };
}

export function emptyParty(): SavePartyTable {
  return {
    gold: 0,
    members: [],
    availNpcs: [],
    journal: [],
    chemicalCount: undefined,
    componentCount: undefined,
  };
}

export function cloneNfo(nfo: SaveNfoFields): SaveNfoFields {
  return { ...nfo };
}

export function cloneGlobals(globals: SaveGlobals): SaveGlobals {
  return {
    numbers: globals.numbers.map((row) => ({ ...row })),
    booleans: globals.booleans.map((row) => ({ ...row })),
    strings: globals.strings.map((row) => ({ ...row })),
    locations: globals.locations.map((row) => ({ ...row })),
  };
}

export function cloneParty(party: SavePartyTable): SavePartyTable {
  return {
    gold: party.gold,
    members: party.members.map((row) => ({ ...row })),
    availNpcs: party.availNpcs.map((row) => ({ ...row })),
    journal: party.journal.map((row) => ({ ...row })),
    chemicalCount: party.chemicalCount,
    componentCount: party.componentCount,
  };
}

function fieldValue(struct: GFFStruct, label: string): any {
  if (!struct.hasField(label)) {
    return undefined;
  }
  return struct.getFieldByLabel(label)?.getValue();
}

function fieldString(struct: GFFStruct, label: string): string {
  const value = fieldValue(struct, label);
  return value == null ? "" : String(value);
}

function fieldNumber(struct: GFFStruct, label: string, fallback = 0): number {
  const value = fieldValue(struct, label);
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function setOrCreate(struct: GFFStruct, type: GFFDataType, label: string, value: any): void {
  if (struct.hasField(label)) {
    struct.getFieldByLabel(label).setValue(value);
    return;
  }
  struct.addField(new GFFField(type, label)).setValue(value);
}

function listField(struct: GFFStruct, label: string): GFFField {
  if (struct.hasField(label)) {
    const existing = struct.getFieldByLabel(label);
    if (existing) {
      return existing;
    }
  }
  const field = new GFFField(GFFDataType.LIST, label);
  struct.addField(field);
  return field;
}

function replaceList(struct: GFFStruct, label: string, children: GFFStruct[]): void {
  const field = listField(struct, label);
  field.childStructs.length = 0;
  for (let i = 0; i < children.length; i++) {
    field.addChildStruct(children[i]);
  }
}

export function fileTimeToUnixMs(timestamp: bigint | number): number {
  const asBig = typeof timestamp === "bigint" ? timestamp : BigInt(Math.trunc(timestamp));
  return Number(asBig / 10000n) + WIN_EPOCH_MS;
}

export function unixMsToFileTime(ms: number): bigint {
  const delta = Math.max(0, Math.trunc(ms) - WIN_EPOCH_MS);
  return BigInt(delta) * 10000n;
}

function setDword64(field: GFFField, value: bigint): void {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, value, true);
  field.setData(buf);
  field.value = value;
}

function getDword64(field: GFFField): bigint | undefined {
  if (field.data instanceof Uint8Array && field.data.length >= 8) {
    return new DataView(field.data.buffer, field.data.byteOffset, 8).getBigUint64(0, true);
  }
  const value = field.value;
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  try {
    return field.getValue();
  } catch {
    return undefined;
  }
}

export function readNfoFields(gff: GFFObject): SaveNfoFields {
  const root = gff.RootNode;
  const fields = emptyNfo();
  fields.areaname = fieldString(root, "AREANAME");
  fields.lastModule = fieldString(root, "LASTMODULE");
  fields.saveGameName = fieldString(root, "SAVEGAMENAME");
  fields.pcName = fieldString(root, "PCNAME");
  fields.timePlayed = fieldNumber(root, "TIMEPLAYED");
  fields.cheatUsed = !!fieldNumber(root, "CHEATUSED");
  fields.portrait0 = fieldString(root, "PORTRAIT0");
  fields.portrait1 = fieldString(root, "PORTRAIT1");
  fields.portrait2 = fieldString(root, "PORTRAIT2");
  fields.gameplayHint = fieldNumber(root, "GAMEPLAYHINT");
  fields.storyHint = fieldNumber(root, "STORYHINT");
  if (root.hasField("TIMESTAMP")) {
    const raw = getDword64(root.getFieldByLabel("TIMESTAMP"));
    if (raw != null) {
      try {
        fields.timestampMs = fileTimeToUnixMs(raw);
      } catch {
        fields.timestampMs = undefined;
      }
    }
  }
  return fields;
}

export function applyNfoFields(gff: GFFObject, fields: SaveNfoFields): void {
  if (!gff.FileType || !gff.FileType.trim()) {
    gff.FileType = "NFO ";
  }
  const root = gff.RootNode;
  setOrCreate(root, GFFDataType.CEXOSTRING, "AREANAME", fields.areaname);
  setOrCreate(root, GFFDataType.CEXOSTRING, "LASTMODULE", fields.lastModule);
  setOrCreate(root, GFFDataType.CEXOSTRING, "SAVEGAMENAME", fields.saveGameName);
  setOrCreate(root, GFFDataType.CEXOSTRING, "PCNAME", fields.pcName);
  setOrCreate(root, GFFDataType.DWORD, "TIMEPLAYED", fields.timePlayed | 0);
  setOrCreate(root, GFFDataType.BYTE, "CHEATUSED", fields.cheatUsed ? 1 : 0);
  setOrCreate(root, GFFDataType.RESREF, "PORTRAIT0", fields.portrait0);
  setOrCreate(root, GFFDataType.RESREF, "PORTRAIT1", fields.portrait1);
  setOrCreate(root, GFFDataType.RESREF, "PORTRAIT2", fields.portrait2);
  setOrCreate(root, GFFDataType.BYTE, "GAMEPLAYHINT", fields.gameplayHint | 0);
  setOrCreate(root, GFFDataType.BYTE, "STORYHINT", fields.storyHint | 0);
  if (fields.timestampMs != null && Number.isFinite(fields.timestampMs)) {
    const fileTime = unixMsToFileTime(fields.timestampMs);
    if (root.hasField("TIMESTAMP")) {
      setDword64(root.getFieldByLabel("TIMESTAMP"), fileTime);
    } else {
      const field = new GFFField(GFFDataType.DWORD64, "TIMESTAMP");
      root.addField(field);
      setDword64(field, fileTime);
    }
  }
}

/** Retail CSWGlobalVariableTable::WriteTable: (count >> 3) + 1 */
export function valBooleanByteSize(booleanCount: number): number {
  return (booleanCount >> 3) + 1;
}

function readBitMsbFirst(bytes: Uint8Array, index: number): boolean {
  const byteIndex = Math.floor(index / 8);
  if (byteIndex < 0 || byteIndex >= bytes.length) {
    return false;
  }
  const j = index % 8;
  return !!((bytes[byteIndex] >> (7 - j)) & 1);
}

function writeBitMsbFirst(bytes: Uint8Array, index: number, value: boolean): void {
  if (!value) {
    return;
  }
  const byteIndex = Math.floor(index / 8);
  if (byteIndex < 0 || byteIndex >= bytes.length) {
    return;
  }
  const j = index % 8;
  bytes[byteIndex] |= 1 << (7 - j);
}

function catNames(gff: GFFObject, label: string): string[] {
  if (!gff.RootNode.hasField(label)) {
    return [];
  }
  const structs = gff.getFieldByLabel(label)?.getChildStructs() || [];
  const names: string[] = [];
  for (let i = 0; i < structs.length; i++) {
    names.push(fieldString(structs[i], "Name"));
  }
  return names;
}

export function parseGlobalVars(gff: GFFObject): SaveGlobals {
  const globals = emptyGlobals();
  const numberNames = catNames(gff, "CatNumber");
  if (gff.RootNode.hasField("ValNumber")) {
    const bytes = gff.RootNode.getFieldByLabel("ValNumber").getVoid() || new Uint8Array(0);
    const reader = new BinaryReader(bytes);
    for (let i = 0; i < numberNames.length; i++) {
      globals.numbers.push({
        name: numberNames[i],
        value: reader.position < bytes.length ? reader.readByte() : 0,
      });
    }
  } else {
    for (let i = 0; i < numberNames.length; i++) {
      globals.numbers.push({ name: numberNames[i], value: 0 });
    }
  }

  const boolNames = catNames(gff, "CatBoolean");
  const boolBytes = gff.RootNode.hasField("ValBoolean")
    ? (gff.RootNode.getFieldByLabel("ValBoolean").getVoid() || new Uint8Array(0))
    : new Uint8Array(0);
  for (let i = 0; i < boolNames.length; i++) {
    globals.booleans.push({
      name: boolNames[i],
      value: readBitMsbFirst(boolBytes, i),
    });
  }

  const stringNames = catNames(gff, "CatString");
  const stringValues = gff.RootNode.hasField("ValString")
    ? (gff.getFieldByLabel("ValString")?.getChildStructs() || [])
    : [];
  for (let i = 0; i < stringNames.length; i++) {
    globals.strings.push({
      name: stringNames[i],
      value: stringValues[i] ? fieldString(stringValues[i], "String") : "",
    });
  }

  const locNames = catNames(gff, "CatLocation");
  if (gff.RootNode.hasField("ValLocation")) {
    const locBytes = gff.RootNode.getFieldByLabel("ValLocation").getVoid() || new Uint8Array(0);
    const reader = new BinaryReader(locBytes);
    for (let i = 0; i < locNames.length; i++) {
      globals.locations.push({
        name: locNames[i],
        x: reader.position + 4 <= locBytes.length ? reader.readSingle() : 0,
        y: reader.position + 4 <= locBytes.length ? reader.readSingle() : 0,
        z: reader.position + 4 <= locBytes.length ? reader.readSingle() : 0,
        rx: reader.position + 4 <= locBytes.length ? reader.readSingle() : 0,
        ry: reader.position + 4 <= locBytes.length ? reader.readSingle() : 0,
        rz: reader.position + 4 <= locBytes.length ? reader.readSingle() : 0,
      });
    }
  } else {
    for (let i = 0; i < locNames.length; i++) {
      globals.locations.push({ name: locNames[i], x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    }
  }

  return globals;
}

function ensureCatList(gff: GFFObject, label: string, names: string[]): GFFField {
  const field = listField(gff.RootNode, label);
  field.childStructs.length = 0;
  for (let i = 0; i < names.length; i++) {
    const row = new GFFStruct();
    row.addField(new GFFField(GFFDataType.CEXOSTRING, "Name")).setValue(names[i]);
    field.addChildStruct(row);
  }
  return field;
}

function setVoid(gff: GFFObject, label: string, data: Uint8Array): void {
  if (gff.RootNode.hasField(label)) {
    gff.RootNode.getFieldByLabel(label).setData(data);
    return;
  }
  gff.RootNode.addField(new GFFField(GFFDataType.VOID, label)).setData(data);
}

export function encodeGlobalVars(gff: GFFObject, globals: SaveGlobals): void {
  if (!gff.FileType || !gff.FileType.trim()) {
    gff.FileType = "GVT ";
  }
  ensureCatList(gff, "CatNumber", globals.numbers.map((row) => row.name));
  ensureCatList(gff, "CatBoolean", globals.booleans.map((row) => row.name));
  ensureCatList(gff, "CatString", globals.strings.map((row) => row.name));
  ensureCatList(gff, "CatLocation", globals.locations.map((row) => row.name));

  const numberBuffer = new Uint8Array(globals.numbers.length);
  for (let i = 0; i < globals.numbers.length; i++) {
    numberBuffer[i] = globals.numbers[i].value & 0xff;
  }
  setVoid(gff, "ValNumber", numberBuffer);

  const boolBuffer = new Uint8Array(valBooleanByteSize(globals.booleans.length));
  for (let i = 0; i < globals.booleans.length; i++) {
    writeBitMsbFirst(boolBuffer, i, globals.booleans[i].value);
  }
  setVoid(gff, "ValBoolean", boolBuffer);

  const locCount = Math.max(globals.locations.length, 100);
  const locationBuffer = new Uint8Array(24 * locCount);
  const view = new DataView(locationBuffer.buffer);
  for (let i = 0; i < globals.locations.length; i++) {
    const loc = globals.locations[i];
    const base = 24 * i;
    view.setFloat32(base + 0, loc.x, true);
    view.setFloat32(base + 4, loc.y, true);
    view.setFloat32(base + 8, loc.z, true);
    view.setFloat32(base + 12, loc.rx, true);
    view.setFloat32(base + 16, loc.ry, true);
    view.setFloat32(base + 20, loc.rz, true);
  }
  setVoid(gff, "ValLocation", locationBuffer);

  const valString = listField(gff.RootNode, "ValString");
  valString.childStructs.length = 0;
  for (let i = 0; i < globals.strings.length; i++) {
    const row = new GFFStruct();
    row.addField(new GFFField(GFFDataType.CEXOSTRING, "String")).setValue(globals.strings[i].value);
    valString.addChildStruct(row);
  }
}

export function parsePartyTable(gff: GFFObject): SavePartyTable {
  const party = emptyParty();
  const root = gff.RootNode;
  party.gold = fieldNumber(root, "PT_GOLD");

  if (root.hasField("PT_MEMBERS")) {
    const members = gff.getFieldByLabel("PT_MEMBERS")?.getChildStructs() || [];
    for (let i = 0; i < members.length; i++) {
      party.members.push({
        isLeader: !!fieldNumber(members[i], "PT_IS_LEADER"),
        memberId: fieldNumber(members[i], "PT_MEMBER_ID", -1),
      });
    }
  }

  if (root.hasField("PT_AVAIL_NPCS")) {
    const avail = gff.getFieldByLabel("PT_AVAIL_NPCS")?.getChildStructs() || [];
    const influence = root.hasField("PT_INFLUENCE")
      ? (gff.getFieldByLabel("PT_INFLUENCE")?.getChildStructs() || [])
      : [];
    for (let i = 0; i < avail.length; i++) {
      party.availNpcs.push({
        available: !!fieldNumber(avail[i], "PT_NPC_AVAIL"),
        canSelect: !!fieldNumber(avail[i], "PT_NPC_SELECT"),
        influence: influence[i] ? fieldNumber(influence[i], "PT_NPC_INFLUENCE", -1) : -1,
      });
    }
  }

  if (root.hasField("JNL_Entries")) {
    const entries = gff.getFieldByLabel("JNL_Entries")?.getChildStructs() || [];
    for (let i = 0; i < entries.length; i++) {
      party.journal.push({
        plotId: fieldString(entries[i], "JNL_PlotID"),
        state: fieldNumber(entries[i], "JNL_State"),
        date: fieldNumber(entries[i], "JNL_Date"),
        time: fieldNumber(entries[i], "JNL_Time"),
      });
    }
  }

  if (root.hasField("PT_ITEM_CHEMICAL")) {
    party.chemicalCount = fieldNumber(root, "PT_ITEM_CHEMICAL");
  }
  if (root.hasField("PT_ITEM_COMPONEN")) {
    party.componentCount = fieldNumber(root, "PT_ITEM_COMPONEN");
  }

  return party;
}

export function applyPartyTable(gff: GFFObject, party: SavePartyTable): void {
  if (!gff.FileType || !gff.FileType.trim()) {
    gff.FileType = "PT  ";
  }
  const root = gff.RootNode;
  setOrCreate(root, GFFDataType.DWORD, "PT_GOLD", party.gold | 0);
  setOrCreate(root, GFFDataType.BYTE, "PT_NUM_MEMBERS", party.members.length);

  const memberStructs: GFFStruct[] = [];
  for (let i = 0; i < party.members.length; i++) {
    const row = new GFFStruct();
    row.addField(new GFFField(GFFDataType.BYTE, "PT_IS_LEADER")).setValue(party.members[i].isLeader ? 1 : 0);
    row.addField(new GFFField(GFFDataType.INT, "PT_MEMBER_ID")).setValue(party.members[i].memberId);
    memberStructs.push(row);
  }
  replaceList(root, "PT_MEMBERS", memberStructs);

  const availStructs: GFFStruct[] = [];
  const influenceStructs: GFFStruct[] = [];
  for (let i = 0; i < party.availNpcs.length; i++) {
    const npc = party.availNpcs[i];
    const avail = new GFFStruct();
    avail.addField(new GFFField(GFFDataType.BYTE, "PT_NPC_AVAIL")).setValue(npc.available ? 1 : 0);
    avail.addField(new GFFField(GFFDataType.BYTE, "PT_NPC_SELECT")).setValue(npc.canSelect ? 1 : 0);
    availStructs.push(avail);
    const inf = new GFFStruct();
    inf.addField(new GFFField(GFFDataType.INT, "PT_NPC_INFLUENCE")).setValue(npc.influence);
    influenceStructs.push(inf);
  }
  if (root.hasField("PT_AVAIL_NPCS") || availStructs.length) {
    replaceList(root, "PT_AVAIL_NPCS", availStructs);
  }
  if (root.hasField("PT_INFLUENCE")) {
    replaceList(root, "PT_INFLUENCE", influenceStructs);
  }

  const journalStructs: GFFStruct[] = [];
  for (let i = 0; i < party.journal.length; i++) {
    const entry = party.journal[i];
    const row = new GFFStruct();
    row.addField(new GFFField(GFFDataType.DWORD, "JNL_Date")).setValue(entry.date | 0);
    row.addField(new GFFField(GFFDataType.DWORD, "JNL_Time")).setValue(entry.time | 0);
    row.addField(new GFFField(GFFDataType.CEXOSTRING, "JNL_PlotID")).setValue(entry.plotId);
    row.addField(new GFFField(GFFDataType.INT, "JNL_State")).setValue(entry.state | 0);
    journalStructs.push(row);
  }
  replaceList(root, "JNL_Entries", journalStructs);

  if (party.chemicalCount != null) {
    setOrCreate(root, GFFDataType.DWORD, "PT_ITEM_CHEMICAL", party.chemicalCount | 0);
  }
  if (party.componentCount != null) {
    setOrCreate(root, GFFDataType.DWORD, "PT_ITEM_COMPONEN", party.componentCount | 0);
  }
}

