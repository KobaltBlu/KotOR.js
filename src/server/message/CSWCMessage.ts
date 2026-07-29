/**
 * CSWCMessage — port of retail CSWCMessage (ctor @ 0064b510).
 * Client-side SendPlayerToServer* / HandleServerToPlayer* messaging.
 * Unwired: transport defaults to no-op; Handle* reads payloads only (no game side effects).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CSWCMessage.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { CSWMessage, type MessageVector3 } from "@/server/message/CSWMessage";
import {
  IMessageTransport,
  NoopMessageTransport,
  PLAYER_TO_SERVER_PREFIX,
} from "@/server/message/transport";
import { readLocString } from "@/server/message/loc-string";
import {
  OBJECT_INVALID,
  type MessageParseHook,
} from "@/server/message/types";
import {
  readGameObjUpdateStream,
  readObjectIdClient,
  readObjectIdOnly,
  readVisEffect,
} from "@/server/message/payload/game-obj-update-read";
import { PlayerServerMessageId } from "@/enums/server/message/PlayerServerMessageId";
import {
  AmbientMessageMinor,
  AreaMessageMinor,
  CameraMessageMinor,
  CharacterDownloadMessageMinor,
  ChatMessageMinor,
  CheatMessageMinor,
  CustomTokenMessageMinor,
  GameObjUpdateMessageMinor,
  GuiContainerMessageMinor,
  GuiInventoryMessageMinor,
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
  SafeProjectileMessageMinor,
  ServerStatusMessageMinor,
  SoundMessageMinor,
} from "@/enums/server/message/MessageMinors";

export class CSWCMessage {
  readonly internal: CSWMessage = new CSWMessage();
  transport: IMessageTransport;
  onParsed?: MessageParseHook;

  constructor(transport: IMessageTransport = new NoopMessageTransport()) {
    this.transport = transport;
  }

  /**
   * Client OBJECTID write — retail uses WriteBOOL(oid) @ SendPlayerToServerInput_Attack.
   * Stores raw 4-byte object id (not coerced to 0/1).
   */
  writeOBJECTIDClient(objectId: number): void {
    this.internal.writeBOOL(objectId | 0);
  }

  /** Retail ReadOBJECTIDClient @ 00692630 — raw DWORD. */
  readOBJECTIDClient(): number {
    return this.internal.readDWORD();
  }

  /**
   * Retail SendPlayerToServerMessage @ 00677410 — stamps 'p' + major + minor.
   */
  sendPlayerToServerMessage(
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
    } else {
      message = buffer.slice(0, size ?? buffer.length);
      messageSize = message.length;
    }
    message[0] = PLAYER_TO_SERVER_PREFIX;
    message[1] = major & 0xff;
    message[2] = minor & 0xff;
    return this.transport.sendToServer(message.subarray(0, messageSize));
  }

  protected finishSend(major: number, minor: number): boolean {
    const out = this.internal.getWriteMessage();
    if (!out.ok) return false;
    return this.sendPlayerToServerMessage(major, minor, out.buffer, out.size);
  }

  /**
   * Retail HandleServerToPlayerMessage @ 0066a640.
   * Reads payloads only — no client object mutation.
   */
  handleServerToPlayerMessage(message: Uint8Array, size: number = message.length): number {
    if (size < 3 || message[0] !== 0x50 /* 'P' */) return 0;
    const major = message[1];
    const minor = message[2];
    this.internal.setReadMessage(message.subarray(3, size), size - 3, 0xffffffff, 1);
    if (this.internal.messageReadOverflow()) return 0;

    let ok = 0;
    switch (major) {
      case PlayerServerMessageId.ServerStatus:
        ok = this.handleServerToPlayerServerStatus(minor);
        break;
      case PlayerServerMessageId.Login:
        ok = this.handleServerToPlayerLogin(minor);
        break;
      case PlayerServerMessageId.Module:
        ok = this.handleServerToPlayerModule(minor);
        break;
      case PlayerServerMessageId.Area:
        ok = this.handleServerToPlayerArea(minor);
        break;
      case PlayerServerMessageId.GameObjUpdate:
        ok = this.handleServerToPlayerGameObjectUpdate(minor);
        break;
      case PlayerServerMessageId.Chat:
        ok = this.handleServerToPlayerChat(minor);
        break;
      case PlayerServerMessageId.PlayerList:
        ok = this.handleServerToPlayerPlayerList(minor);
        break;
      case PlayerServerMessageId.Inventory:
        ok = this.handleServerToPlayerInventory(minor);
        break;
      case PlayerServerMessageId.GuiInventory:
        ok = this.handleServerToPlayerGuiInventory(minor);
        break;
      case PlayerServerMessageId.Party:
        ok = this.handleServerToPlayerParty(minor);
        break;
      case PlayerServerMessageId.Cheat:
        ok = this.handleServerToPlayerCheatMessage(minor);
        break;
      case PlayerServerMessageId.Camera:
        ok = this.handleServerToPlayerCamera(minor);
        break;
      case PlayerServerMessageId.CharList:
        ok = 0;
        break;
      case PlayerServerMessageId.ClientSideMessage:
        ok = this.handleServerToPlayerCCMessage(minor);
        break;
      case PlayerServerMessageId.CombatRound:
        ok = this.handleServerToPlayerCombatRound(minor);
        break;
      case PlayerServerMessageId.Dialog:
        ok = 1;
        break;
      case PlayerServerMessageId.GuiCharacterSheet:
        ok = this.handleServerToPlayerGUICharacterSheet(minor);
        break;
      case PlayerServerMessageId.QuickChat:
        ok = 1;
        break;
      case PlayerServerMessageId.Sound:
        ok = this.handleServerToPlayerSound(minor);
        break;
      case PlayerServerMessageId.ItemProperty:
        ok = this.handleServerToPlayerActiveItemPropertyUpdate(minor);
        break;
      case PlayerServerMessageId.GuiContainer:
        ok = this.handleServerToPlayerGuiContainerObjectMessage(minor);
        break;
      case PlayerServerMessageId.VoiceChat:
        ok = this.handleServerToPlayerVoiceChatMessage(minor);
        break;
      case PlayerServerMessageId.GuiInfoPopup:
        ok = this.handleServerToPlayerGuiInfoPopupMessage(minor);
        break;
      case PlayerServerMessageId.Journal:
        ok = this.handleServerToPlayerJournalMessage(minor);
        break;
      case PlayerServerMessageId.LevelUp:
        ok = this.handleServerToPlayerLevelUpMessage(minor);
        break;
      case PlayerServerMessageId.GuiQuickbar:
        ok = this.handleServerToPlayerGuiQuickbar(minor);
        break;
      case PlayerServerMessageId.MapPin:
        ok = this.handleServerToPlayerMapPin(minor);
        break;
      case PlayerServerMessageId.DebugInfo:
        ok = this.handleServerToPlayerDebugInfo(minor);
        break;
      case PlayerServerMessageId.SafeProjectile:
        ok = this.handleServerToPlayerSafeProjectile(minor);
        break;
      case PlayerServerMessageId.PopUpGUIPanel:
        ok = this.handleServerToPlayerPopUpGUIPanel(minor);
        break;
      case PlayerServerMessageId.Ambient:
        ok = this.handleServerToPlayerAmbient(minor);
        break;
      case PlayerServerMessageId.CharacterDownload:
        ok = this.handleServerToPlayerCharacterDownload(minor);
        break;
      case PlayerServerMessageId.LoadBar:
        ok = this.handleServerToPlayerLoadBar(minor);
        break;
      case PlayerServerMessageId.SaveLoad:
        ok = this.handleServerToPlayerSaveLoad(minor);
        break;
      case PlayerServerMessageId.ShutDownServer:
        ok = 1;
        break;
      case PlayerServerMessageId.GuiTimingEvent:
        ok = this.handleServerToPlayerGuiTimingEvent(minor);
        break;
      case PlayerServerMessageId.PlayModuleCharacterList:
        ok = 1;
        break;
      case PlayerServerMessageId.CustomToken:
        ok = this.handleServerToPlayerSetCustomToken(minor);
        break;
      default:
        ok = 0;
        break;
    }
    return ok;
  }

  protected emitParsed(major: number, minor: number, payload: Record<string, unknown>): number {
    this.onParsed?.({ direction: "serverToPlayer", major, minor, payload });
    return this.internal.messageReadOverflow() ? 0 : 1;
  }

  // ---------------------------------------------------------------------------
  // SendPlayerToServer*
  // ---------------------------------------------------------------------------

  /** @ 00677a90 */
  sendPlayerToServerInput_Attack(objectId: number, anim: number): boolean {
    this.internal.createWriteMessage(6);
    this.writeOBJECTIDClient(objectId);
    this.internal.writeWORD(anim & 0xffff);
    return this.finishSend(PlayerServerMessageId.Input, InputMessageMinor.Attack);
  }

  /** @ 00677b10 */
  sendPlayerToServerInput_UseSkill(
    skill: number,
    sub: number,
    objectId: number,
    pos: MessageVector3
  ): boolean {
    this.internal.createWriteMessage(20);
    this.internal.writeBYTE(skill & 0xff);
    this.internal.writeBYTE(sub & 0xff);
    this.writeOBJECTIDClient(objectId);
    this.internal.writeFLOAT(pos.x);
    this.internal.writeFLOAT(pos.y);
    this.internal.writeFLOAT(pos.z);
    return this.finishSend(PlayerServerMessageId.Input, InputMessageMinor.UseSkill);
  }

  /** @ 00677bd0 */
  sendPlayerToServerInput_UseItem(opts: {
    itemId: number;
    byte0: number;
    sub?: number;
    targetId?: number;
    pos?: MessageVector3;
  }): boolean {
    this.internal.createWriteMessage(32);
    this.writeOBJECTIDClient(opts.itemId);
    this.internal.writeBYTE(opts.byte0 & 0xff);
    if (opts.sub !== undefined) {
      this.internal.writeBOOL(1);
      this.internal.writeBYTE(opts.sub & 0xff);
    } else this.internal.writeBOOL(0);
    if (opts.targetId !== undefined) {
      this.internal.writeBOOL(1);
      this.writeOBJECTIDClient(opts.targetId);
    } else this.internal.writeBOOL(0);
    if (opts.pos) {
      this.internal.writeBOOL(1);
      this.internal.writeFLOAT(opts.pos.x);
      this.internal.writeFLOAT(opts.pos.y);
      this.internal.writeFLOAT(opts.pos.z);
    } else this.internal.writeBOOL(0);
    return this.finishSend(PlayerServerMessageId.Input, InputMessageMinor.UseItem);
  }

  /** @ 00677d10 */
  sendPlayerToServerInput_UseObject(objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDClient(objectId);
    return this.finishSend(PlayerServerMessageId.Input, InputMessageMinor.UseObject);
  }

  /** @ 006776a0 */
  sendPlayerToServerInput_CastSpell(opts: {
    spellId: number;
    b0: number;
    b1: number;
    b2: number;
    flags: number;
    targetId?: number;
    pos?: MessageVector3;
  }): boolean {
    this.internal.createWriteMessage(24);
    this.internal.writeDWORD(opts.spellId);
    this.internal.writeBYTE(opts.b0);
    this.internal.writeBYTE(opts.b1);
    this.internal.writeBYTE(opts.b2);
    this.internal.writeBYTE(opts.flags);
    if (opts.flags & 1) this.writeOBJECTIDClient(opts.targetId ?? OBJECT_INVALID);
    if (opts.flags & 2) {
      const p = opts.pos ?? { x: 0, y: 0, z: 0 };
      this.internal.writeFLOAT(p.x);
      this.internal.writeFLOAT(p.y);
      this.internal.writeFLOAT(p.z);
    }
    return this.finishSend(PlayerServerMessageId.Input, InputMessageMinor.CastSpell);
  }

  /** @ 00677d70 */
  sendPlayerToServerInput_ChangeDoorState(objectId: number, state: number): boolean {
    this.internal.createWriteMessage(6);
    this.writeOBJECTIDClient(objectId);
    this.internal.writeWORD(state & 0xffff);
    return this.finishSend(PlayerServerMessageId.Input, InputMessageMinor.ChangeDoorState);
  }

  /** @ 00677de0 */
  sendPlayerToServerInput_UnlockObject(objectId: number, keyId: number): boolean {
    this.internal.createWriteMessage(8);
    this.writeOBJECTIDClient(objectId);
    this.writeOBJECTIDClient(keyId);
    return this.finishSend(PlayerServerMessageId.Input, InputMessageMinor.UnlockObject);
  }

  /** @ 00677ea0 */
  sendPlayerToServerInput_Dialog(objectId: number): boolean {
    this.internal.createWriteMessage(4);
    this.writeOBJECTIDClient(objectId);
    return this.finishSend(PlayerServerMessageId.Input, InputMessageMinor.Dialog);
  }

  /** @ 00677870 */
  sendPlayerToServerInput_GiveItem(oid0: number, oid1: number, oid2: number, amount: number): boolean {
    this.internal.createWriteMessage(16);
    this.writeOBJECTIDClient(oid0);
    this.writeOBJECTIDClient(oid1);
    this.writeOBJECTIDClient(oid2);
    this.internal.writeDWORD(amount);
    return this.finishSend(PlayerServerMessageId.Input, InputMessageMinor.GiveItem);
  }

  /** @ 00677800 — retail is local-only (TogglePauseState); no net stamp. */
  sendPlayerToServerInput_TogglePauseRequest(): boolean {
    return true;
  }

  /** @ 00677800 companion — WalkToWaypoint @ retail Input minor 1 */
  sendPlayerToServerInput_WalkToWaypoint(opts: {
    areaId: number;
    pos: MessageVector3;
    byte0: number;
    bool0: boolean;
    bool1: boolean;
    byte1: number;
    objectId: number;
  }): boolean {
    this.internal.createWriteMessage(32);
    this.writeOBJECTIDClient(opts.areaId);
    this.internal.writeFLOAT(opts.pos.x);
    this.internal.writeFLOAT(opts.pos.y);
    this.internal.writeFLOAT(opts.pos.z);
    this.internal.writeBYTE(opts.byte0);
    this.internal.writeBOOL(opts.bool0);
    this.internal.writeBOOL(opts.bool1);
    this.internal.writeBYTE(opts.byte1);
    this.writeOBJECTIDClient(opts.objectId);
    return this.finishSend(PlayerServerMessageId.Input, InputMessageMinor.WalkToWaypoint);
  }

  /** @ 00677e50 path — DriveControl @ 00523450 fields */
  sendPlayerToServerInput_DriveControl(
    stickX: number,
    stickY: number,
    word: number,
    byte0: number,
    byte1: number
  ): boolean {
    this.internal.createWriteMessage(12);
    this.internal.writeFLOAT(stickX);
    this.internal.writeFLOAT(stickY);
    this.internal.writeWORD(word & 0xffff);
    this.internal.writeBYTE(byte0 & 0xff);
    this.internal.writeBYTE(byte1 & 0xff);
    return this.finishSend(PlayerServerMessageId.Input, InputMessageMinor.DriveControl);
  }

  /** @ 00677e50 */
  sendPlayerToServerInput_AbortDriveControl(): boolean {
    return this.sendPlayerToServerMessage(PlayerServerMessageId.Input, InputMessageMinor.AbortDriveControl);
  }

  /** @ 00677490 */
  sendPlayerToServerModule_ModuleLoaded(): boolean {
    return this.sendPlayerToServerMessage(PlayerServerMessageId.Module, ModuleMessageMinor.ModuleLoaded);
  }

  /** @ 006774e0 */
  sendPlayerToServerModule_SaveGame(slot: number, name: string, description: string): boolean {
    this.internal.createWriteMessage(64);
    this.internal.writeDWORD(slot);
    this.internal.writeCExoString(name);
    this.internal.writeCExoString(description);
    return this.finishSend(PlayerServerMessageId.Module, ModuleMessageMinor.SaveGame);
  }

  /** @ 00677560 */
  sendPlayerToServerModule_LoadGame(slot: number, name: string, description: string): boolean {
    this.internal.createWriteMessage(64);
    this.internal.writeDWORD(slot);
    this.internal.writeCExoString(name);
    this.internal.writeCExoString(description);
    return this.finishSend(PlayerServerMessageId.Module, ModuleMessageMinor.LoadGame);
  }

  /** @ 006778f0 */
  sendPlayerToServerArea_AreaLoaded(): boolean {
    return this.sendPlayerToServerMessage(PlayerServerMessageId.Area, AreaMessageMinor.AreaLoaded);
  }

  /** @ 006775e0 */
  sendPlayerToServerStatus_RequestStatus(): boolean {
    return this.sendPlayerToServerMessage(
      PlayerServerMessageId.ServerStatus,
      ServerStatusMessageMinor.RequestStatus
    );
  }

  /** @ 00677630 */
  sendPlayerToServerGuiContainer_Close(objectId: number, flag: boolean): boolean {
    this.internal.createWriteMessage(8);
    this.writeOBJECTIDClient(objectId);
    this.internal.writeBOOL(flag);
    return this.finishSend(PlayerServerMessageId.GuiContainer, GuiContainerMessageMinor.Close);
  }

  /** @ 00677f30 */
  sendPlayerToServerInventory_Equip(objectId: number, slot: number): boolean {
    this.internal.createWriteMessage(8);
    this.writeOBJECTIDClient(objectId);
    this.internal.writeDWORD(slot);
    return this.finishSend(PlayerServerMessageId.Inventory, InventoryMessageMinor.Equip);
  }

  /**
   * @ 00678280
   */
  sendPlayerToServer_LevelUp(opts: {
    classId: number;
    ability?: number;
    includeAbility: boolean;
    skillMask: number;
    skillDeltas: number[];
    skillPoints: number;
    feats: number[];
    addSpells: number[];
    remSpells: number[];
  }): boolean {
    this.internal.createWriteMessage(128);
    this.internal.writeBYTE(opts.classId & 0xff);
    if (opts.includeAbility) this.internal.writeBYTE((opts.ability ?? 0) & 0xff);
    this.internal.writeDWORD(opts.skillMask);
    for (const d of opts.skillDeltas) this.internal.writeBYTE(d & 0xff);
    this.internal.writeWORD(opts.skillPoints & 0xffff);
    this.internal.writeBYTE(opts.feats.length & 0xff);
    for (const f of opts.feats) this.internal.writeWORD(f & 0xffff);
    this.internal.writeBYTE(opts.addSpells.length & 0xff);
    for (const s of opts.addSpells) this.internal.writeDWORD(s);
    this.internal.writeBYTE(opts.remSpells.length & 0xff);
    for (const s of opts.remSpells) this.internal.writeDWORD(s);
    return this.finishSend(PlayerServerMessageId.LevelUp, LevelUpMessageMinor.Request);
  }

  /** @ 00677fa0 */
  sendPlayerToServerLogin_LoginLocalCharacter(
    data: Uint8Array,
    minor: number = LoginMessageMinor.LoginLocalCharacter
  ): boolean {
    this.internal.createWriteMessage(4 + data.length);
    this.internal.writeDWORD(data.length);
    this.internal.writeVOIDPtr(data);
    return this.finishSend(PlayerServerMessageId.Login, minor);
  }

  /** @ 00678030 */
  sendPlayerToServerLogin_LoginIFOCharacter(): boolean {
    return this.sendPlayerToServerMessage(PlayerServerMessageId.Login, LoginMessageMinor.LoginIFOCharacter);
  }

  /** @ 006779d0 */
  sendPlayerToServerCheat_Invulnerability(): boolean {
    return this.sendPlayerToServerMessage(PlayerServerMessageId.Cheat, CheatMessageMinor.Invulnerability);
  }

  /** @ 00677820 */
  sendPlayerToServerJournalMessage_QuestScreenOpen(): boolean {
    return this.sendPlayerToServerMessage(
      PlayerServerMessageId.Journal,
      JournalMessageMinor.QuestScreenOpen
    );
  }

  /** @ 00677a20 */
  sendPlayerToServerGuiInventory_Status(open: boolean): boolean {
    this.internal.createWriteMessage(1);
    this.internal.writeBYTE(open ? 1 : 0);
    return this.finishSend(PlayerServerMessageId.GuiInventory, GuiInventoryMessageMinor.Status);
  }

  // ---------------------------------------------------------------------------
  // HandleServerToPlayer*
  // ---------------------------------------------------------------------------

  /** @ 0064b8e0 */
  handleServerToPlayerCamera(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === CameraMessageMinor.ChangeLocation) {
      const flags = this.internal.readBYTE();
      p.flags = flags;
      if (flags & 1) p.yaw = this.internal.readFLOAT();
      if (flags & 2) p.dist = this.internal.readFLOAT();
      if (flags & 4) p.pitch = this.internal.readFLOAT();
      if (flags & 8) p.modeByte = this.internal.readBYTE();
    } else if (minor === CameraMessageMinor.SetMode) {
      p.mode = this.internal.readBYTE();
    }
    return this.emitParsed(PlayerServerMessageId.Camera, minor, p);
  }

  /** @ 00665510 */
  handleServerToPlayerAmbient(minor: number): number {
    const p: Record<string, unknown> = {};
    switch (minor) {
      case AmbientMessageMinor.MusicPlay:
      case AmbientMessageMinor.BattleMusicPlay:
      case AmbientMessageMinor.SoundLoopPlay:
        p.play = this.internal.readBOOL();
        break;
      case AmbientMessageMinor.MusicSetDelay:
      case AmbientMessageMinor.BattleMusicChange:
        p.value = this.internal.readDWORD();
        break;
      case AmbientMessageMinor.MusicChangeTrack:
      case AmbientMessageMinor.SoundLoopChange:
      case AmbientMessageMinor.SoundVolume:
        p.day = this.internal.readBOOL();
        p.value = this.internal.readDWORD();
        break;
      default:
        break;
    }
    return this.emitParsed(PlayerServerMessageId.Ambient, minor, p);
  }

  /** @ 00665590 */
  handleServerToPlayerGuiTimingEvent(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === GuiTimingMessageMinor.Info) {
      p.active = this.internal.readBOOL();
      if (p.active) {
        p.duration = this.internal.readDWORD();
        p.eventType = this.internal.readBYTE();
      }
    }
    return this.emitParsed(PlayerServerMessageId.GuiTimingEvent, minor, p);
  }

  /** @ 0064edd0 */
  handleServerToPlayerLoadBar(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === LoadBarMessageMinor.StartStallEvent) {
      p.stallId = this.internal.readDWORD();
    } else if (
      minor === LoadBarMessageMinor.UpdateStallEvent ||
      minor === LoadBarMessageMinor.EndStallEvent
    ) {
      p.stallId = this.internal.readDWORD();
      p.value = this.internal.readDWORD();
    }
    return this.emitParsed(PlayerServerMessageId.LoadBar, minor, p);
  }

  /** @ 0064bf30 */
  handleServerToPlayerSetCustomToken(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === CustomTokenMessageMinor.SetToken) {
      p.number = this.internal.readDWORD();
      p.value = this.internal.readCExoString();
    } else if (minor === CustomTokenMessageMinor.SetTokenList) {
      const count = this.internal.readDWORD();
      const tokens: { number: number; value: string }[] = [];
      for (let i = 0; i < count; i++) {
        tokens.push({ number: this.internal.readDWORD(), value: this.internal.readCExoString() });
      }
      p.tokens = tokens;
    }
    return this.emitParsed(PlayerServerMessageId.CustomToken, minor, p);
  }

  /** @ 00654230 */
  handleServerToPlayerPopUpGUIPanel(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === PopUpGUIPanelMessageMinor.DeathPanel) {
      p.respawn = this.internal.readBOOL();
      p.waitForHelp = this.internal.readBOOL();
      p.helpStringRef = this.internal.readDWORD();
      p.helpString = this.internal.readCExoString();
    } else if (minor === PopUpGUIPanelMessageMinor.StringPanel) {
      p.message = this.internal.readCExoString();
    }
    return this.emitParsed(PlayerServerMessageId.PopUpGUIPanel, minor, p);
  }

  /** @ 00656ba0 */
  handleServerToPlayerSound(minor: number): number {
    const p: Record<string, unknown> = {};
    if (
      minor === SoundMessageMinor.Play ||
      minor === SoundMessageMinor.Stop ||
      minor === SoundMessageMinor.ChangePosition
    ) {
      p.objectId = this.readOBJECTIDClient();
      if (minor === SoundMessageMinor.ChangePosition) {
        p.x = this.internal.readFLOAT();
        p.y = this.internal.readFLOAT();
        p.z = this.internal.readFLOAT();
      }
    }
    return this.emitParsed(PlayerServerMessageId.Sound, minor, p);
  }

  handleServerToPlayerServerStatus(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.ServerStatus, minor, {});
  }

  handleServerToPlayerLogin(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === LoginMessageMinor.CharacterQuery) {
      const count = this.internal.readBYTE();
      const entries: { value: number; flag: number }[] = [];
      for (let i = 0; i < count; i++) {
        entries.push({ value: this.internal.readDWORD(), flag: this.internal.readBYTE() });
      }
      p.entries = entries;
      p.trailing = this.internal.readDWORD();
    }
    return this.emitParsed(PlayerServerMessageId.Login, minor, p);
  }

  handleServerToPlayerModule(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === ModuleMessageMinor.SaveGameStatus) p.status = this.internal.readBYTE();
    if (minor === ModuleMessageMinor.EndStartNewModule) p.success = this.internal.readBOOL();
    if (minor === ModuleMessageMinor.UpdateTime) {
      const flags = this.internal.readBYTE();
      p.flags = flags;
      if (flags & 1) {
        p.timeOfDayMode = this.internal.readBYTE();
        if (p.timeOfDayMode === 3 || p.timeOfDayMode === 4) p.pauseDay = this.internal.readDWORD();
      }
      if (flags & 2) p.calendarDay = this.internal.readBYTE();
      if (flags & 4) p.year = this.internal.readBYTE();
      if (flags & 8) p.hour = this.internal.readBYTE();
      if (flags & 0x10) p.milliseconds = this.internal.readDWORD();
    }
    return this.emitParsed(PlayerServerMessageId.Module, minor, p);
  }

  handleServerToPlayerArea(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === AreaMessageMinor.VisualEffect) {
      p.vfx = this.internal.readWORD();
      p.pos = this.internal.readVector();
    } else if (minor === AreaMessageMinor.Weather) {
      p.weather = this.internal.readBYTE();
      p.start = this.internal.readBOOL();
    } else if (minor === AreaMessageMinor.ClientArea) {
      p.loadScreen = this.internal.readBYTE();
      p.f0 = this.internal.readFLOAT();
      p.f1 = this.internal.readFLOAT();
      p.f2 = this.internal.readFLOAT();
      p.f3 = this.internal.readFLOAT();
      p.flag = this.internal.readBOOL();
      p.remaining = this.internal.readBufferSize - this.internal.readIndex;
    }
    return this.emitParsed(PlayerServerMessageId.Area, minor, p);
  }

  handleServerToPlayerGameObjectUpdate(minor: number): number {
    const p: Record<string, unknown> = { minor };
    if (minor === GameObjUpdateMessageMinor.Update) {
      p.events = readGameObjUpdateStream(this.internal);
    } else if (minor === GameObjUpdateMessageMinor.ObjControl) {
      p.objectId = readObjectIdClient(this.internal);
    } else if (minor === GameObjUpdateMessageMinor.VisEffect) {
      // Non-beam decode by default; callers can re-parse with isBeam=true if needed.
      p.vis = readVisEffect(this.internal, false);
    } else if (minor === GameObjUpdateMessageMinor.StripEquippedItems) {
      p.objectId = readObjectIdClient(this.internal);
    } else if (minor === GameObjUpdateMessageMinor.DestroyItem) {
      p.destroy = readObjectIdOnly(this.internal);
    } else if (minor === GameObjUpdateMessageMinor.ItemScriptAdd) {
      p.remaining = this.internal.readBufferSize - this.internal.readIndex;
    }
    return this.emitParsed(PlayerServerMessageId.GameObjUpdate, minor, p);
  }

  handleServerToPlayerChat(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === 5) {
      p.text = this.internal.readCExoString();
    } else if (minor === 1 || minor === 3) {
      p.speakerId = this.readOBJECTIDClient();
      p.text = this.internal.readCExoString();
    } else if (minor === 2 || minor === 4 || minor === 6) {
      p.speakerId = this.readOBJECTIDClient();
      p.text = this.internal.readCExoString();
      p.pos = this.internal.readVector();
      p.loc0 = readLocString(this.internal);
      p.loc1 = readLocString(this.internal);
    } else if (minor === 7) {
      p.objectId = this.readOBJECTIDClient();
      p.sound = this.internal.readCExoString();
    }
    return this.emitParsed(PlayerServerMessageId.Chat, minor, p);
  }

  handleServerToPlayerPlayerList(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === PlayerListMessageMinor.Delete) {
      p.playerId = this.internal.readDWORD();
    } else if (minor === PlayerListMessageMinor.Add) {
      p.playerId = this.internal.readDWORD();
      p.objectId = this.readOBJECTIDClient();
      p.name = this.internal.readCExoString();
      p.isDM = this.internal.readBOOL();
      p.remaining = this.internal.readBufferSize - this.internal.readIndex;
    } else if (minor === PlayerListMessageMinor.All) {
      p.count = this.internal.readBYTE();
      p.remaining = this.internal.readBufferSize - this.internal.readIndex;
    }
    return this.emitParsed(PlayerServerMessageId.PlayerList, minor, p);
  }

  handleServerToPlayerJournalMessage(minor: number): number {
    const p: Record<string, unknown> = { minor };
    if (minor === JournalMessageMinor.RemoveQuest) {
      p.plotId = this.internal.readCExoString();
    } else if (minor === JournalMessageMinor.DeleteWorld || minor === JournalMessageMinor.DeleteWorldStrref) {
      p.id = this.internal.readDWORD();
    } else if (minor === JournalMessageMinor.DeleteWorldAll) {
      p.byte = this.internal.readBYTE();
    } else {
      p.remaining = this.internal.readBufferSize - this.internal.readIndex;
    }
    return this.emitParsed(PlayerServerMessageId.Journal, minor, p);
  }

  handleServerToPlayerMapPin(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === MapPinMessageMinor.Enabled) {
      p.objectId = this.readOBJECTIDClient();
      p.enabled = this.internal.readBOOL();
    } else if (minor === MapPinMessageMinor.Added) {
      p.pos = this.internal.readVector();
      p.note = this.internal.readCExoString();
      p.id = this.internal.readDWORD();
    } else {
      p.remaining = this.internal.readBufferSize - this.internal.readIndex;
    }
    return this.emitParsed(PlayerServerMessageId.MapPin, minor, p);
  }

  handleServerToPlayerDebugInfo(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.DebugInfo, minor, {
      objectId: this.readOBJECTIDClient(),
      remaining: this.internal.readBufferSize - this.internal.readIndex,
    });
  }

  handleServerToPlayerCharacterDownload(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === CharacterDownloadMessageMinor.Fail) {
      p.resref = this.internal.readCExoString();
      p.isType4 = this.internal.readBOOL();
    } else {
      p.remaining = this.internal.readBufferSize - this.internal.readIndex;
    }
    return this.emitParsed(PlayerServerMessageId.CharacterDownload, minor, p);
  }

  handleServerToPlayerCCMessage(minor: number): number {
    const p: Record<string, unknown> = { minor };
    // Case 0x12 (AttackSummaryFeedback) — matches Send path
    if (minor === 0x12) {
      p.oid0 = this.readOBJECTIDClient();
      p.oid1 = this.readOBJECTIDClient();
      p.int0 = this.internal.readDWORD();
      p.word1 = this.internal.readWORD();
      p.ints = [];
      for (let i = 0; i < 7; i++) (p.ints as number[]).push(this.internal.readDWORD());
      p.b0 = this.internal.readBOOL();
      p.b1 = this.internal.readBOOL();
      p.b2 = this.internal.readBOOL();
    } else if (minor === 1) {
      p.objectId = this.readOBJECTIDClient();
      p.int0 = this.internal.readDWORD();
    } else {
      p.remaining = this.internal.readBufferSize - this.internal.readIndex;
    }
    return this.emitParsed(PlayerServerMessageId.ClientSideMessage, minor, p);
  }

  handleServerToPlayerCombatRound(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.CombatRound, minor, {
      remaining: this.internal.readBufferSize - this.internal.readIndex,
    });
  }

  handleServerToPlayerActiveItemPropertyUpdate(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.ItemProperty, minor, {
      objectId: this.readOBJECTIDClient(),
      byte0: this.internal.readBYTE(),
      mask: this.internal.readBYTE(),
      remaining: this.internal.readBufferSize - this.internal.readIndex,
    });
  }

  handleServerToPlayerGuiQuickbar(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.GuiQuickbar, minor, {
      remaining: this.internal.readBufferSize - this.internal.readIndex,
    });
  }

  handleServerToPlayerGuiInfoPopupMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.GuiInfoPopup, minor, {
      objectId: this.readOBJECTIDClient(),
      remaining: this.internal.readBufferSize - this.internal.readIndex,
    });
  }

  handleServerToPlayerInventory(minor: number): number {
    const p: Record<string, unknown> = { objectId: this.readOBJECTIDClient() };
    if (minor === InventoryMessageMinor.EquipCancel) p.slot = this.internal.readDWORD();
    if (minor === InventoryMessageMinor.Unequip) p.success = this.internal.readBOOL();
    return this.emitParsed(PlayerServerMessageId.Inventory, minor, p);
  }

  handleServerToPlayerGuiInventory(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.GuiInventory, minor, {});
  }

  handleServerToPlayerParty(minor: number): number {
    const count = this.internal.readDWORD();
    const ids: number[] = [];
    for (let i = 0; i < count; i++) ids.push(this.readOBJECTIDClient());
    return this.emitParsed(PlayerServerMessageId.Party, minor, { objectIds: ids });
  }

  handleServerToPlayerCheatMessage(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === CheatMessageMinor.DebugMode) p.enabled = this.internal.readBOOL();
    if (minor === CheatMessageMinor.Nasty) p.objectId = this.readOBJECTIDClient();
    return this.emitParsed(PlayerServerMessageId.Cheat, minor, p);
  }

  handleServerToPlayerGUICharacterSheet(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.GuiCharacterSheet, minor, {});
  }

  handleServerToPlayerGuiContainerObjectMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.GuiContainer, minor, {
      objectId: this.readOBJECTIDClient(),
    });
  }

  handleServerToPlayerVoiceChatMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.VoiceChat, minor, {
      objectId: this.readOBJECTIDClient(),
      soundSet: this.internal.readBYTE(),
    });
  }

  handleServerToPlayerLevelUpMessage(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.LevelUp, minor, {});
  }

  /** @ 006631c0 */
  handleServerToPlayerSafeProjectile(minor: number): number {
    const p: Record<string, unknown> = {};
    if (minor === SafeProjectileMessageMinor.Projectile) {
      p.oid0 = this.readOBJECTIDClient();
      p.oid1 = this.readOBJECTIDClient();
      p.origin = this.internal.readVector();
      p.target = this.internal.readVector();
      p.spellId = this.internal.readDWORD();
      p.path = this.internal.readBYTE();
      p.model = this.internal.readDWORD();
      p.byte0 = this.internal.readBYTE();
      p.byte1 = this.internal.readBYTE();
      p.unused = this.internal.readDWORD();
    } else if (minor === SafeProjectileMessageMinor.Spell) {
      p.oid0 = this.readOBJECTIDClient();
      p.oid1 = this.readOBJECTIDClient();
      p.floats = [
        this.internal.readFLOAT(),
        this.internal.readFLOAT(),
        this.internal.readFLOAT(),
        this.internal.readFLOAT(),
        this.internal.readFLOAT(),
        this.internal.readFLOAT(),
      ];
      p.spellId = this.internal.readDWORD();
      p.type = this.internal.readBYTE();
      p.dword0 = this.internal.readDWORD();
      p.dword1 = this.internal.readDWORD();
      if (p.type === 6 || p.type === 7) p.extra = this.internal.readDWORD();
      else {
        p.b0 = this.internal.readBYTE();
        p.b1 = this.internal.readBYTE();
        p.b2 = this.internal.readBYTE();
      }
    }
    return this.emitParsed(PlayerServerMessageId.SafeProjectile, minor, p);
  }

  handleServerToPlayerSaveLoad(minor: number): number {
    return this.emitParsed(PlayerServerMessageId.SaveLoad, minor, {
      status: this.internal.readBYTE(),
      value: this.internal.readDWORD(),
    });
  }
}
