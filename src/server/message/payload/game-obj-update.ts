/**
 * GameObjUpdate write helpers — retail CSWSMessage WriteGameObjUpdate_* family.
 * These encode payload fragments into a CSWMessage; callers pass structured field bags
 * (no live CSWSPlayer / last-update state required for the unwired port).
 *
 * Primary refs: WriteGameObjUpdate_UpdateObject @ 00574a10,
 * WriteGameObjUpdate_UpdateAppearance @ 00572070, WriteGameObjUpdate_PlayerUpdate @ 00572dc0.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file game-obj-update.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { CSWMessage, MessageVector3 } from "@/server/message/CSWMessage";
import { OBJECT_INVALID } from "@/server/message/types";

/** Write a server OBJECTID (same as CSWSMessage.writeOBJECTIDServer). */
export function writeObjectId(msg: CSWMessage, objectId: number): void {
  let id = objectId >>> 0;
  if (id !== OBJECT_INVALID) id = id | 0x80000000;
  msg.writeDWORD(id);
}

/**
 * Retail WriteGameObjUpdate_WriteInventorySlotAdd @ 00567710 — simplified.
 */
export function writeInventorySlotAdd(
  msg: CSWMessage,
  slot: number,
  itemObjectId: number,
  packedItemAppearance?: Uint8Array
): void {
  msg.writeBYTE(slot & 0xff);
  writeObjectId(msg, itemObjectId);
  if (packedItemAppearance && packedItemAppearance.length) {
    msg.writeBOOL(1);
    msg.writeVOIDPtr(packedItemAppearance);
  } else {
    msg.writeBOOL(0);
  }
}

/**
 * Creature add header fragment used by several Update_Add paths.
 */
export function writeCreatureAddHeader(
  msg: CSWMessage,
  objectId: number,
  appearance: number,
  pos: MessageVector3,
  facing: number
): void {
  writeObjectId(msg, objectId);
  msg.writeWORD(appearance & 0xffff);
  msg.writeFLOAT(pos.x);
  msg.writeFLOAT(pos.y);
  msg.writeFLOAT(pos.z);
  msg.writeFLOAT(facing);
}

/**
 * Door/placeable/trigger delete — OBJECTID only.
 */
export function writeObjectDelete(msg: CSWMessage, objectId: number): void {
  writeObjectId(msg, objectId);
}

/**
 * Vis-effect list: count + entries {id, creator?, duration?}.
 * Matches the compare/assign list shape used around CompareVisualEffectLists @ 005672f0.
 */
export function writeVisualEffectList(
  msg: CSWMessage,
  effects: { id: number; creatorId?: number; duration?: number }[]
): void {
  msg.writeBYTE(effects.length & 0xff);
  for (const e of effects) {
    msg.writeWORD(e.id & 0xffff);
    writeObjectId(msg, e.creatorId ?? OBJECT_INVALID);
    msg.writeFLOAT(e.duration ?? 0);
  }
}

/**
 * Work-remaining progress byte — WriteGameObjUpdate_WorkRemaining @ 00567ba0.
 */
export function writeWorkRemaining(msg: CSWMessage, remaining: number): void {
  msg.writeBYTE(remaining & 0xff);
}

/**
 * Party AI state fragment — WriteGameObjUpdate_PartyAIState @ 005779f0.
 */
export function writePartyAIState(
  msg: CSWMessage,
  entries: { objectId: number; aiState: number }[]
): void {
  msg.writeBYTE(entries.length & 0xff);
  for (const e of entries) {
    writeObjectId(msg, e.objectId);
    msg.writeBYTE(e.aiState & 0xff);
  }
}

/**
 * Character sheet panel fragment — WriteGameObjUpdate_CharacterSheet @ 0056f490.
 * Accepts opaque packed bytes from a higher-level packer.
 */
export function writeCharacterSheetBlob(msg: CSWMessage, packed: Uint8Array): void {
  msg.writeDWORD(packed.length);
  msg.writeVOIDPtr(packed);
}

/**
 * Minor GUI panels fragment — WriteGameObjUpdate_MinorGUIPanels @ 00572990.
 */
export function writeMinorGUIPanels(msg: CSWMessage, packed: Uint8Array): void {
  msg.writeDWORD(packed.length);
  msg.writeVOIDPtr(packed);
}

/**
 * Major GUI panels fragment — WriteGameObjUpdate_MajorGUIPanels @ 00577670.
 */
export function writeMajorGUIPanels(msg: CSWMessage, packed: Uint8Array): void {
  msg.writeDWORD(packed.length);
  msg.writeVOIDPtr(packed);
}

/**
 * Appearance update blob — WriteGameObjUpdate_UpdateAppearance @ 00572070.
 */
