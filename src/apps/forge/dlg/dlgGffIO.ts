import { GFFDataType } from "@/enums/resource/GFFDataType";
import { CExoLocString } from "@/resource/CExoLocString";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import {
  createEmptyDocument,
  createLink,
  createNode,
  createScriptParams,
  type ForgeDLGAnim,
  type ForgeDLGDocument,
  type ForgeDLGLink,
  type ForgeDLGNode,
  type ForgeDLGScriptParams,
} from "@/apps/forge/dlg/ForgeDLGTypes";
import { cloneLocString } from "@/apps/forge/dlg/dlgLocString";
import { inferDlgSoundExists } from "@/apps/forge/dlg/dlgSoundExists";

/**
 * GFF parse/export for ForgeDLG. Does not load NWScript or flatten locstrings.
 *
 * @file dlgGffIO.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

const K2_NODE_LABELS = [
  "Script2",
  "ActionParam1",
  "ActionParam1b",
  "Emotion",
  "AlienRaceNode",
  "FacialAnim",
  "PostProcNode",
  "RecordVO",
  "RecordNoVOOverri",
  "VOTextChanged",
];

const K2_LINK_LABELS = ["Active2", "Logic", "Not2", "Param1b"];

const K2_ROOT_LABELS = ["AlienRaceOwner", "RecordNoVO", "OldHitCheck", "PostProcOwner"];

function readString(struct: GFFStruct, label: string, fallback = ""): string {
  if (!struct.hasField(label)) {
    return fallback;
  }
  const v = struct.getFieldByLabel(label).getValue();
  if (v == null) {
    return fallback;
  }
  return String(v);
}

function readNumber(struct: GFFStruct, label: string, fallback: number): number {
  if (!struct.hasField(label)) {
    return fallback;
  }
  const v = struct.getFieldByLabel(label).getValue();
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function readLocString(struct: GFFStruct, label: string): CExoLocString {
  if (!struct.hasField(label)) {
    return new CExoLocString(-1);
  }
  const field = struct.getFieldByLabel(label);
  if (field.getType() === GFFDataType.CEXOLOCSTRING) {
    return cloneLocString(field.getCExoLocString());
  }
  const loc = new CExoLocString(-1);
  const value = field.getValue();
  if (typeof value === "string" && value.length) {
    loc.addSubString(value, 0);
  }
  return loc;
}

function hasAnyLabel(struct: GFFStruct, labels: string[]): boolean {
  for (let i = 0; i < labels.length; i++) {
    if (struct.hasField(labels[i])) {
      return true;
    }
  }
  return false;
}

function readParams(struct: GFFStruct, suffix: "" | "2" | "b"): ForgeDLGScriptParams {
  const params = createScriptParams();
  const notLabel = suffix === "2" || suffix === "b" ? "Not2" : "Not";
  const p1 = suffix === "b" ? "Param1b" : "Param1";
  const p2 = suffix === "b" ? "Param2b" : "Param2";
  const p3 = suffix === "b" ? "Param3b" : "Param3";
  const p4 = suffix === "b" ? "Param4b" : "Param4";
  const p5 = suffix === "b" ? "Param5b" : "Param5";
  const str = suffix === "b" ? "ParamStrB" : "ParamStrA";
  params.not = readNumber(struct, notLabel, 0);
  params.param1 = readNumber(struct, p1, 0);
  params.param2 = readNumber(struct, p2, 0);
  params.param3 = readNumber(struct, p3, 0);
  params.param4 = readNumber(struct, p4, 0);
  params.param5 = readNumber(struct, p5, 0);
  params.string = readString(struct, str, "");
  return params;
}

function readActionParams(struct: GFFStruct, channel: 1 | 2): ForgeDLGScriptParams {
  const params = createScriptParams();
  if (channel === 1) {
    params.param1 = readNumber(struct, "ActionParam1", 0);
    params.param2 = readNumber(struct, "ActionParam2", 0);
    params.param3 = readNumber(struct, "ActionParam3", 0);
    params.param4 = readNumber(struct, "ActionParam4", 0);
    params.param5 = readNumber(struct, "ActionParam5", 0);
    params.string = readString(struct, "ActionParamStrA", "");
  } else {
    params.param1 = readNumber(struct, "ActionParam1b", 0);
    params.param2 = readNumber(struct, "ActionParam2b", 0);
    params.param3 = readNumber(struct, "ActionParam3b", 0);
    params.param4 = readNumber(struct, "ActionParam4b", 0);
    params.param5 = readNumber(struct, "ActionParam5b", 0);
    params.string = readString(struct, "ActionParamStrB", "");
  }
  return params;
}

function readLink(
  struct: GFFStruct,
  id: string,
  resolveTarget: (index: number) => string,
): ForgeDLGLink {
  const index = readNumber(struct, "Index", -1);
  const link = createLink(id, resolveTarget(index));
  link.unresolvedIndex = index;
  link.active = readString(struct, "Active", "");
  link.active2 = readString(struct, "Active2", "");
  link.logic = readNumber(struct, "Logic", 0);
  link.params = readParams(struct, "");
  link.params2 = readParams(struct, "b");
  link.isChild = readNumber(struct, "IsChild", 0);
  link.comment = readString(struct, "Comment", "") || readString(struct, "LinkComment", "");
  return link;
}

function readAnimList(struct: GFFStruct): ForgeDLGAnim[] {
  if (!struct.hasField("AnimList")) {
    return [];
  }
  const structs = struct.getFieldByLabel("AnimList").getChildStructs();
  const out: ForgeDLGAnim[] = [];
  for (let i = 0; i < structs.length; i++) {
    const child = structs[i];
    out.push({
      animation: readNumber(child, "Animation", 0),
      participant: readString(child, "Participant", ""),
    });
  }
  return out;
}

function readFadeColor(struct: GFFStruct): { r: number; g: number; b: number } {
  if (!struct.hasField("FadeColor")) {
    return { r: 0, g: 0, b: 0 };
  }
  const v = struct.getFieldByLabel("FadeColor").getVector();
  return { r: v?.x ?? 0, g: v?.y ?? 0, b: v?.z ?? 0 };
}

function readNode(
  struct: GFFStruct,
  id: string,
  kind: "entry" | "reply",
  nextLinkId: () => string,
  resolveTarget: (index: number) => string,
): ForgeDLGNode {
  const node = createNode(id, kind);
  node.text = readLocString(struct, "Text");
  node.speaker = readString(struct, "Speaker", "");
  node.listener = readString(struct, "Listener", "");
  node.comment = readString(struct, "Comment", "");
  node.voResRef = readString(struct, "VO_ResRef", "");
  node.sound = readString(struct, "Sound", "");
  node.soundExists = readNumber(struct, "SoundExists", node.soundExists);
  node.script = readString(struct, "Script", "");
  node.script2 = readString(struct, "Script2", "");
  node.scriptParams = readActionParams(struct, 1);
  node.script2Params = readActionParams(struct, 2);
  node.cameraAngle = readNumber(struct, "CameraAngle", 0);
  node.cameraID = readNumber(struct, "CameraID", 0);
  node.cameraAnimation = readNumber(struct, "CameraAnimation", -1);
  node.camFieldOfView = readNumber(struct, "CamFieldOfView", -1);
  node.camVidEffect = readNumber(struct, "CamVidEffect", -1);
  node.delay = readNumber(struct, "Delay", node.delay) >>> 0;
  node.waitFlags = readNumber(struct, "WaitFlags", 0);
  node.fadeType = readNumber(struct, "FadeType", 0);
  node.fadeLength = readNumber(struct, "FadeLength", 0);
  node.fadeDelay = readNumber(struct, "FadeDelay", 0);
  node.fadeColor = readFadeColor(struct);
  node.quest = readString(struct, "Quest", "");
  node.questEntry = readNumber(struct, "QuestEntry", 0);
  node.plotIndex = readNumber(struct, "PlotIndex", -1);
  node.plotXPPercentage = readNumber(struct, "PlotXPPercentage", 1);
  node.nodeUnskippable = readNumber(struct, "NodeUnskippable", 0);
  node.isChild = readNumber(struct, "IsChild", 0);
  node.alienRaceNode = readNumber(struct, "AlienRaceNode", 0);
  node.emotion = readNumber(struct, "Emotion", 4);
  node.facialAnimation = readNumber(struct, "FacialAnim", 0);
  node.postProcessNode = readNumber(struct, "PostProcNode", 0);
  node.recordNoVOOverride = readNumber(struct, "RecordNoVOOverri", 0);
  node.recordVO = readNumber(struct, "RecordVO", 0);
  node.voTextChanged = readNumber(struct, "VOTextChanged", 1);
  node.animations = readAnimList(struct);
  node.k2Present = hasAnyLabel(struct, K2_NODE_LABELS);

  const listLabel = kind === "entry" ? "RepliesList" : "EntriesList";
  if (struct.hasField(listLabel)) {
    const children = struct.getFieldByLabel(listLabel).getChildStructs();
    for (let i = 0; i < children.length; i++) {
      const link = readLink(children[i], nextLinkId(), resolveTarget);
      if (hasAnyLabel(children[i], K2_LINK_LABELS)) {
        node.k2Present = true;
      }
      node.links.push(link);
    }
  }
  return node;
}

export function parseDlgGff(gff: GFFObject): ForgeDLGDocument {
  const doc = createEmptyDocument();
  const root = gff.RootNode;
  if (!root) {
    return doc;
  }

  doc.conversationType = readNumber(root, "ConversationType", 0);
  doc.computerType = readNumber(root, "ComputerType", 0);
  doc.voId = readString(root, "VO_ID", "");
  doc.cameraModel = readString(root, "CameraModel", "");
  doc.endConversation = readString(root, "EndConversation", "");
  doc.endConverAbort = readString(root, "EndConverAbort", "");
  doc.ambientTrack = readString(root, "AmbientTrack", "");
  doc.animatedCut = readNumber(root, "AnimatedCut", 0);
  doc.skippable = readNumber(root, "Skippable", 1);
  doc.delayEntry = readNumber(root, "DelayEntry", doc.delayEntry) >>> 0;
  doc.delayReply = readNumber(root, "DelayReply", doc.delayReply) >>> 0;
  doc.unequipItems = readNumber(root, "UnequipItems", 0);
  doc.unequipHeadItem = readNumber(root, "UnequipHItem", 0);
  doc.alienRaceOwner = readNumber(root, "AlienRaceOwner", 0);
  doc.recordNoVO = readNumber(root, "RecordNoVO", 0);
  doc.oldHitCheck = readNumber(root, "OldHitCheck", 0);
  doc.postProcOwner = readNumber(root, "PostProcOwner", 0);
  doc.k2Present = hasAnyLabel(root, K2_ROOT_LABELS);

  if (root.hasField("StuntList")) {
    const stunts = root.getFieldByLabel("StuntList").getChildStructs();
    for (let i = 0; i < stunts.length; i++) {
      const s = stunts[i];
      doc.stuntList.push({
        participant: readString(s, "Participant", ""),
        stuntModel: readString(s, "StuntModel", ""),
      });
    }
  }

  let idSeq = 0;
  const nextLinkId = () => {
    idSeq += 1;
    return `l${idSeq}`;
  };

  const entryStructs = root.hasField("EntryList")
    ? root.getFieldByLabel("EntryList").getChildStructs()
    : [];
  const replyStructs = root.hasField("ReplyList")
    ? root.getFieldByLabel("ReplyList").getChildStructs()
    : [];

  const entryIds: string[] = [];
  const replyIds: string[] = [];
  for (let i = 0; i < entryStructs.length; i++) {
    idSeq += 1;
    entryIds.push(`e${idSeq}`);
  }
  for (let i = 0; i < replyStructs.length; i++) {
    idSeq += 1;
    replyIds.push(`r${idSeq}`);
  }

  const resolveReply = (index: number) => replyIds[index] || "";
  const resolveEntry = (index: number) => entryIds[index] || "";

  for (let i = 0; i < entryStructs.length; i++) {
    const node = readNode(entryStructs[i], entryIds[i], "entry", nextLinkId, resolveReply);
    if (node.k2Present) {
      doc.k2Present = true;
    }
    doc.entries.push(node);
  }
  for (let i = 0; i < replyStructs.length; i++) {
    const node = readNode(replyStructs[i], replyIds[i], "reply", nextLinkId, resolveEntry);
    if (node.k2Present) {
      doc.k2Present = true;
    }
    doc.replies.push(node);
  }

  if (root.hasField("StartingList")) {
    const starts = root.getFieldByLabel("StartingList").getChildStructs();
    for (let i = 0; i < starts.length; i++) {
      const link = readLink(starts[i], nextLinkId(), resolveEntry);
      if (hasAnyLabel(starts[i], K2_LINK_LABELS)) {
        doc.k2Present = true;
      }
      doc.startingLinks.push(link);
    }
  }

  doc.idSeq = idSeq;
  return doc;
}

function addByte(struct: GFFStruct, label: string, value: number): void {
  struct.addField(new GFFField(GFFDataType.BYTE, label, value & 0xff));
}

function addInt(struct: GFFStruct, label: string, value: number): void {
  struct.addField(new GFFField(GFFDataType.INT, label, value | 0));
}

function addDword(struct: GFFStruct, label: string, value: number): void {
  struct.addField(new GFFField(GFFDataType.DWORD, label, value >>> 0));
}

function addFloat(struct: GFFStruct, label: string, value: number): void {
  struct.addField(new GFFField(GFFDataType.FLOAT, label, value));
}

function addResRef(struct: GFFStruct, label: string, value: string): void {
  struct.addField(new GFFField(GFFDataType.RESREF, label, value || ""));
}

function addCExo(struct: GFFStruct, label: string, value: string): void {
  struct.addField(new GFFField(GFFDataType.CEXOSTRING, label, value || ""));
}

function writeLinkParams(struct: GFFStruct, link: ForgeDLGLink, k2: boolean): void {
  addByte(struct, "Not", link.params.not);
  addInt(struct, "Param1", link.params.param1);
  addInt(struct, "Param2", link.params.param2);
  addInt(struct, "Param3", link.params.param3);
  addInt(struct, "Param4", link.params.param4);
  addInt(struct, "Param5", link.params.param5);
  addCExo(struct, "ParamStrA", link.params.string);
  if (k2) {
    addByte(struct, "Not2", link.params2.not);
    addInt(struct, "Param1b", link.params2.param1);
    addInt(struct, "Param2b", link.params2.param2);
    addInt(struct, "Param3b", link.params2.param3);
    addInt(struct, "Param4b", link.params2.param4);
    addInt(struct, "Param5b", link.params2.param5);
    addCExo(struct, "ParamStrB", link.params2.string);
  }
}

function writeLink(
  link: ForgeDLGLink,
  indexMap: Map<string, number>,
  k2: boolean,
): GFFStruct {
  const struct = new GFFStruct(0);
  const index = indexMap.has(link.targetId) ? indexMap.get(link.targetId)! : Math.max(0, link.unresolvedIndex);
  addDword(struct, "Index", index >>> 0);
  addResRef(struct, "Active", link.active);
  if (k2) {
    addResRef(struct, "Active2", link.active2);
    addByte(struct, "Logic", link.logic);
  }
  writeLinkParams(struct, link, k2);
  addByte(struct, "IsChild", link.isChild);
  if (link.comment) {
    addCExo(struct, "Comment", link.comment);
  }
  return struct;
}

function writeNode(
  node: ForgeDLGNode,
  targetIndexMap: Map<string, number>,
  k2: boolean,
  alienRaceOwner: number,
): GFFStruct {
  const struct = new GFFStruct(0);
  const writeK2 = k2 || node.k2Present;
  struct.addField(new GFFField(GFFDataType.CEXOLOCSTRING, "Text", node.text));
  addCExo(struct, "Speaker", node.speaker);
  addCExo(struct, "Listener", node.listener);
  addCExo(struct, "Comment", node.comment);
  addResRef(struct, "VO_ResRef", node.voResRef);
  addResRef(struct, "Sound", node.sound);
  addByte(struct, "SoundExists", inferDlgSoundExists(node, { k2Present: k2, alienRaceOwner }));
  addResRef(struct, "Script", node.script);
  if (writeK2) {
    addResRef(struct, "Script2", node.script2);
    addInt(struct, "ActionParam1", node.scriptParams.param1);
    addInt(struct, "ActionParam2", node.scriptParams.param2);
    addInt(struct, "ActionParam3", node.scriptParams.param3);
    addInt(struct, "ActionParam4", node.scriptParams.param4);
    addInt(struct, "ActionParam5", node.scriptParams.param5);
    addCExo(struct, "ActionParamStrA", node.scriptParams.string);
    addInt(struct, "ActionParam1b", node.script2Params.param1);
    addInt(struct, "ActionParam2b", node.script2Params.param2);
    addInt(struct, "ActionParam3b", node.script2Params.param3);
    addInt(struct, "ActionParam4b", node.script2Params.param4);
    addInt(struct, "ActionParam5b", node.script2Params.param5);
    addCExo(struct, "ActionParamStrB", node.script2Params.string);
  }
  addInt(struct, "CameraAngle", node.cameraAngle);
  addInt(struct, "CameraID", node.cameraID);
  addInt(struct, "CameraAnimation", node.cameraAnimation);
  addFloat(struct, "CamFieldOfView", node.camFieldOfView);
  addInt(struct, "CamVidEffect", node.camVidEffect);
  addDword(struct, "Delay", node.delay);
  addDword(struct, "WaitFlags", node.waitFlags);
  addByte(struct, "FadeType", node.fadeType);
  addFloat(struct, "FadeLength", node.fadeLength);
  addFloat(struct, "FadeDelay", node.fadeDelay);
  struct.addField(
    new GFFField(GFFDataType.VECTOR, "FadeColor", {
      x: node.fadeColor.r,
      y: node.fadeColor.g,
      z: node.fadeColor.b,
    }),
  );
  addCExo(struct, "Quest", node.quest);
  addDword(struct, "QuestEntry", node.questEntry);
  addInt(struct, "PlotIndex", node.plotIndex);
  addFloat(struct, "PlotXPPercentage", node.plotXPPercentage);
  addByte(struct, "NodeUnskippable", node.nodeUnskippable);
  addByte(struct, "IsChild", node.isChild);
  if (writeK2) {
    addInt(struct, "AlienRaceNode", node.alienRaceNode);
    addInt(struct, "Emotion", node.emotion);
    addInt(struct, "FacialAnim", node.facialAnimation);
    addInt(struct, "PostProcNode", node.postProcessNode);
    addByte(struct, "RecordNoVOOverri", node.recordNoVOOverride);
    addByte(struct, "RecordVO", node.recordVO);
    addByte(struct, "VOTextChanged", node.voTextChanged);
  }

  const animList = new GFFField(GFFDataType.LIST, "AnimList");
  for (let i = 0; i < node.animations.length; i++) {
    const animStruct = new GFFStruct(0);
    addInt(animStruct, "Animation", node.animations[i].animation);
    addCExo(animStruct, "Participant", node.animations[i].participant);
    animList.addChildStruct(animStruct);
  }
  struct.addField(animList);

  const listLabel = node.kind === "entry" ? "RepliesList" : "EntriesList";
  const list = new GFFField(GFFDataType.LIST, listLabel);
  for (let i = 0; i < node.links.length; i++) {
    list.addChildStruct(writeLink(node.links[i], targetIndexMap, writeK2));
  }
  struct.addField(list);
  return struct;
}

export function exportDlgGff(doc: ForgeDLGDocument): GFFObject {
  const gff = new GFFObject();
  gff.FileType = "DLG ";
  gff.FileVersion = "V3.2";
  gff.RootNode.type = -1;
  const root = gff.RootNode;

  addInt(root, "ConversationType", doc.conversationType);
  addByte(root, "ComputerType", doc.computerType);
  addCExo(root, "VO_ID", doc.voId);
  addResRef(root, "CameraModel", doc.cameraModel);
  addResRef(root, "EndConversation", doc.endConversation);
  addResRef(root, "EndConverAbort", doc.endConverAbort);
  addResRef(root, "AmbientTrack", doc.ambientTrack);
  addByte(root, "AnimatedCut", doc.animatedCut);
  addByte(root, "Skippable", doc.skippable);
  addDword(root, "DelayEntry", doc.delayEntry);
  addDword(root, "DelayReply", doc.delayReply);
  addByte(root, "UnequipItems", doc.unequipItems);
  addByte(root, "UnequipHItem", doc.unequipHeadItem);

  const k2 = doc.k2Present;
  if (k2) {
    addInt(root, "AlienRaceOwner", doc.alienRaceOwner);
    addByte(root, "RecordNoVO", doc.recordNoVO);
    addByte(root, "OldHitCheck", doc.oldHitCheck);
    addInt(root, "PostProcOwner", doc.postProcOwner);
  }

  const entryIndex = new Map<string, number>();
  const replyIndex = new Map<string, number>();
  for (let i = 0; i < doc.entries.length; i++) {
    entryIndex.set(doc.entries[i].id, i);
  }
  for (let i = 0; i < doc.replies.length; i++) {
    replyIndex.set(doc.replies[i].id, i);
  }

  const entryList = new GFFField(GFFDataType.LIST, "EntryList");
  for (let i = 0; i < doc.entries.length; i++) {
    entryList.addChildStruct(writeNode(doc.entries[i], replyIndex, k2, doc.alienRaceOwner));
  }
  root.addField(entryList);

  const replyList = new GFFField(GFFDataType.LIST, "ReplyList");
  for (let i = 0; i < doc.replies.length; i++) {
    replyList.addChildStruct(writeNode(doc.replies[i], entryIndex, k2, doc.alienRaceOwner));
  }
  root.addField(replyList);

  const startingList = new GFFField(GFFDataType.LIST, "StartingList");
  for (let i = 0; i < doc.startingLinks.length; i++) {
    startingList.addChildStruct(writeLink(doc.startingLinks[i], entryIndex, k2));
  }
  root.addField(startingList);

  const stuntList = new GFFField(GFFDataType.LIST, "StuntList");
  for (let i = 0; i < doc.stuntList.length; i++) {
    const s = new GFFStruct(0);
    addCExo(s, "Participant", doc.stuntList[i].participant);
    addResRef(s, "StuntModel", doc.stuntList[i].stuntModel);
    stuntList.addChildStruct(s);
  }
  root.addField(stuntList);

  return gff;
}
