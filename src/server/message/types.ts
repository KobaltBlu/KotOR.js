/**
 * Shared types for the unwired CSW messaging port.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file types.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { MessageVector3 } from "@/server/message/CSWMessage";

/** Retail OBJECT_INVALID. */
export const OBJECT_INVALID = 0x7f000000;

/** Broadcast / all-players id used by some LoadBar sends. */
export const PLAYER_ID_ALL = 0xfffffff7;

/** Client→server CNetLayer destination used by SendPlayerToServerMessage. */
export const PLAYER_ID_SERVER = 0xfffffffd;

/** Simplified LocString wire form (WriteCExoLocStringServer / ReadCExoLocStringClient). */
export type MessageLocString =
  | { isStrRef: true; language: number; strRef: number }
  | { isStrRef: false; text: string };

/** Optional parsed-message sink for tests (no game side effects). */
export type MessageParseHook = (info: {
  direction: "serverToPlayer" | "playerToServer";
  major: number;
  minor: number;
  payload: Record<string, unknown>;
}) => void;

export type { MessageVector3 };

/** Structured CC feedback payload for SendServerToPlayerCCMessage. */
export interface CCMessageData {
  objectIds?: number[];
  integers?: number[];
  floats?: number[];
  strings?: string[];
  locStrings?: MessageLocString[];
}

export interface PlayerListEntry {
  playerId: number;
  objectId: number;
  playerName: string;
  isDM: boolean;
  communityNameObjectId?: number;
  firstName: MessageLocString;
  lastName: MessageLocString;
  portraitId: number;
  portraitResRef?: string;
}

export interface CustomTokenEntry {
  number: number;
  value: string;
}
