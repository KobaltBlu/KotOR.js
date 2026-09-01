/**
 * Message transport stub — replaces retail net layer for the unwired messaging port.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file transport.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/** Packet framing: [0]='P'|'p', [1]=major, [2]=minor, [3..]=payload. */
export const SERVER_TO_PLAYER_PREFIX = 0x50; // 'P'
export const PLAYER_TO_SERVER_PREFIX = 0x70; // 'p'

export interface IMessageTransport {
  /** Retail SendMessageToPlayer from server. */
  sendToPlayer(playerId: number, message: Uint8Array): boolean;
  /** Retail SendMessageToPlayer from client (playerId often 0xfffffffd). */
  sendToServer(message: Uint8Array): boolean;
}

/** Default no-op transport — messaging is ported but not wired. */
export class NoopMessageTransport implements IMessageTransport {
  sendToPlayer(_playerId: number, _message: Uint8Array): boolean {
    return true;
  }
  sendToServer(_message: Uint8Array): boolean {
    return true;
  }
}

/** In-memory transport for unit tests / local loopback. */
export class MemoryMessageTransport implements IMessageTransport {
  toPlayer: { playerId: number; message: Uint8Array }[] = [];
  toServer: Uint8Array[] = [];

  sendToPlayer(playerId: number, message: Uint8Array): boolean {
    this.toPlayer.push({ playerId, message: message.slice() });
    return true;
  }

  sendToServer(message: Uint8Array): boolean {
    this.toServer.push(message.slice());
    return true;
  }

  clear(): void {
    this.toPlayer = [];
    this.toServer = [];
  }
}
