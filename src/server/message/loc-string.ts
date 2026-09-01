/**
 * LocString wire helpers for CSWSMessage / CSWCMessage.
 * Retail WriteCExoLocStringServer / ReadCExoLocStringClient.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file loc-string.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { CSWMessage } from "@/server/message/CSWMessage";
import type { MessageLocString } from "@/server/message/types";

/** Simplified LocString writer matching the two wire forms retail emits. */
export function writeLocString(msg: CSWMessage, value: MessageLocString): void {
  if (value.isStrRef === true) {
    msg.writeBOOL(1);
    msg.writeBYTE(value.language & 0xff);
    msg.writeDWORD(value.strRef);
    return;
  }
  msg.writeBOOL(0);
  msg.writeCExoString(value.text);
}

/** Simplified LocString reader — returns wire form without TLK resolve. */
export function readLocString(msg: CSWMessage): MessageLocString {
  const isStrRef = msg.readBOOL();
  if (isStrRef) {
    return {
      isStrRef: true,
      language: msg.readBYTE(),
      strRef: msg.readDWORD(),
    };
  }
  return { isStrRef: false, text: msg.readCExoString() };
}
