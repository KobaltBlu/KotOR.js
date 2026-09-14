export enum IPCMessageType {
  LogMessage = 0x00,

  Module = 0x01,
  Area = 0x02,
  Object = 0x03,
  Script = 0x04,
  Debug = 0x0FF,


  CreateObject = 0x01,
  DestroyObject = 0x02,
  CreateScript = 0x03,
  DestroyScript = 0x04,
  LoadModule = 0x05,
  UnloadModule = 0x06,
  SetScriptBreakpoint = 0x07,
  RemoveScriptBreakpoint = 0x08,
  UpdateScriptState = 0x09,
  ContinueScript = 0x0A,
  StepOverInstruction = 0x0B,
  StepIntoInstruction = 0x0C,
  StepOutInstruction = 0x0D,
  /** Debugger requests (or game pushes) CreateScript for all live instances. */
  ListLiveScripts = 0x10,
  /** Game pushes owner/slot metadata after CreateScript (caller bind / run). */
  UpdateScriptOwner = 0x11,

  // Dev Tools snapshot opcodes (0x20+; keep clear of Script ops)
  RequestModuleSnapshot = 0x20,
  ModuleSnapshot = 0x21,
  RequestObjectList = 0x22,
  ObjectList = 0x23,
  RequestObjectDetail = 0x24,
  ObjectDetail = 0x25,
  RequestGlobalsSnapshot = 0x26,
  GlobalsSnapshot = 0x27,
  /** Dev Tools Scene tab → game: sync/clear in-world map markers. */
  SetSceneWorldMarkers = 0x28,
  RequestAreaMapOverlay = 0x29,
  AreaMapOverlay = 0x2A,
  /** Debugger → game: load NCS bytes by resref (no live instance). */
  RequestScriptResource = 0x2B,
  /** Game → debugger: NCS bytecode reply for RequestScriptResource. */
  ScriptResource = 0x2C,
  /** Debugger → game: live CutsceneManager conversation snapshot. */
  RequestDialogSnapshot = 0x2D,
  /** Game → debugger: DialogSnapshot JSON. */
  DialogSnapshot = 0x2E,
}
