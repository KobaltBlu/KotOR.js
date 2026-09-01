/**
 * Minor message type IDs for client/server messaging.
 * Extracted from K1 server/client message handlers Send/Handle pairs.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MessageMinors.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export enum CameraMessageMinor {
  ChangeLocation = 1,
  SetMode = 2,
}

export enum AmbientMessageMinor {
  MusicPlay = 1,
  MusicSetDelay = 2,
  MusicChangeTrack = 3,
  BattleMusicPlay = 4,
  BattleMusicChange = 5,
  SoundLoopPlay = 6,
  SoundLoopChange = 7,
  SoundVolume = 8,
}

export enum GuiTimingMessageMinor {
  Info = 1,
}

export enum LoadBarMessageMinor {
  StartStallEvent = 1,
  UpdateStallEvent = 2,
  EndStallEvent = 3,
}

export enum CustomTokenMessageMinor {
  SetToken = 1,
  SetTokenList = 2,
}

export enum PopUpGUIPanelMessageMinor {
  DeathPanel = 1,
  Destroy = 2,
  StringPanel = 3,
}

export enum SoundMessageMinor {
  Play = 2,
  Stop = 3,
  ChangePosition = 5,
}

export enum LoginMessageMinor {
  LoginLocalCharacter = 1,
  CharacterQuery = 0x0a,
  NeedCharacter = 0x10,
  Confirm = 5,
  LoginIFOCharacter = 0x0f,
  LoginLocalCharacterAlt = 0x13,
}

export enum ModuleMessageMinor {
  Info = 1,
  ModuleLoaded = 2,
  UpdateTime = 3,
  SaveGame = 4,
  LoadGame = 5,
  Loading = 6,
  DumpPlayer = 8,
  ExportReply = 0x0a,
  StartStartNewModule = 0x0b,
  EndStartNewModule = 0x0c,
  SaveGameStatus = 0x0d,
}

export enum AreaMessageMinor {
  ClientArea = 1,
  VisualEffect = 2,
  AreaLoaded = 3,
  Weather = 4,
}

export enum ServerStatusMessageMinor {
  RequestStatus = 0,
  StatusMode0 = 1,
  StatusMode1 = 2,
  StatusMode2 = 3,
}

export enum PlayerListMessageMinor {
  All = 1,
  Add = 2,
  Delete = 3,
}

export enum InventoryMessageMinor {
  Equip = 1,
  EquipCancel = 2,
  Drop = 3,
  DropCancel = 4,
  Pickup = 5,
  PickupCancel = 6,
  Unequip = 7,
  UnequipCancel = 8,
  LearnScroll = 9,
}

export enum JournalMessageMinor {
  FullUpdate = 1,
  AddWorldStrref = 2,
  DeleteWorld = 3,
  DeleteWorldStrref = 4,
  DeleteWorldAll = 5,
  AddQuest = 6,
  RemoveQuest = 7,
  FullUpdateNotNeeded = 9,
  QuestScreenOpen = 0x0a,
  Updated = 0x0c,
}

export enum LevelUpMessageMinor {
  Request = 0,
  ConfirmationOk = 1,
  ConfirmationFail = 2,
}

export enum MapPinMessageMinor {
  Enabled = 1,
  SetMapPinAt = 2,
  DestroyMapPin = 3,
  Added = 4,
  ChangePin = 5,
}

export enum CheatMessageMinor {
  Invulnerability = 4,
  Nasty = 0x0b,
  DebugMode = 0x15,
}

export enum SafeProjectileMessageMinor {
  Spell = 1,
  Projectile = 2,
}

export enum ChatMessageMinor {
  Talk = 1,
  Shout = 2,
  Whisper = 3,
  Tell = 4,
  ServerTell = 5,
  Party = 6,
  PlaySound = 7,
}

export enum QuickChatMessageMinor {
  Play = 0,
}

export enum GuiContainerMessageMinor {
  Close = 2,
  Open = 1,
}

export enum GuiInventoryMessageMinor {
  Status = 1,
}

/** HandlePlayerToServerInputMessage minors. */
export enum InputMessageMinor {
  WalkToWaypoint = 1,
  Attack = 2,
  ChangeDoorState = 3,
  Examine = 4,
  Rest = 5,
  UseFeat = 6,
  UseSkill = 7,
  Dialog = 8,
  UseItem = 9,
  ChangeMode = 0x0a,
  UseObject = 0x0b,
  UnlockObject = 0x0c,
  RestCancel = 0x0d,
  LockObject = 0x0e,
  PossessFamiliar = 0x10,
  ToggleMode = 0x11,
  CastSpell = 0x12,
  CancelAction = 0x14,
  ExamineItem = 0x15,
  InventoryMerge = 0x16,
  InventorySplit = 0x17,
  TogglePause = 0x18,
  TogglePauseRequest = 0x19,
  Barter = 0x1a,
  OrientCamera = 0x1c,
  DriveControl = 0x1d,
  ForceFollow = 0x1e,
  StopFollowing = 0x1f,
  AbortDriveControl = 0x21,
  CancelGuiTimingEvent = 0x22,
  UseTalent = 0x23,
  GiveItem = 0x24,
}

