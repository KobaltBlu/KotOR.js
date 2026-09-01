/**
 * Retail PLAYER_SERVER_MESSAGE_IDS — major message types.
 * From HandlePlayerToServerMessage and HandleServerToPlayerMessage.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file PlayerServerMessageId.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export enum PlayerServerMessageId {
  ServerStatus = 0x01,
  Login = 0x02,
  Module = 0x03,
  Area = 0x04,
  GameObjUpdate = 0x05,
  Input = 0x06,
  Gold = 0x08,
  Chat = 0x09,
  PlayerList = 0x0a,
  /** Player→Server only in K1 dispatcher (no-op path). */
  ChatAlt = 0x0b,
  Inventory = 0x0c,
  GuiInventory = 0x0d,
  Party = 0x0e,
  Cheat = 0x0f,
  Camera = 0x10,
  CharList = 0x11,
  ClientSideMessage = 0x12,
  CombatRound = 0x13,
  Dialog = 0x14,
  GuiCharacterSheet = 0x15,
  QuickChat = 0x16,
  Sound = 0x17,
  ItemProperty = 0x18,
  GuiContainer = 0x19,
  VoiceChat = 0x1a,
  GuiInfoPopup = 0x1b,
  Journal = 0x1c,
  LevelUp = 0x1d,
  GuiQuickbar = 0x1e,
  MapPin = 0x20,
  DebugInfo = 0x21,
  SafeProjectile = 0x22,
  PopUpGUIPanel = 0x24,
  Death = 0x25,
  Ambient = 0x28,
  CharacterDownload = 0x2b,
  LoadBar = 0x2c,
  SaveLoad = 0x2d,
  ShutDownServer = 0x2f,
  GuiTimingEvent = 0x30,
  PlayModuleCharacterList = 0x31,
  CustomToken = 0x32,
}
