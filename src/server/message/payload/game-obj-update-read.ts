/**
 * GameObjUpdate read helpers — HandleServerToPlayerUpdate_* / CreatureUpdate_* leaves.
 * Decode only; no client world mutation (onParsed consumers).
 *
 * Ref: HandleServerToPlayerGameObjectUpdate
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file game-obj-update-read.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { OdysseyMessage, MessageVector3 } from "@/server/message/OdysseyMessage";
import {
  GameObjUpdateCategory,
  MessageGameObjectType,
} from "@/enums/server/message/MessageMinors";
import { OBJECT_INVALID } from "@/server/message/types";

export type GameObjUpdateEvent =
  | { category: "A"; objectType: number; remainingHint: number }
  | { category: "D"; objectType: number; objectId: number; flags?: Record<string, unknown> }
  | { category: "W"; current: number; total: number }
  | { category: "P" | "U" | "I" | "G"; remainingHint: number }
  | { category: string; remainingHint: number };

/** ReadOBJECTIDClient — raw DWORD. */
export function readObjectIdClient(msg: OdysseyMessage): number {
  return msg.readDWORD();
}

/**
 * VisEffect payload (non-beam path minimum).
 * isBeam is caller-supplied (uses GetIsBeam).
 */
export function readVisEffect(
  msg: OdysseyMessage,
  isBeam: boolean
): {
  objectId: number;
  vfxId: number;
  pos: MessageVector3;
  beam?: {
    targetId: number;
    sourceId: number;
    byte0: number;
    byte1: number;
    beamPos: MessageVector3;
    duration?: number;
  };
} {
  const objectId = readObjectIdClient(msg);
  const vfxId = msg.readWORD();
  const pos = { x: msg.readFLOAT(), y: msg.readFLOAT(), z: msg.readFLOAT() };
  if (!isBeam) {
    return { objectId, vfxId, pos };
  }
  const targetId = readObjectIdClient(msg);
  const sourceId = readObjectIdClient(msg);
  const byte0 = msg.readBYTE();
  const byte1 = msg.readBYTE();
  const beamPos = { x: msg.readFLOAT(), y: msg.readFLOAT(), z: msg.readFLOAT() };
  const beam: {
    targetId: number;
    sourceId: number;
    byte0: number;
    byte1: number;
    beamPos: MessageVector3;
    duration?: number;
  } = { targetId, sourceId, byte0, byte1, beamPos };
  if (objectId === OBJECT_INVALID) {
    beam.duration = msg.readFLOAT();
  }
  return { objectId, vfxId, pos, beam };
}

/** Creature delete */
export function readCreatureDelete(msg: OdysseyMessage): Record<string, unknown> {
  return {
    objectId: readObjectIdClient(msg),
    bool0: msg.readBOOL(),
    bool1: msg.readBOOL(),
    dword0: msg.readDWORD(),
    bool2: msg.readBOOL(),
  };
}

/** Generic object-type delete (Item/Door/etc. — OBJECTID only for DestroyItem). */
export function readObjectIdOnly(msg: OdysseyMessage): { objectId: number } {
  return { objectId: readObjectIdClient(msg) };
}

/** WorkRemaining — two BYTEs. */
export function readWorkRemaining(msg: OdysseyMessage): { current: number; total: number } {
  const current = msg.readBYTE();
  let total = msg.readBYTE();
  if (total === 0) total = 1;
  return { current, total };
}

/**
 * Delete category — object-type byte then type-specific leaf.
 * Full creature fields when type is Creature; otherwise OBJECTID (+ remaining hint).
 */
export function readDeleteCategory(msg: OdysseyMessage): GameObjUpdateEvent {
  const objectType = msg.readBYTE();
  if (objectType === MessageGameObjectType.Creature) {
    return {
      category: "D",
      objectType,
      objectId: 0,
      flags: readCreatureDelete(msg),
    };
  }
  // Item/Trigger/Door/AoE/Placeable deletes typically lead with OBJECTID
  const objectId = readObjectIdClient(msg);
  return {
    category: "D",
    objectType,
    objectId,
    flags: { remainingHint: msg.readBufferSize - msg.readIndex },
  };
}

/** Add category — object-type then opaque remaining (full add packs need live templates). */
export function readAddCategory(msg: OdysseyMessage): GameObjUpdateEvent {
  const objectType = msg.readBYTE();
  return {
    category: "A",
    objectType,
    remainingHint: msg.readBufferSize - msg.readIndex,
  };
}

/**
 * Parse minor-1 category stream until buffer exhausted or unknown category.
 */
export function readGameObjUpdateStream(msg: OdysseyMessage): GameObjUpdateEvent[] {
  const events: GameObjUpdateEvent[] = [];
  while (msg.messageMoreDataToRead() && !msg.messageReadOverflow()) {
    const cat = msg.readBYTE();
    if (msg.messageReadOverflow()) break;
    switch (cat) {
      case GameObjUpdateCategory.Add:
        events.push(readAddCategory(msg));
        // Full Add packs are object-template sized; drain remainder as opaque for this stub pass.
        while (msg.messageMoreDataToRead() && !msg.messageReadOverflow()) {
          msg.readBYTE();
        }
        break;
      case GameObjUpdateCategory.Delete:
        events.push(readDeleteCategory(msg));
        break;
      case GameObjUpdateCategory.WorkRemaining:
        events.push({ category: "W", ...readWorkRemaining(msg) });
        break;
      case GameObjUpdateCategory.Appearance:
        events.push({ category: "P", remainingHint: msg.readBufferSize - msg.readIndex });
        while (msg.messageMoreDataToRead() && !msg.messageReadOverflow()) msg.readBYTE();
        break;
      case GameObjUpdateCategory.Update:
        events.push({ category: "U", remainingHint: msg.readBufferSize - msg.readIndex });
        while (msg.messageMoreDataToRead() && !msg.messageReadOverflow()) msg.readBYTE();
        break;
      case GameObjUpdateCategory.PlayerInfo:
        events.push({ category: "I", remainingHint: msg.readBufferSize - msg.readIndex });
        while (msg.messageMoreDataToRead() && !msg.messageReadOverflow()) msg.readBYTE();
        break;
      case GameObjUpdateCategory.GuiElements:
        events.push({ category: "G", remainingHint: msg.readBufferSize - msg.readIndex });
        while (msg.messageMoreDataToRead() && !msg.messageReadOverflow()) msg.readBYTE();
        break;
      default:
        events.push({ category: String.fromCharCode(cat), remainingHint: msg.readBufferSize - msg.readIndex });
        return events;
    }
  }
  return events;
}