export function writeUpdateAppearance(msg: CSWMessage, objectId: number, packed: Uint8Array): void {
  writeObjectId(msg, objectId);
  msg.writeDWORD(packed.length);
  msg.writeVOIDPtr(packed);
}

/**
 * Generic object update envelope: type byte + object id + packed delta.
 * Mirrors the category routing around SelectCategoryForGameObject @ 00567780.
 */
export function writeObjectUpdateEnvelope(
  msg: CSWMessage,
  category: number,
  objectId: number,
  packedDelta: Uint8Array
): void {
  msg.writeBYTE(category & 0xff);
  writeObjectId(msg, objectId);
  msg.writeDWORD(packedDelta.length);
  msg.writeVOIDPtr(packedDelta);
}

/**
 * Player-update fragment — WriteGameObjUpdate_PlayerUpdate @ 00572dc0.
 */
export function writePlayerUpdate(msg: CSWMessage, objectId: number, packed: Uint8Array): void {
  writeObjectId(msg, objectId);
  msg.writeDWORD(packed.length);
  msg.writeVOIDPtr(packed);
}

/**
 * Write VisEffect payload matching SendServerToPlayerGameObjUpdateVisEffect @ 00569c40.
 * @param isBeam When true, appends beam target/source/bytes/pos (+ duration if objectId invalid).
 */
export function writeVisEffect(
  msg: CSWMessage,
  writeObjectIdFn: (id: number) => void,
  data: {
    objectId: number;
    vfxId: number;
    pos: MessageVector3;
    isBeam?: boolean;
    beamTargetId?: number;
    beamSourceId?: number;
    beamByte0?: number;
    beamByte1?: number;
    beamPos?: MessageVector3;
    duration?: number;
  }
): void {
  writeObjectIdFn(data.objectId);
  msg.writeWORD(data.vfxId & 0xffff);
  msg.writeFLOAT(data.pos.x);
  msg.writeFLOAT(data.pos.y);
  msg.writeFLOAT(data.pos.z);
  if (data.isBeam) {
    writeObjectIdFn(data.beamTargetId ?? OBJECT_INVALID);
    writeObjectIdFn(data.beamSourceId ?? OBJECT_INVALID);
    msg.writeBYTE(data.beamByte0 ?? 0);
    msg.writeBYTE(data.beamByte1 ?? 0);
    const bp = data.beamPos ?? { x: 0, y: 0, z: 0 };
    msg.writeFLOAT(bp.x);
    msg.writeFLOAT(bp.y);
    msg.writeFLOAT(bp.z);
    if (data.objectId === OBJECT_INVALID) {
      msg.writeFLOAT(data.duration ?? 0);
    }
  }
}

/**
 * Write a WorkRemaining category fragment for minor-1 streams.
 */
export function writeWorkRemainingCategory(msg: CSWMessage, current: number, total: number): void {
  msg.writeBYTE(0x57); // 'W'
  msg.writeBYTE(current & 0xff);
  msg.writeBYTE(total & 0xff);
}

/**
 * Write a Delete+Creature category fragment (simplified leaf matching @ 0064cc90 reads).
 */
export function writeCreatureDeleteCategory(
  msg: CSWMessage,
  writeObjectIdFn: (id: number) => void,
  data: { objectId: number; bool0: boolean; bool1: boolean; dword0: number; bool2: boolean }
): void {
  msg.writeBYTE(0x44); // 'D'
  msg.writeBYTE(5); // CREATURE
  writeObjectIdFn(data.objectId);
  msg.writeBOOL(data.bool0);
  msg.writeBOOL(data.bool1);
  msg.writeDWORD(data.dword0);
  msg.writeBOOL(data.bool2);
}

/** Control-object update — SendServerToPlayerGameObjUpdate_ObjControl @ 0056f430. */
export function writeObjControl(msg: CSWMessage, objectId: number): void {
  writeObjectId(msg, objectId);
}

/**
 * Stub compute helpers that need live last-update state — return conservative defaults.
 * Documented with retail addresses for future wiring.
 */
export const GameObjUpdateCompute = {
  /** ComputeUpdateRequired @ 0056b950 */
  computeUpdateRequired(): boolean {
    return false;
  },
  /** TestObjectVisible @ 0056dc60 */
  testObjectVisible(): boolean {
    return true;
  },
  /** ComputeGameObjectUpdateForObject @ 00578060 */
  computeGameObjectUpdateForObject(): Uint8Array {
    return new Uint8Array(0);
  },
  /** CompareVisualEffectLists @ 005672f0 */
  compareVisualEffectLists(): boolean {
    return true;
  },
};
