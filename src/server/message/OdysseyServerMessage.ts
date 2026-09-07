/**
 * OdysseyServerMessage — server-side SendServerToPlayer* / HandlePlayerToServer* messaging.
 * Unwired: transport defaults to no-op; Handle* reads payloads only (no game side effects).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file OdysseyServerMessage.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { OdysseyMessage, type MessageVector3 } from "@/server/message/OdysseyMessage";
import {
  IMessageTransport,
  NoopMessageTransport,
  SERVER_TO_PLAYER_PREFIX,
} from "@/server/message/transport";
import { writeLocString } from "@/server/message/loc-string";
import { writeVisEffect } from "@/server/message/payload/game-obj-update";
import {
  OBJECT_INVALID,
  PLAYER_ID_ALL,
  type CCMessageData,
  type CustomTokenEntry,
  type MessageLocString,
  type MessageParseHook,
  type PlayerListEntry,
} from "@/server/message/types";
import { PlayerServerMessageId } from "@/enums/server/message/PlayerServerMessageId";
import {
  AmbientMessageMinor,
  AreaMessageMinor,
  CameraMessageMinor,
  CharacterDownloadMessageMinor,
  CharListMessageMinor,
  ChatMessageMinor,
  CheatMessageMinor,
  CustomTokenMessageMinor,
  DebugInfoMessageMinor,
  GameObjUpdateMessageMinor,
  GuiCharacterSheetMessageMinor,
  GuiContainerMessageMinor,
  GuiInfoPopupMessageMinor,
  GuiTimingMessageMinor,
  InputMessageMinor,
  InventoryMessageMinor,
  JournalMessageMinor,
  LevelUpMessageMinor,
  LoadBarMessageMinor,
  LoginMessageMinor,
  MapPinMessageMinor,
  ModuleMessageMinor,
  PlayerListMessageMinor,
  PopUpGUIPanelMessageMinor,
  QuickChatMessageMinor,
  SafeProjectileMessageMinor,
  SaveLoadMessageMinor,
  ServerStatusMessageMinor,
  ShutDownServerMessageMinor,
  SoundMessageMinor,
  VoiceChatMessageMinor,
} from "@/enums/server/message/MessageMinors";

export class OdysseyServerMessage {
  readonly internal: OdysseyMessage = new OdysseyMessage();
  transport: IMessageTransport;
  onParsed?: MessageParseHook;
  /** enableCombatDebugging — used by CCMessage case 3. */
  enableCombatDebugging: boolean = false;

  constructor(transport: IMessageTransport = new NoopMessageTransport()) {
    this.transport = transport;
  }

  /** WriteOBJECTIDServer. */
  writeOBJECTIDServer(objectId: number): void {
    let id = objectId >>> 0;
    if (id !== OBJECT_INVALID) {
      id = id | 0x80000000;
    }
    this.internal.writeDWORD(id);
  }

  /** ReadOBJECTIDServer. */
  readOBJECTIDServer(): number {
    return this.internal.readDWORD() & 0x7fffffff;
  }

  writeLocStringServer(value: MessageLocString): void {
    writeLocString(this.internal, value);
  }

  /**
   * SendServerToPlayerMessage — stamps 'P' + major + minor.
   */
  sendServerToPlayerMessage(
    playerId: number,
    major: PlayerServerMessageId | number,
    minor: number,
    buffer?: Uint8Array,
    size?: number
  ): boolean {
    let message: Uint8Array;
    let messageSize: number;
    if (!buffer || (size ?? 0) === 0) {
      message = new Uint8Array(3);
      messageSize = 3;
      this.internal.messageContext = 0xffffffff;
    } else {
      message = buffer.slice(0, size ?? buffer.length);
      messageSize = message.length;
    }
    message[0] = SERVER_TO_PLAYER_PREFIX;
    message[1] = major & 0xff;
    message[2] = minor & 0xff;
    return this.transport.sendToPlayer(playerId, message.subarray(0, messageSize));
  }

  /** Finish write buffer and send. */
  protected finishSend(playerId: number, major: number, minor: number): boolean {
    const out = this.internal.getWriteMessage();
    if (!out.ok) return false;
    return this.sendServerToPlayerMessage(playerId, major, minor, out.buffer, out.size);
  }

  /**
   * HandlePlayerToServerMessage.
   * Reads payloads only — no server object mutation.
   */
  handlePlayerToServerMessage(playerId: number, message: Uint8Array, size: number = message.length): number {
    if (size < 3 || message[0] !== 0x70 /* 'p' */) return 0;
    const major = message[1];
    const minor = message[2];
    this.internal.setReadMessage(message.subarray(3, size), size - 3, playerId, 1);
    if (this.internal.messageReadOverflow()) return 0;

    let ok = 0;
    switch (major) {
      case PlayerServerMessageId.ServerStatus:
        ok = this.handlePlayerToServerServerStatusMessage(minor);
        break;
      case PlayerServerMessageId.Login:
        ok = this.handlePlayerToServerLoginMessage(minor);
        break;
      case PlayerServerMessageId.Module:
        ok = this.handlePlayerToServerModuleMessage(minor);
        break;
      case PlayerServerMessageId.Area:
        ok = this.handlePlayerToServerAreaMessage(minor);
        break;
      case PlayerServerMessageId.GameObjUpdate:
        ok = this.handlePlayerToServerGameObjectUpdate(minor);
        break;
      case PlayerServerMessageId.Input:
        ok = this.handlePlayerToServerInputMessage(minor);
        break;
      case PlayerServerMessageId.Gold:
        ok = this.handlePlayerToServerGoldMessage(minor);
        break;
      case PlayerServerMessageId.Chat:
        ok = this.handlePlayerToServerChatMessage(minor);
        break;
      case PlayerServerMessageId.ChatAlt:
        ok = 1;
        break;
      case PlayerServerMessageId.Inventory:
        ok = this.handlePlayerToServerInventoryMessage(minor);
        break;
      case PlayerServerMessageId.GuiInventory:
        ok = this.handlePlayerToServerGuiInventoryMessage(minor);
        break;
      case PlayerServerMessageId.Party:
        ok = this.handlePlayerToServerParty(minor);
        break;
      case PlayerServerMessageId.Cheat:
        ok = this.handlePlayerToServerCheatMessage(minor);
        break;
      case PlayerServerMessageId.CharList:
        ok = this.handlePlayerToServerCharListMessage(minor);
        break;
      case PlayerServerMessageId.Dialog:
        ok = this.handlePlayerToServerDialogMessage(minor);
        break;
      case PlayerServerMessageId.GuiCharacterSheet:
        ok = this.handlePlayerToServerCharacterSheetMessage(minor);
        break;
      case PlayerServerMessageId.QuickChat:
        ok = this.handlePlayerToServerQuickChatMessage(minor);
        break;
      case PlayerServerMessageId.GuiContainer:
        ok = this.handlePlayerToServerGuiContainerMessage(minor);
        break;
      case PlayerServerMessageId.Journal:
        ok = this.handlePlayerToServerJournalMessage(minor);
        break;
      case PlayerServerMessageId.LevelUp:
        ok = this.handlePlayerToServerLevelUpMessage(minor);
        break;
      case PlayerServerMessageId.GuiQuickbar:
        ok = 1;
        break;
      case PlayerServerMessageId.MapPin:
        ok = this.handlePlayerToServerMapPinMessage(minor);
        break;
      case PlayerServerMessageId.Death:
        ok = this.handlePlayerToServerPlayerDeath(minor);
        break;
      case PlayerServerMessageId.CharacterDownload:
        ok = this.handlePlayerToServerCharacterDownload(minor);
        break;
      case PlayerServerMessageId.ShutDownServer:
        ok = this.handlePlayerToServerShutDownServer();
        break;
      case PlayerServerMessageId.PlayModuleCharacterList:
        ok = this.handlePlayerToServerPlayModuleCharacterList(minor);
        break;
      default:
        ok = 0;
        break;
    }
    return ok;
  }

  protected emitParsed(major: number, minor: number, payload: Record<string, unknown>): number {
    this.onParsed?.({ direction: "playerToServer", major, minor, payload });
    return this.internal.messageReadOverflow() ? 0 : 1;
  }

  // ---------------------------------------------------------------------------
  // Camera — SendServerToPlayerCamera_*
  // ---------------------------------------------------------------------------

  sendServerToPlayerCamera_ChangeLocation(
    playerId: number,
    flags: number,
    yaw?: number,
    dist?: number,
    pitch?: number,
    modeByte?: number
  ): boolean {
    this.internal.createWriteMessage(16);
    this.internal.writeBYTE(flags & 0xff);
    if (flags & 1) this.internal.writeFLOAT(yaw ?? 0);
    if (flags & 2) this.internal.writeFLOAT(dist ?? 0);
    if (flags & 4) this.internal.writeFLOAT(pitch ?? 0);
    if (flags & 8) this.internal.writeBYTE(modeByte ?? 0);
    return this.finishSend(playerId, PlayerServerMessageId.Camera, CameraMessageMinor.ChangeLocation);
  }

  sendServerToPlayerCamera_SetMode(playerId: number, mode: number): boolean {
    this.internal.createWriteMessage(1);
    this.internal.writeBYTE(mode & 0xff);
    return this.finishSend(playerId, PlayerServerMessageId.Camera, CameraMessageMinor.SetMode);
  }

  // ---------------------------------------------------------------------------
  // Ambient
  // ---------------------------------------------------------------------------

  sendServerToPlayerAmbientMusicPlay(playerId: number, play: boolean): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeBOOL(play);
    return this.finishSend(playerId, PlayerServerMessageId.Ambient, AmbientMessageMinor.MusicPlay);
  }

  sendServerToPlayerAmbientMusicSetDelay(playerId: number, delay: number): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeDWORD(delay);
    return this.finishSend(playerId, PlayerServerMessageId.Ambient, AmbientMessageMinor.MusicSetDelay);
  }

  sendServerToPlayerAmbientMusicChangeTrack(playerId: number, day: boolean, track: number): boolean {
    this.internal.createWriteMessage(8);
    this.internal.writeBOOL(day);
    this.internal.writeDWORD(track);
    return this.finishSend(playerId, PlayerServerMessageId.Ambient, AmbientMessageMinor.MusicChangeTrack);
  }

  sendServerToPlayerAmbientBattleMusicPlay(playerId: number, play: boolean): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeBOOL(play);
    return this.finishSend(playerId, PlayerServerMessageId.Ambient, AmbientMessageMinor.BattleMusicPlay);
  }

  sendServerToPlayerAmbientBattleMusicChange(playerId: number, track: number): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeDWORD(track);
    return this.finishSend(playerId, PlayerServerMessageId.Ambient, AmbientMessageMinor.BattleMusicChange);
  }

  sendServerToPlayerAmbientSoundLoopPlay(playerId: number, play: boolean): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeBOOL(play);
    return this.finishSend(playerId, PlayerServerMessageId.Ambient, AmbientMessageMinor.SoundLoopPlay);
  }

  sendServerToPlayerAmbientSoundLoopChange(playerId: number, day: boolean, track: number): boolean {
    this.internal.createWriteMessage(8);
    this.internal.writeBOOL(day);
    this.internal.writeDWORD(track);
    return this.finishSend(playerId, PlayerServerMessageId.Ambient, AmbientMessageMinor.SoundLoopChange);
  }

  sendServerToPlayerAmbientSoundVolumeChange(playerId: number, day: boolean, volume: number): boolean {
    this.internal.createWriteMessage(8);
    this.internal.writeBOOL(day);
    this.internal.writeDWORD(volume);
    return this.finishSend(playerId, PlayerServerMessageId.Ambient, AmbientMessageMinor.SoundVolume);
  }

  // ---------------------------------------------------------------------------
  // GuiTiming / LoadBar / CustomToken / PopUp / Sound
  // ---------------------------------------------------------------------------

  sendServerToPlayerGuiTimingEvent(playerId: number, active: boolean, duration?: number, eventType?: number): boolean {
    this.internal.createWriteMessage(9);
    this.internal.writeBOOL(active);
    if (active) {
      this.internal.writeDWORD(duration ?? 0);
      this.internal.writeBYTE(eventType ?? 0);
    }
    return this.finishSend(playerId, PlayerServerMessageId.GuiTimingEvent, GuiTimingMessageMinor.Info);
  }

  sendServerToPlayerLoadBar_StartStallEvent(stallId: number): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeDWORD(stallId);
    return this.finishSend(PLAYER_ID_ALL, PlayerServerMessageId.LoadBar, LoadBarMessageMinor.StartStallEvent);
  }

  sendServerToPlayerLoadBar_UpdateStallEvent(stallId: number, progress: number): boolean {
    this.internal.createWriteMessage(8);
    this.internal.writeDWORD(stallId);
    this.internal.writeDWORD(progress);
    return this.finishSend(PLAYER_ID_ALL, PlayerServerMessageId.LoadBar, LoadBarMessageMinor.UpdateStallEvent);
  }

  sendServerToPlayerLoadBar_EndStallEvent(stallId: number, result: number): boolean {
    this.internal.createWriteMessage(8);
    this.internal.writeDWORD(stallId);
    this.internal.writeDWORD(result);
    return this.finishSend(PLAYER_ID_ALL, PlayerServerMessageId.LoadBar, LoadBarMessageMinor.EndStallEvent);
  }

  sendServerToPlayerSetCustomToken(playerId: number, tokenNumber: number, value: string): boolean {
    this.internal.createWriteMessage(64);
    this.internal.writeDWORD(tokenNumber);
    this.internal.writeCExoString(value);
    return this.finishSend(playerId, PlayerServerMessageId.CustomToken, CustomTokenMessageMinor.SetToken);
  }

  /** Skips tokens < 10 like. */
  sendServerToPlayerSetCustomTokenList(playerId: number, tokens: CustomTokenEntry[]): boolean {
    const filtered = tokens.filter((t) => t.number >= 10);
    this.internal.createWriteMessage(256);
    this.internal.writeDWORD(filtered.length);
    for (const t of filtered) {
      this.internal.writeDWORD(t.number);
      this.internal.writeCExoString(t.value);
    }
    return this.finishSend(playerId, PlayerServerMessageId.CustomToken, CustomTokenMessageMinor.SetTokenList);
  }

  /**
   *
   * guiIndex 0 → minor 1 (death panel); guiIndex 1 → minor 3 (string panel).
   */
  sendServerToPlayerPopUpGUIPanel(
    playerId: number,
    guiIndex: number,
    opts: {
      respawnButtonActive?: boolean;
      waitForHelpButtonActive?: boolean;
      helpStringRef?: number;
      helpString?: string;
      message?: string;
    } = {}
  ): boolean {
    if (guiIndex === 0) {
      this.internal.createWriteMessage(64);
      this.internal.writeBOOL(opts.respawnButtonActive ?? false);
      this.internal.writeBOOL(opts.waitForHelpButtonActive ?? false);
      this.internal.writeDWORD(opts.helpStringRef ?? 0xffffffff);
      this.internal.writeCExoString(opts.helpString ?? "");
      return this.finishSend(playerId, PlayerServerMessageId.PopUpGUIPanel, PopUpGUIPanelMessageMinor.DeathPanel);
    }
    this.internal.createWriteMessage(32);
    this.internal.writeCExoString(opts.message ?? "");
    return this.finishSend(playerId, PlayerServerMessageId.PopUpGUIPanel, PopUpGUIPanelMessageMinor.StringPanel);
  }

  sendServerToPlayerDestroyDeathGUI(playerId: number): boolean {
    return this.sendServerToPlayerMessage(
      playerId,
      PlayerServerMessageId.PopUpGUIPanel,
      PopUpGUIPanelMessageMinor.Destroy
    );
  }

  /** — Chat major, minor 7 */
  sendServerToPlayerAIActionPlaySound(playerId: number, objectId: number, sound: string): boolean {
    this.internal.createWriteMessage(32);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeCExoString(sound);
    return this.finishSend(playerId, PlayerServerMessageId.Chat, ChatMessageMinor.PlaySound);
  }

  sendServerToPlayerSoundObject_Play(playerId: number, objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.Sound, SoundMessageMinor.Play);
  }

  sendServerToPlayerSoundObject_Stop(playerId: number, objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.Sound, SoundMessageMinor.Stop);
  }

  sendServerToPlayerSoundObject_ChangePosition(playerId: number, objectId: number, pos: MessageVector3): boolean {
    this.internal.createWriteMessage(16);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeFLOAT(pos.x);
    this.internal.writeFLOAT(pos.y);
    this.internal.writeFLOAT(pos.z);
    return this.finishSend(playerId, PlayerServerMessageId.Sound, SoundMessageMinor.ChangePosition);
  }

  // ---------------------------------------------------------------------------
  // Login / Module / Area / Status / Party / PlayerList
  // ---------------------------------------------------------------------------

  sendServerToPlayerLogin_Confirm(playerId: number): boolean {
    return this.sendServerToPlayerMessage(playerId, PlayerServerMessageId.Login, LoginMessageMinor.Confirm);
  }

  sendServerToPlayerLogin_NeedCharacter(playerId: number): boolean {
    return this.sendServerToPlayerMessage(playerId, PlayerServerMessageId.Login, LoginMessageMinor.NeedCharacter);
  }

  sendServerToPlayerLogin_CharacterQuery(
    playerId: number,
    entries: { value: number; flag: number }[],
    trailing: number
  ): boolean {
    this.internal.createWriteMessage(64);
    this.internal.writeBYTE(entries.length & 0xff);
    for (const e of entries) {
      this.internal.writeDWORD(e.value);
      this.internal.writeBYTE(e.flag & 0xff);
    }
    this.internal.writeDWORD(trailing);
    return this.finishSend(playerId, PlayerServerMessageId.Login, LoginMessageMinor.CharacterQuery);
  }

  /**
   * — body from PackModuleIntoMessage (packer; pass opaque blob until packer ported).
   */
  sendServerToPlayerModule_Info(playerId: number, packedModule: Uint8Array): boolean {
    this.internal.createWriteMessage(packedModule.length);
    this.internal.writeVOIDPtr(packedModule);
    return this.finishSend(playerId, PlayerServerMessageId.Module, ModuleMessageMinor.Info);
  }

  sendServerToPlayerModule_Loading(playerId: number): boolean {
    return this.sendServerToPlayerMessage(playerId, PlayerServerMessageId.Module, ModuleMessageMinor.Loading);
  }

  sendServerToPlayerModule_SaveGameStatus(playerId: number, status: number): boolean {
    this.internal.createWriteMessage(1);
    this.internal.writeBYTE(status & 0xff);
    return this.finishSend(playerId, PlayerServerMessageId.Module, ModuleMessageMinor.SaveGameStatus);
  }

  /**
   * — is local-only (SetPauseState); no net stamp.
   * Documented for API parity; returns true without sending.
   */
  sendServerToPlayerModule_SetPauseState(_pauseType: number, _paused: number): boolean {
    return true;
  }

  /** — body from PackCreatureIntoMessage */
  sendServerToPlayerModule_ExportReply(playerId: number, packedCreature: Uint8Array): boolean {
    this.internal.createWriteMessage(packedCreature.length);
    this.internal.writeVOIDPtr(packedCreature);
    return this.finishSend(playerId, PlayerServerMessageId.Module, ModuleMessageMinor.ExportReply);
  }

  sendServerToPlayerModule_StartStartNewModule(playerId: number): boolean {
    return this.sendServerToPlayerMessage(playerId, PlayerServerMessageId.Module, ModuleMessageMinor.StartStartNewModule);
  }

  sendServerToPlayerModule_EndStartNewModule(playerId: number, success: boolean): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeBOOL(success);
    return this.finishSend(playerId, PlayerServerMessageId.Module, ModuleMessageMinor.EndStartNewModule);
  }

  sendServerToPlayerModule_DumpPlayer(playerId: number): boolean {
    return this.sendServerToPlayerMessage(playerId, PlayerServerMessageId.Module, ModuleMessageMinor.DumpPlayer);
  }

  /**
   *
   * flags bitfield: &1 time-of-day, &2 calendar day, &4 year, &8 hour, &0x10 milliseconds
   */
  sendServerToPlayerModuleUpdate_Time(
    playerId: number,
    flags: number,
    data: {
      timeOfDayMode?: number;
      pauseDay?: number;
      calendarDay?: number;
      year?: number;
      hour?: number;
      milliseconds?: number;
    } = {}
  ): boolean {
    this.internal.createWriteMessage(24);
    this.internal.writeBYTE(flags & 0xff);
    if (flags & 1) {
      this.internal.writeBYTE(data.timeOfDayMode ?? 0);
      if ((data.timeOfDayMode ?? 0) === 3 || (data.timeOfDayMode ?? 0) === 4) {
        this.internal.writeDWORD(data.pauseDay ?? 0);
      }
    }
    if (flags & 2) this.internal.writeBYTE(data.calendarDay ?? 0);
    if (flags & 4) this.internal.writeBYTE(data.year ?? 0);
    if (flags & 8) this.internal.writeBYTE(data.hour ?? 0);
    if (flags & 0x10) this.internal.writeDWORD(data.milliseconds ?? 0);
    return this.finishSend(playerId, PlayerServerMessageId.Module, ModuleMessageMinor.UpdateTime);
  }

  /**
   * — header fields then PackAreaIntoMessage blob.
   */
  sendServerToPlayerArea_ClientArea(
    playerId: number,
    loadScreen: number,
    floats: [number, number, number, number],
    flag: boolean,
    packedArea: Uint8Array
  ): boolean {
    this.internal.createWriteMessage(32 + packedArea.length);
    this.internal.writeBYTE(loadScreen & 0xff);
    for (const f of floats) this.internal.writeFLOAT(f);
    this.internal.writeBOOL(flag);
    this.internal.writeVOIDPtr(packedArea);
    return this.finishSend(playerId, PlayerServerMessageId.Area, AreaMessageMinor.ClientArea);
  }

  sendServerToPlayerArea_VisualEffect(playerId: number, vfx: number, pos: MessageVector3): boolean {
    this.internal.createWriteMessage(14);
    this.internal.writeWORD(vfx & 0xffff);
    this.internal.writeFLOAT(pos.x);
    this.internal.writeFLOAT(pos.y);
    this.internal.writeFLOAT(pos.z);
    return this.finishSend(playerId, PlayerServerMessageId.Area, AreaMessageMinor.VisualEffect);
  }

  sendServerToPlayerArea_Weather(playerId: number, weather: number, start: boolean): boolean {
    this.internal.createWriteMessage(5);
    this.internal.writeBYTE(weather & 0xff);
    this.internal.writeBOOL(start);
    return this.finishSend(playerId, PlayerServerMessageId.Area, AreaMessageMinor.Weather);
  }

  /** — empty payload; mode selects minor 1/2/3 */
  sendServerToPlayerServerStatus_Status(playerId: number, mode: number): boolean {
    const minor =
      mode === 0
        ? ServerStatusMessageMinor.StatusMode0
        : mode === 2
          ? ServerStatusMessageMinor.StatusMode2
          : ServerStatusMessageMinor.StatusMode1;
    return this.sendServerToPlayerMessage(playerId, PlayerServerMessageId.ServerStatus, minor);
  }

  sendServerToPlayerParty_List(playerId: number, objectIds: number[], minor: number = 1): boolean {
    this.internal.createWriteMessage(4 + objectIds.length * 4);
    this.internal.writeDWORD(objectIds.length);
    for (const id of objectIds) this.writeOBJECTIDServer(id);
    return this.finishSend(playerId, PlayerServerMessageId.Party, minor);
  }

  protected writePlayerListEntry(e: PlayerListEntry): void {
    this.internal.writeDWORD(e.playerId);
    this.writeOBJECTIDServer(e.objectId);
    this.internal.writeCExoString(e.playerName);
    this.internal.writeBOOL(e.isDM);
    if (e.isDM) this.writeOBJECTIDServer(e.communityNameObjectId ?? OBJECT_INVALID);
    this.writeLocStringServer(e.firstName);
    this.writeLocStringServer(e.lastName);
    this.internal.writeWORD(e.portraitId & 0xffff);
    if (e.portraitId > 0xfffd) {
      this.internal.writeCResRef(e.portraitResRef ?? "", 16);
    }
  }

  sendServerToPlayerPlayerList_Add(playerId: number, entry: PlayerListEntry): boolean {
    this.internal.createWriteMessage(128);
    this.writePlayerListEntry(entry);
    return this.finishSend(playerId, PlayerServerMessageId.PlayerList, PlayerListMessageMinor.Add);
  }

  sendServerToPlayerPlayerList_Delete(playerId: number, targetPlayerId: number): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeDWORD(targetPlayerId);
    return this.finishSend(playerId, PlayerServerMessageId.PlayerList, PlayerListMessageMinor.Delete);
  }

  sendServerToPlayerPlayerList_All(playerId: number, entries: PlayerListEntry[]): boolean {
    this.internal.createWriteMessage(256);
    this.internal.writeBYTE(entries.length & 0xff);
    for (const e of entries) this.writePlayerListEntry(e);
    return this.finishSend(playerId, PlayerServerMessageId.PlayerList, PlayerListMessageMinor.All);
  }

  // ---------------------------------------------------------------------------
  // Inventory / Journal / LevelUp / MapPin / Cheat
  // ---------------------------------------------------------------------------

  sendServerToPlayerInventory_Drop(playerId: number, objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.Inventory, InventoryMessageMinor.Drop);
  }

  sendServerToPlayerInventory_DropCancel(playerId: number, objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.Inventory, InventoryMessageMinor.DropCancel);
  }

  sendServerToPlayerInventory_EquipCancel(playerId: number, objectId: number, slot: number): boolean {
    this.internal.createWriteMessage(8);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeDWORD(slot);
    return this.finishSend(playerId, PlayerServerMessageId.Inventory, InventoryMessageMinor.EquipCancel);
  }

  sendServerToPlayerInventory_Pickup(playerId: number, objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.Inventory, InventoryMessageMinor.Pickup);
  }

  sendServerToPlayerInventory_PickupCancel(playerId: number, objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.Inventory, InventoryMessageMinor.PickupCancel);
  }

  sendServerToPlayerInventory_Unequip(playerId: number, objectId: number, success: boolean): boolean {
    this.internal.createWriteMessage(8);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeBOOL(success);
    return this.finishSend(playerId, PlayerServerMessageId.Inventory, InventoryMessageMinor.Unequip);
  }

  sendServerToPlayerInventory_UnequipCancel(playerId: number, objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.Inventory, InventoryMessageMinor.UnequipCancel);
  }

  sendServerToPlayerInventory_LearnScroll(
    playerId: number,
    objectId: number,
    minor: number = InventoryMessageMinor.LearnScroll
  ): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.Inventory, minor);
  }

  sendServerToPlayerJournalAddQuest(
    playerId: number,
    data: {
      name: MessageLocString;
      description: MessageLocString;
      int0: number;
      int1: number;
      plotId: string;
      state: number;
      priority: number;
      picture: number;
      completed: boolean;
      int2: number;
      int3: number;
      int4: number;
    }
  ): boolean {
    this.internal.createWriteMessage(128);
    this.writeLocStringServer(data.name);
    this.writeLocStringServer(data.description);
    this.internal.writeDWORD(data.int0);
    this.internal.writeDWORD(data.int1);
    this.internal.writeCExoString(data.plotId);
    this.internal.writeDWORD(data.state);
    this.internal.writeDWORD(data.priority);
    this.internal.writeWORD(data.picture & 0xffff);
    this.internal.writeBOOL(data.completed);
    this.internal.writeDWORD(data.int2);
    this.internal.writeDWORD(data.int3);
    this.internal.writeDWORD(data.int4);
    return this.finishSend(playerId, PlayerServerMessageId.Journal, JournalMessageMinor.AddQuest);
  }

  sendServerToPlayerJournalRemoveQuest(playerId: number, plotId: string): boolean {
    this.internal.createWriteMessage(32);
    this.internal.writeCExoString(plotId);
    return this.finishSend(playerId, PlayerServerMessageId.Journal, JournalMessageMinor.RemoveQuest);
  }

  sendServerToPlayerJournalAddWorldStrref(playerId: number, a: number, b: number, c: number, d: number): boolean {
    this.internal.createWriteMessage(16);
    this.internal.writeDWORD(a);
    this.internal.writeDWORD(b);
    this.internal.writeDWORD(c);
    this.internal.writeDWORD(d);
    return this.finishSend(playerId, PlayerServerMessageId.Journal, JournalMessageMinor.AddWorldStrref);
  }

  sendServerToPlayerJournalDeleteWorld(playerId: number, id: number): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeDWORD(id);
    return this.finishSend(playerId, PlayerServerMessageId.Journal, JournalMessageMinor.DeleteWorld);
  }

  sendServerToPlayerJournalDeleteWorldStrref(playerId: number, strref: number): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeDWORD(strref);
    return this.finishSend(playerId, PlayerServerMessageId.Journal, JournalMessageMinor.DeleteWorldStrref);
  }

  sendServerToPlayerJournalDeleteWorldAll(playerId: number): boolean {
    this.internal.createWriteMessage(1);
    this.internal.writeBYTE(1);
    return this.finishSend(playerId, PlayerServerMessageId.Journal, JournalMessageMinor.DeleteWorldAll);
  }

  sendServerToPlayerJournalFullUpdateNotNeeded(playerId: number, needed: boolean): boolean {
    this.internal.createWriteMessage(12);
    if (!needed) {
      this.internal.writeBOOL(0);
    } else {
      this.internal.writeBOOL(1);
      this.internal.writeBOOL(1);
      this.internal.writeDWORD(0);
    }
    return this.finishSend(playerId, PlayerServerMessageId.Journal, JournalMessageMinor.FullUpdateNotNeeded);
  }

  sendServerToPlayerJournalUpdated(
    playerId: number,
    text: MessageLocString,
    completed: boolean,
    shown: boolean
  ): boolean {
    this.internal.createWriteMessage(64);
    this.writeLocStringServer(text);
    this.internal.writeBOOL(completed);
    this.internal.writeBOOL(shown);
    return this.finishSend(playerId, PlayerServerMessageId.Journal, JournalMessageMinor.Updated);
  }

  /** — full journal blob (PackJournal / FullUpdate minor 1) */
  sendServerToPlayerJournalFullUpdate(playerId: number, packed: Uint8Array): boolean {
    this.internal.createWriteMessage(packed.length);
    this.internal.writeVOIDPtr(packed);
    return this.finishSend(playerId, PlayerServerMessageId.Journal, JournalMessageMinor.FullUpdate);
  }

  sendServerToPlayerLevelUp_Confirmation(playerId: number, ok: boolean): boolean {
    return this.sendServerToPlayerMessage(
      playerId,
      PlayerServerMessageId.LevelUp,
      ok ? LevelUpMessageMinor.ConfirmationOk : LevelUpMessageMinor.ConfirmationFail
    );
  }

  sendServerToPlayerMapPinEnabled(playerId: number, objectId: number, enabled: boolean): boolean {
    this.internal.createWriteMessage(8);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeBOOL(enabled);
    return this.finishSend(playerId, PlayerServerMessageId.MapPin, MapPinMessageMinor.Enabled);
  }

  sendServerToPlayerMapPinAdded(
    playerId: number,
    pos: MessageVector3,
    note: string,
    id: number
  ): boolean {
    this.internal.createWriteMessage(32);
    this.internal.writeFLOAT(pos.x);
    this.internal.writeFLOAT(pos.y);
    this.internal.writeFLOAT(pos.z);
    this.internal.writeCExoString(note);
    this.internal.writeDWORD(id);
    return this.finishSend(playerId, PlayerServerMessageId.MapPin, MapPinMessageMinor.Added);
  }

  sendServerToPlayerCheatDebugMode(playerId: number, enabled: boolean): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeBOOL(enabled);
    return this.finishSend(playerId, PlayerServerMessageId.Cheat, CheatMessageMinor.DebugMode);
  }

  sendServerToPlayerCheatNasty(playerId: number, objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.Cheat, CheatMessageMinor.Nasty);
  }

  // ---------------------------------------------------------------------------
  // SafeProjectile / Chat / QuickChat / CC
  // ---------------------------------------------------------------------------

  sendServerToPlayerSafeProjectileProjectile(
    playerId: number,
    data: {
      oid0: number;
      oid1: number;
      origin: MessageVector3;
      target: MessageVector3;
      spellId: number;
      projectilePath: number;
      projectileModel: number;
      byte0: number;
      byte1: number;
      unused: number;
    }
  ): boolean {
    this.internal.createWriteMessage(48);
    this.writeOBJECTIDServer(data.oid0);
    this.writeOBJECTIDServer(data.oid1);
    this.internal.writeVector(data.origin);
    this.internal.writeVector(data.target);
    this.internal.writeDWORD(data.spellId);
    this.internal.writeBYTE(data.projectilePath & 0xff);
    this.internal.writeDWORD(data.projectileModel);
    this.internal.writeBYTE(data.byte0 & 0xff);
    this.internal.writeBYTE(data.byte1 & 0xff);
    this.internal.writeDWORD(data.unused);
    return this.finishSend(playerId, PlayerServerMessageId.SafeProjectile, SafeProjectileMessageMinor.Projectile);
  }

  sendServerToPlayerSafeProjectileSpell(
    playerId: number,
    data: {
      oid0: number;
      oid1: number;
      floats: [number, number, number, number, number, number];
      spellId: number;
      type: number;
      dword0: number;
      dword1: number;
      extraDWORD?: number;
      bytes?: [number, number, number];
    }
  ): boolean {
    this.internal.createWriteMessage(48);
    this.writeOBJECTIDServer(data.oid0);
    this.writeOBJECTIDServer(data.oid1);
    for (const f of data.floats) this.internal.writeFLOAT(f);
    this.internal.writeDWORD(data.spellId);
    this.internal.writeBYTE(data.type & 0xff);
    this.internal.writeDWORD(data.dword0);
    this.internal.writeDWORD(data.dword1);
    if (data.type === 6 || data.type === 7) {
      this.internal.writeDWORD(data.extraDWORD ?? 0);
    } else {
      const b = data.bytes ?? [0, 0, 0];
      this.internal.writeBYTE(b[0]);
      this.internal.writeBYTE(b[1]);
      this.internal.writeBYTE(b[2]);
    }
    return this.finishSend(playerId, PlayerServerMessageId.SafeProjectile, SafeProjectileMessageMinor.Spell);
  }

  sendServerToPlayerChat_Talk(playerId: number, speakerId: number, text: string): boolean {
    this.internal.createWriteMessage(32);
    this.writeOBJECTIDServer(speakerId);
    this.internal.writeCExoString(text);
    return this.finishSend(playerId, PlayerServerMessageId.Chat, ChatMessageMinor.Talk);
  }

  sendServerToPlayerChat_Whisper(playerId: number, speakerId: number, text: string): boolean {
    this.internal.createWriteMessage(32);
    this.writeOBJECTIDServer(speakerId);
    this.internal.writeCExoString(text);
    return this.finishSend(playerId, PlayerServerMessageId.Chat, ChatMessageMinor.Whisper);
  }

  sendServerToPlayerChat_ServerTell(playerId: number, text: string): boolean {
    this.internal.createWriteMessage(32);
    this.internal.writeCExoString(text);
    return this.finishSend(playerId, PlayerServerMessageId.Chat, ChatMessageMinor.ServerTell);
  }

  protected writeChatWithLoc(
    playerId: number,
    minor: number,
    speakerId: number,
    text: string,
    pos: MessageVector3,
    loc0: MessageLocString,
    loc1: MessageLocString
  ): boolean {
    this.internal.createWriteMessage(96);
    this.writeOBJECTIDServer(speakerId);
    this.internal.writeCExoString(text);
    this.internal.writeFLOAT(pos.x);
    this.internal.writeFLOAT(pos.y);
    this.internal.writeFLOAT(pos.z);
    this.writeLocStringServer(loc0);
    this.writeLocStringServer(loc1);
    return this.finishSend(playerId, PlayerServerMessageId.Chat, minor);
  }

  sendServerToPlayerChat_Party(
    playerId: number,
    speakerId: number,
    text: string,
    pos: MessageVector3,
    loc0: MessageLocString,
    loc1: MessageLocString
  ): boolean {
    return this.writeChatWithLoc(playerId, ChatMessageMinor.Party, speakerId, text, pos, loc0, loc1);
  }

  sendServerToPlayerChat_Tell(
    playerId: number,
    speakerId: number,
    text: string,
    pos: MessageVector3,
    loc0: MessageLocString,
    loc1: MessageLocString
  ): boolean {
    return this.writeChatWithLoc(playerId, ChatMessageMinor.Tell, speakerId, text, pos, loc0, loc1);
  }

  sendServerToPlayerChat_Shout(
    playerId: number,
    speakerId: number,
    text: string,
    pos: MessageVector3,
    loc0: MessageLocString,
    loc1: MessageLocString
  ): boolean {
    return this.writeChatWithLoc(playerId, ChatMessageMinor.Shout, speakerId, text, pos, loc0, loc1);
  }

  sendServerToPlayerChat_StrRef(playerId: number, speakerId: number, strRef: number, minor: number): boolean {
    this.internal.createWriteMessage(8);
    this.writeOBJECTIDServer(speakerId);
    this.internal.writeDWORD(strRef);
    return this.finishSend(playerId, PlayerServerMessageId.Chat, minor);
  }

  sendServerToPlayerQuickChat(playerId: number, objectId: number, chatId: number): boolean {
    this.internal.createWriteMessage(6);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeWORD(chatId & 0xffff);
    return this.finishSend(playerId, PlayerServerMessageId.QuickChat, QuickChatMessageMinor.Play);
  }

  /**
   * — structured CC feedback.
   * Accepts pre-built integers/objectIds/strings matching client layout.
   */
  sendServerToPlayerCCMessage(playerId: number, minor: number, data: CCMessageData): boolean {
    const ints = data.integers ?? [];
    const oids = data.objectIds ?? [];
    const strs = data.strings ?? [];

    switch (minor) {
      case 1:
        this.internal.createWriteMessage(8);
        this.writeOBJECTIDServer(oids[0] ?? OBJECT_INVALID);
        this.internal.writeDWORD(ints[0] ?? 0);
        break;
      case 2:
        this.internal.createWriteMessage(6);
        this.writeOBJECTIDServer(oids[0] ?? OBJECT_INVALID);
        for (let i = 0; i < 0xf; i++) {
          const v = ints[i] ?? -1;
          if (v < 0) this.internal.writeBOOL(0);
          else {
            this.internal.writeBOOL(1);
            this.internal.writeWORD(v & 0xffff);
          }
        }
        break;
      case 5:
      case 6:
        return this.sendServerToPlayerMessage(playerId, PlayerServerMessageId.ClientSideMessage, minor);
      case 0x12:
        this.internal.createWriteMessage(0x2a);
        this.writeOBJECTIDServer(oids[0] ?? OBJECT_INVALID);
        this.writeOBJECTIDServer(oids[1] ?? OBJECT_INVALID);
        this.internal.writeDWORD(ints[0] ?? 0);
        this.internal.writeWORD((ints[1] ?? 0) & 0xffff);
        for (let i = 2; i <= 8; i++) this.internal.writeDWORD(ints[i] ?? 0);
        this.internal.writeBOOL(ints[9] ?? 0);
        this.internal.writeBOOL(ints[10] ?? 0);
        this.internal.writeBOOL(ints[11] ?? 0);
        break;
      default: {
        // Generic: write provided VOID payload if present, else empty structured dump
        this.internal.createWriteMessage(64);
        for (const id of oids) this.writeOBJECTIDServer(id);
        for (const n of ints) this.internal.writeDWORD(n);
        for (const s of strs) this.internal.writeCExoString(s);
        break;
      }
    }
    return this.finishSend(playerId, PlayerServerMessageId.ClientSideMessage, minor);
  }

  // ---------------------------------------------------------------------------
  // Remaining Sends (Download, SaveLoad, ShutDown, Examine, Debug, Voice, etc.)
  // ---------------------------------------------------------------------------

  /** — minor 2; packed creature blob from PackCreatureIntoMessage */
  sendServerToPlayerCharacterDownloadReply(playerId: number, packed: Uint8Array): boolean {
    this.internal.createWriteMessage(packed.length);
    this.internal.writeVOIDPtr(packed);
    return this.finishSend(playerId, PlayerServerMessageId.CharacterDownload, CharacterDownloadMessageMinor.Reply);
  }

  /** — minor 3 */
  sendServerToPlayerCharacterDownloadFail(playerId: number, resref: string, isType4: boolean): boolean {
    this.internal.createWriteMessage(32);
    this.internal.writeCExoString(resref);
    this.internal.writeBOOL(isType4);
    return this.finishSend(playerId, PlayerServerMessageId.CharacterDownload, CharacterDownloadMessageMinor.Fail);
  }

  sendServerToPlayerSaveLoad_Status(playerId: number, status: number, value: number = 0): boolean {
    this.internal.createWriteMessage(5);
    this.internal.writeBYTE(status & 0xff);
    this.internal.writeDWORD(value);
    return this.finishSend(playerId, PlayerServerMessageId.SaveLoad, SaveLoadMessageMinor.Status);
  }

  sendServerToPlayerShutDownServer(playerId: number, reason: number = 0): boolean {
    this.internal.createWriteMessage(4);
    this.internal.writeDWORD(reason);
    return this.finishSend(playerId, PlayerServerMessageId.ShutDownServer, ShutDownServerMessageMinor.ShutDown);
  }

  sendServerToPlayerVoiceChat_Play(playerId: number, objectId: number, soundSet: number): boolean {
    this.internal.createWriteMessage(8);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeBYTE(soundSet & 0xff);
    return this.finishSend(playerId, PlayerServerMessageId.VoiceChat, VoiceChatMessageMinor.Play);
  }

  sendServerToPlayerGuiContainerObject_Open(playerId: number, objectId: number, dword: number = 0): boolean {
    this.internal.createWriteMessage(8);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeDWORD(dword);
    return this.finishSend(playerId, PlayerServerMessageId.GuiContainer, GuiContainerMessageMinor.Open);
  }

  sendServerToPlayerGUICharacterSheet_NotPermitted(playerId: number): boolean {
    return this.sendServerToPlayerMessage(
      playerId,
      PlayerServerMessageId.GuiCharacterSheet,
      GuiCharacterSheetMessageMinor.NotPermitted
    );
  }

  /** — GuiInfoPopup Creature */
  sendServerToPlayerExamineGui_CreatureData(
    playerId: number,
    data: {
      objectId: number;
      description: MessageLocString;
      firstName: MessageLocString;
      lastName: MessageLocString;
      portraitId: number;
      portraitResRef?: string;
      damageLevel: number;
      reputation: number;
      levelOrCR: number;
    }
  ): boolean {
    this.internal.createWriteMessage(128);
    this.writeOBJECTIDServer(data.objectId);
    this.writeLocStringServer(data.description);
    this.internal.writeBOOL(1);
    this.writeLocStringServer(data.firstName);
    this.writeLocStringServer(data.lastName);
    this.internal.writeWORD(data.portraitId & 0xffff);
    if (data.portraitId > 0xfffd) this.internal.writeCResRef(data.portraitResRef ?? "", 16);
    this.internal.writeBYTE(data.damageLevel & 0xff);
    this.internal.writeBYTE(data.reputation & 0xff);
    this.internal.writeFLOAT(data.levelOrCR);
    return this.finishSend(playerId, PlayerServerMessageId.GuiInfoPopup, GuiInfoPopupMessageMinor.Creature);
  }

  /**
   * — structured Item examine (active props as triples).
   */
  sendServerToPlayerExamineGui_ItemData(
    playerId: number,
    data: {
      objectId: number;
      valid: boolean;
      canUse?: boolean;
      description?: MessageLocString;
      meetsMinLevel?: boolean;
      minLevel?: number;
      charges?: number;
      weight?: number;
      activeProps?: { w0: number; w1: number; w2: number; b: number }[];
      propCount?: number;
    }
  ): boolean {
    this.internal.createWriteMessage(128);
    if (!data.valid) {
      this.writeOBJECTIDServer(OBJECT_INVALID);
    } else {
      this.writeOBJECTIDServer(data.objectId);
      this.internal.writeBOOL(1);
      this.internal.writeBOOL(data.canUse ?? false);
      this.writeLocStringServer(data.description ?? { isStrRef: false, text: "" });
      this.internal.writeBOOL(data.meetsMinLevel ?? true);
      if (!(data.meetsMinLevel ?? true)) this.internal.writeBYTE(data.minLevel ?? 0);
      this.internal.writeDWORD(data.charges ?? 0);
      this.internal.writeDWORD(data.weight ?? 0);
      const props = data.activeProps ?? [];
      this.internal.writeWORD(data.propCount ?? props.length);
      for (const p of props) {
        this.internal.writeWORD(p.w0 & 0xffff);
        this.internal.writeWORD(p.w1 & 0xffff);
        this.internal.writeWORD(p.w2 & 0xffff);
        this.internal.writeBYTE(p.b & 0xff);
      }
    }
    return this.finishSend(playerId, PlayerServerMessageId.GuiInfoPopup, GuiInfoPopupMessageMinor.Item);
  }

  /** — placeable/door examine */
  sendServerToPlayerExamineGui_PlaceableOrDoorData(
    playerId: number,
    minor: number,
    objectId: number,
    description: MessageLocString
  ): boolean {
    this.internal.createWriteMessage(64);
    this.writeOBJECTIDServer(objectId);
    this.writeLocStringServer(description);
    return this.finishSend(playerId, PlayerServerMessageId.GuiInfoPopup, minor);
  }

  sendServerToPlayerExamineGui_MineData(
    playerId: number,
    objectId: number,
    flag: boolean,
    trapType: number,
    difficultyBand: number
  ): boolean {
    this.internal.createWriteMessage(8);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeBOOL(flag);
    this.internal.writeBYTE(trapType & 0xff);
    this.internal.writeBYTE(difficultyBand & 0xff);
    return this.finishSend(playerId, PlayerServerMessageId.GuiInfoPopup, GuiInfoPopupMessageMinor.Mine);
  }

  /** — CharList minor 2 */
  sendServerToPlayerCharList(
    playerId: number,
    characters: {
      firstName: MessageLocString;
      lastName: MessageLocString;
      resref: string;
      type: number;
      portraitId: number;
      portraitResRef: string;
      classes: { classId: number; level: number }[];
    }[]
  ): boolean {
    this.internal.createWriteMessage(256);
    this.internal.writeWORD(characters.length & 0xffff);
    for (const c of characters) {
      this.writeLocStringServer(c.firstName);
      this.writeLocStringServer(c.lastName);
      this.internal.writeCResRef(c.resref, 16);
      this.internal.writeBYTE(c.type & 0xff);
      this.internal.writeWORD(c.portraitId & 0xffff);
      this.internal.writeCResRef(c.portraitResRef, 16);
      this.internal.writeBYTE(c.classes.length & 0xff);
      for (const cl of c.classes) {
        this.internal.writeDWORD(cl.classId);
        this.internal.writeBYTE(cl.level & 0xff);
      }
    }
    return this.finishSend(playerId, PlayerServerMessageId.CharList, CharListMessageMinor.List);
  }

  /**
   * — CharList minor 4; accepts pre-serialized BIC blob (builds via GFF).
   */
  sendServerToPlayerUpdateCharResponse(
    playerId: number,
    responseType: number,
    resref: string,
    bicData: Uint8Array
  ): boolean {
    this.internal.createWriteMessage(32 + bicData.length);
    this.internal.writeBYTE(responseType & 0xff);
    this.internal.writeCResRef(resref, 16);
    this.internal.writeDWORD(bicData.length);
    this.internal.writeVOIDPtr(bicData);
    return this.finishSend(playerId, PlayerServerMessageId.CharList, 4);
  }

  /**
   * — Chat MultiLang helper (minor 0x0b or 0x0c).
   */
  sendServerToPlayerChatMultiLang_Helper(
    playerId: number,
    speakerId: number,
    targetId: number,
    text: MessageLocString,
    soundResRef: string,
    soundObjectId: number,
    dword: number,
    partyChat: boolean
  ): boolean {
    this.internal.createWriteMessage(0x28);
    this.writeOBJECTIDServer(speakerId);
    this.writeOBJECTIDServer(targetId);
    this.writeLocStringServer(text);
    this.internal.writeCResRef(soundResRef, 16);
    this.writeOBJECTIDServer(soundObjectId);
    this.internal.writeDWORD(dword);
    const minor = partyChat ? 0x0c : 0x0b;
    return this.finishSend(playerId, PlayerServerMessageId.Chat, minor);
  }

  /** — DebugInfo Creature (simplified field bag; repo/equip lists as strings). */
  sendServerToPlayerDebugInfo_Creature(
    playerId: number,
    data: {
      objectId: number;
      tag: string;
      faction: string;
      resref: string;
      w0: number;
      w1: number;
      ac: number;
      aiLevel: number;
      cr: number;
      areaTag: string;
      equipped: string[];
      repo: string[];
    }
  ): boolean {
    this.internal.createWriteMessage(256);
    this.writeOBJECTIDServer(data.objectId);
    this.internal.writeCExoString(data.tag);
    this.internal.writeCExoString(data.faction);
    this.internal.writeCResRef(data.resref, 16);
    this.internal.writeWORD(data.w0 & 0xffff);
    this.internal.writeWORD(data.w1 & 0xffff);
    this.internal.writeWORD(data.ac & 0xffff);
    this.internal.writeDWORD(data.aiLevel);
    this.internal.writeFLOAT(data.cr);
    this.internal.writeCExoString(data.areaTag);
    let mask = 0;
    for (let i = 0; i < data.equipped.length && i < 32; i++) {
      if (data.equipped[i]) mask |= 1 << i;
    }
    this.internal.writeDWORD(mask);
    for (let i = 0; i < 32; i++) {
      if (mask & (1 << i)) this.internal.writeCExoString(data.equipped[i] ?? "");
    }
    this.internal.writeDWORD(data.repo.length);
    for (const s of data.repo) this.internal.writeCExoString(s);
    return this.finishSend(playerId, PlayerServerMessageId.DebugInfo, DebugInfoMessageMinor.Creature);
  }

  sendServerToPlayerDebugInfo_Placeable(
    playerId: number,
    data: {
      objectId: number;
      name: MessageLocString;
      tag: string;
      b0: number;
      w0: number;
      b1: number;
      b2: number;
      b3: number;
      resref: string;
      faction: string;
    }
  ): boolean {
    this.internal.createWriteMessage(96);
    this.writeOBJECTIDServer(data.objectId);
    this.writeLocStringServer(data.name);
    this.internal.writeCExoString(data.tag);
    this.internal.writeBYTE(data.b0);
    this.internal.writeWORD(data.w0);
    this.internal.writeBYTE(data.b1);
    this.internal.writeBYTE(data.b2);
    this.internal.writeBYTE(data.b3);
    this.internal.writeCResRef(data.resref, 16);
    this.internal.writeCExoString(data.faction);
    return this.finishSend(playerId, PlayerServerMessageId.DebugInfo, DebugInfoMessageMinor.Placeable);
  }

  sendServerToPlayerPlayModuleCharacterListResponse(
    playerId: number,
    ok: boolean,
    creatureId: number,
    data?: {
      firstName: MessageLocString;
      lastName: MessageLocString;
      portraitId: number;
      portraitResRef?: string;
      classes: { classId: number; level: number }[];
    }
  ): boolean {
    this.internal.createWriteMessage(128);
    this.internal.writeBOOL(ok);
    this.internal.writeDWORD(creatureId);
    if (ok && data) {
      this.writeLocStringServer(data.firstName);
      this.writeLocStringServer(data.lastName);
      this.internal.writeWORD(data.portraitId & 0xffff);
      if (data.portraitId === 0xffff || data.portraitId === 0xfffe) {
        this.internal.writeCResRef(data.portraitResRef ?? "", 16);
      }
      this.internal.writeBYTE(data.classes.length & 0xff);
      for (const cl of data.classes) {
        this.internal.writeBYTE(cl.classId & 0xff);
        this.internal.writeBYTE(cl.level & 0xff);
      }
    }
    return this.finishSend(playerId, PlayerServerMessageId.PlayModuleCharacterList, 3);
  }

  sendServerToPlayerUpdateActiveItemProperties(
    playerId: number,
    objectId: number,
    byte0: number,
    mask: number,
    values: number[]
  ): boolean {
    this.internal.createWriteMessage(16);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeBYTE(byte0 & 0xff);
    this.internal.writeBYTE(mask & 0xff);
    for (let i = 0; i < 8; i++) {
      if (mask & (1 << i)) this.internal.writeBYTE((values[i] ?? 0) & 0xff);
    }
    return this.finishSend(playerId, PlayerServerMessageId.ItemProperty, 1);
  }

  sendServerToPlayerDebugInfo_Area(playerId: number, objectId: number, tag: string): boolean {
    this.internal.createWriteMessage(32);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeCExoString(tag);
    return this.finishSend(playerId, PlayerServerMessageId.DebugInfo, DebugInfoMessageMinor.Area);
  }

  sendServerToPlayerDebugInfo_Item(
    playerId: number,
    objectId: number,
    tag: string,
    passiveIds: number[]
  ): boolean {
    this.internal.createWriteMessage(64);
    this.writeOBJECTIDServer(objectId);
    this.internal.writeCExoString(tag);
    this.internal.writeDWORD(passiveIds.length);
    for (const id of passiveIds) this.internal.writeWORD(id & 0xffff);
    return this.finishSend(playerId, PlayerServerMessageId.DebugInfo, DebugInfoMessageMinor.Item);
  }

  /** Generic packed examine/debug fallback */
  sendServerToPlayerExamineGui(playerId: number, minor: number, packed: Uint8Array): boolean {
    this.internal.createWriteMessage(packed.length);
    this.internal.writeVOIDPtr(packed);
    return this.finishSend(playerId, PlayerServerMessageId.GuiInfoPopup, minor);
  }

  sendServerToPlayerDebugInfo(
    playerId: number,
    minor: DebugInfoMessageMinor,
    packed: Uint8Array
  ): boolean {
    this.internal.createWriteMessage(packed.length);
    this.internal.writeVOIDPtr(packed);
    return this.finishSend(playerId, PlayerServerMessageId.DebugInfo, minor);
  }

  /** — field-accurate VisEffect (minor 3) */
  sendServerToPlayerGameObjUpdateVisEffect(
    playerId: number,
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
  ): boolean {
    this.internal.createWriteMessage(48);
    writeVisEffect(this.internal, (id) => this.writeOBJECTIDServer(id), data);
    return this.finishSend(playerId, PlayerServerMessageId.GameObjUpdate, GameObjUpdateMessageMinor.VisEffect);
  }

  sendServerToPlayerGameObjUpdate_ObjControl(playerId: number, objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.GameObjUpdate, GameObjUpdateMessageMinor.ObjControl);
  }

  /**
   * — GameObjUpdate body.
   * Prefer writing category fragments via payload/game-obj-update.ts then passing the buffer.
   * PackAreaIntoMessage / WriteGameObjUpdate_UpdateObject still blob for full packs.
   */
  sendServerToPlayerGameObjUpdate(playerId: number, packed: Uint8Array, minor: number = GameObjUpdateMessageMinor.Update): boolean {
    this.internal.createWriteMessage(packed.length);
    this.internal.writeVOIDPtr(packed);
    return this.finishSend(playerId, PlayerServerMessageId.GameObjUpdate, minor);
  }

  /** — GameObjUpdate minor 8 */
  sendServerToPlayerItemScriptAdd(playerId: number, packed: Uint8Array): boolean {
    this.internal.createWriteMessage(packed.length);
    this.internal.writeVOIDPtr(packed);
    return this.finishSend(playerId, PlayerServerMessageId.GameObjUpdate, GameObjUpdateMessageMinor.ItemScriptAdd);
  }

  /** — minor 7 */
  sendServerPlayerItemUpdate_DestroyItem(playerId: number, objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.GameObjUpdate, GameObjUpdateMessageMinor.DestroyItem);
  }

  /** — StripEquippedItems minor 6 */
  sendServerToAllPlayersCreatureUpdate_StripEquippedItems(playerId: number, objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDServer(objectId);
    return this.finishSend(playerId, PlayerServerMessageId.GameObjUpdate, GameObjUpdateMessageMinor.StripEquippedItems);
  }

  // ---------------------------------------------------------------------------
  // HandlePlayerToServer* — read payloads, no side effects
  // ---------------------------------------------------------------------------

  handlePlayerToServerServerStatusMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.ServerStatus, minor, {});
  }

  handlePlayerToServerLoginMessage(minor: number): number {
    const payload: Record<string, unknown> = {};
    if (minor === LoginMessageMinor.LoginLocalCharacter || minor === LoginMessageMinor.LoginLocalCharacterAlt) {
      const size = this.internal.readDWORD();
      payload.size = size;
      payload.data = this.internal.readVOIDPtr(size);
    }
    return this.emitParsed(PlayerServerMessageId.Login, minor, payload);
  }

  handlePlayerToServerModuleMessage(minor: number): number {
    const payload: Record<string, unknown> = {};
    if (minor === ModuleMessageMinor.SaveGame || minor === ModuleMessageMinor.LoadGame) {
      payload.slot = this.internal.readDWORD();
      payload.name = this.internal.readCExoString();
      payload.description = this.internal.readCExoString();
    }
    return this.emitParsed(PlayerServerMessageId.Module, minor, payload);
  }

  handlePlayerToServerAreaMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.Area, minor, {});
  }

  handlePlayerToServerGameObjectUpdate(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.GameObjUpdate, minor, {
      remaining: this.internal.readBufferSize - this.internal.readIndex,
    });
  }

  handlePlayerToServerInputMessage(minor: number): number {
    const p: Record<string, unknown> = {};
    switch (minor) {
      case InputMessageMinor.WalkToWaypoint:
        p.areaId = this.readOBJECTIDServer();
        p.pos = this.internal.readVector();
        p.byte0 = this.internal.readBYTE();
        p.bool0 = this.internal.readBOOL();
        p.bool1 = this.internal.readBOOL();
        p.byte1 = this.internal.readBYTE();
        p.objectId = this.readOBJECTIDServer();
        break;
      case InputMessageMinor.Attack:
      case InputMessageMinor.ChangeDoorState:
        p.objectId = this.readOBJECTIDServer();
        p.word = this.internal.readWORD();
        break;
      case InputMessageMinor.UseSkill:
        p.skill = this.internal.readBYTE();
        p.sub = this.internal.readBYTE();
        p.objectId = this.readOBJECTIDServer();
        p.pos = this.internal.readVector();
        break;
      case InputMessageMinor.Dialog:
      case InputMessageMinor.UseObject:
        p.objectId = this.readOBJECTIDServer();
        break;
      case InputMessageMinor.UseItem: {
        p.itemId = this.readOBJECTIDServer();
        p.byte0 = this.internal.readBYTE();
        const hasSub = this.internal.readBOOL();
        p.hasSub = hasSub;
        if (hasSub) p.sub = this.internal.readBYTE();
        const hasTarget = this.internal.readBOOL();
        p.hasTarget = hasTarget;
        if (hasTarget) p.targetId = this.readOBJECTIDServer();
        const hasPos = this.internal.readBOOL();
        p.hasPos = hasPos;
        if (hasPos) p.pos = this.internal.readVector();
        break;
      }
      case InputMessageMinor.UnlockObject:
        p.objectId = this.readOBJECTIDServer();
        p.keyId = this.readOBJECTIDServer();
        break;
      case InputMessageMinor.CastSpell: {
        p.spellId = this.internal.readDWORD();
        p.b0 = this.internal.readBYTE();
        p.b1 = this.internal.readBYTE();
        p.b2 = this.internal.readBYTE();
        const flags = this.internal.readBYTE();
        p.flags = flags;
        if (flags & 1) p.targetId = this.readOBJECTIDServer();
        if (flags & 2) p.pos = this.internal.readVector();
        break;
      }
      case InputMessageMinor.GiveItem:
        p.oid0 = this.readOBJECTIDServer();
        p.oid1 = this.readOBJECTIDServer();
        p.oid2 = this.readOBJECTIDServer();
        p.amount = this.internal.readDWORD();
        break;
      case InputMessageMinor.AbortDriveControl:
      case InputMessageMinor.CancelGuiTimingEvent:
        break;
      case InputMessageMinor.DriveControl:
        // HandlePlayerToServerInputDriveControl
        p.stickX = this.internal.readFLOAT();
        p.stickY = this.internal.readFLOAT();
        p.word = this.internal.readWORD();
        p.byte0 = this.internal.readBYTE();
        p.byte1 = this.internal.readBYTE();
        break;
      default:
        break;
    }
    return this.emitParsed(PlayerServerMessageId.Input, minor, p);
  }

  handlePlayerToServerChatMessage(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === ChatMessageMinor.ServerTell) {
      p.text = this.internal.readCExoString();
    } else if (minor === ChatMessageMinor.Talk || minor === ChatMessageMinor.Whisper) {
      p.speakerId = this.readOBJECTIDServer();
      p.text = this.internal.readCExoString();
    } else if (
      minor === ChatMessageMinor.Shout ||
      minor === ChatMessageMinor.Tell ||
      minor === ChatMessageMinor.Party
    ) {
      p.speakerId = this.readOBJECTIDServer();
      p.text = this.internal.readCExoString();
      p.pos = this.internal.readVector();
      // LocStrings optional in some paths — remaining hint if underflow avoided by callers
      p.remaining = this.internal.readBufferSize - this.internal.readIndex;
    } else if (minor === ChatMessageMinor.PlaySound) {
      p.objectId = this.readOBJECTIDServer();
      p.sound = this.internal.readCExoString();
    }
    return this.emitParsed(PlayerServerMessageId.Chat, minor, p);
  }

  handlePlayerToServerParty(minor: number): number {
    const count = this.internal.readDWORD();
    const ids: number[] = [];
    for (let i = 0; i < count && !this.internal.messageReadOverflow(); i++) {
      ids.push(this.readOBJECTIDServer());
    }
    return this.emitParsed(PlayerServerMessageId.Party, minor, { objectIds: ids });
  }

  handlePlayerToServerDialogMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.Dialog, minor, {
      objectId: this.readOBJECTIDServer(),
    });
  }

  handlePlayerToServerGoldMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.Gold, minor, {
      objectId: this.readOBJECTIDServer(),
      amount: this.internal.readDWORD(),
    });
  }

  handlePlayerToServerCharacterSheetMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.GuiCharacterSheet, minor, {
      objectId: this.readOBJECTIDServer(),
    });
  }

  handlePlayerToServerQuickChatMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.QuickChat, minor, {
      objectId: this.readOBJECTIDServer(),
      chatId: this.internal.readWORD(),
    });
  }

  handlePlayerToServerInventoryMessage(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === InventoryMessageMinor.Equip) {
      p.objectId = this.readOBJECTIDServer();
      p.slot = this.internal.readDWORD();
    }
    return this.emitParsed(PlayerServerMessageId.Inventory, minor, p);
  }

  handlePlayerToServerGuiInventoryMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.GuiInventory, minor, {
      status: this.internal.readBYTE(),
    });
  }

  handlePlayerToServerCheatMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.Cheat, minor, {});
  }

  handlePlayerToServerCharListMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.CharList, minor, {});
  }

  handlePlayerToServerGuiContainerMessage(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === GuiContainerMessageMinor.Close) {
      p.objectId = this.readOBJECTIDServer();
      p.flag = this.internal.readBOOL();
    }
    return this.emitParsed(PlayerServerMessageId.GuiContainer, minor, p);
  }

  handlePlayerToServerJournalMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.Journal, minor, {});
  }

  handlePlayerToServerLevelUpMessage(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === LevelUpMessageMinor.Request) {
      p.classId = this.internal.readBYTE();
    }
    return this.emitParsed(PlayerServerMessageId.LevelUp, minor, p);
  }

  handlePlayerToServerMapPinMessage(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === MapPinMessageMinor.SetMapPinAt) {
      p.pos = this.internal.readVector();
      p.note = this.internal.readCExoString();
    } else if (minor === MapPinMessageMinor.DestroyMapPin) {
      p.pinId = this.internal.readDWORD();
    } else if (minor === MapPinMessageMinor.ChangePin) {
      p.pos = this.internal.readVector();
      p.note = this.internal.readCExoString();
      p.pinId = this.internal.readDWORD();
    }
    return this.emitParsed(PlayerServerMessageId.MapPin, minor, p);
  }

  handlePlayerToServerPlayerDeath(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.Death, minor, {});
  }

  handlePlayerToServerCharacterDownload(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.CharacterDownload, minor, {});
  }

  handlePlayerToServerShutDownServer(): number {
    return this.emitParsed(PlayerServerMessageId.ShutDownServer, 0, {});
  }

  handlePlayerToServerPlayModuleCharacterList(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.PlayModuleCharacterList, minor, {});
  }
}