export enum PartyMessageMinor {
  List = 1,
}

export enum CharacterDownloadMessageMinor {
  Reply = 2,
  Fail = 3,
}

export enum SaveLoadMessageMinor {
  Status = 1,
}

export enum ShutDownServerMessageMinor {
  ShutDown = 1,
}

export enum PlayModuleCharacterListMessageMinor {
  Start = 1,
  Stop = 2,
  Response = 3,
}

export enum DeathMessageMinor {
  Respawn = 1,
}

export enum DialogMessageMinor {
  Start = 1,
  Reply = 2,
  Abort = 3,
}

export enum VoiceChatMessageMinor {
  Play = 1,
}

export enum ItemPropertyMessageMinor {
  Update = 1,
}

export enum GuiQuickbarMessageMinor {
  SetButton = 1,
}

export enum GuiCharacterSheetMessageMinor {
  NotPermitted = 1,
}

export enum CombatRoundMessageMinor {
  Start = 1,
}

export enum DebugInfoMessageMinor {
  Creature = 1,
  Item = 2,
  Placeable = 3,
  Area = 4,
}

/**
 * HandleServerToPlayerGameObjectUpdate minors.
 * Minor 1 payload is a category-byte stream: A/D/G/I/P/U/W.
 */
export enum GameObjUpdateMessageMinor {
  Update = 1,
  ObjControl = 2,
  VisEffect = 3,
  StripEquippedItems = 6,
  DestroyItem = 7,
  ItemScriptAdd = 8,
}

/** Category bytes inside GameObjUpdate minor 1 stream. */
export enum GameObjUpdateCategory {
  Add = 0x41, // 'A'
  Delete = 0x44, // 'D'
  GuiElements = 0x47, // 'G'
  PlayerInfo = 0x49, // 'I'
  Appearance = 0x50, // 'P'
  Update = 0x55, // 'U'
  WorkRemaining = 0x57, // 'W'
}

/** GuiInfoPopup / Examine GUI minors. */
export enum GuiInfoPopupMessageMinor {
  Item = 2,
  Creature = 3,
  Placeable = 4,
  Mine = 5,
  Door = 6,
}

export enum CharListMessageMinor {
  List = 2,
}

/** Common SendServerToPlayerCCMessage case ids (ClientSideMessage). */
export enum CCMessageCase {
  FeedbackFloaty = 1,
  CombatDamageRolls = 2,
  CombatAttackSummary = 3,
  CombatSimple = 4,
  Empty5 = 5,
  Empty6 = 6,
  SkillCheck = 7,
  InventoryFeedback = 8,
  SpellCast = 9,
  SavingThrow = 0x0a,
  FeedbackGeneric = 0x0b,
  StringTriple = 0x0c,
  PartyInvite = 0x0d,
  ModeToggle = 0x0e,
  FeatList = 0x0f,
  AttackRollDetail = 0x10,
  SpellLike = 0x11,
  AttackSummaryFeedback = 0x12,
  AbilityCheck = 0x13,
  StatsBlock = 0x14,
  StatsShort = 0x15,
  StatsMed = 0x16,
  StatsLong = 0x17,
  ObjectStats = 0x19,
  ObjectStatsAlt = 0x1a,
  ObjectSimple = 0x1b,
}

/** Retail GAME_OBJECT_TYPES used in Add/Delete category headers. */
export enum MessageGameObjectType {
  Creature = 5,
  Item = 6,
  Trigger = 7,
  Door = 8,
  AreaOfEffect = 9,
  Placeable = 10,
}
