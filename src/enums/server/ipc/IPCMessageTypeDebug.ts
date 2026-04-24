export enum IPCMessageTypeDebug {
  Open = 0x01,
  Close = 0x02,
  ToggleDebugState = 0x03,

  ScriptSetBreakpoint = 0x07,
  ScriptRemovetBreakpoint = 0x08,
  ScriptUpdateState = 0x09,
  ScriptContinue = 0x0a,
  ScriptStepOverInstruction = 0x0b,
  ScriptStepIntoInstruction = 0x0c,
  ScriptStepOutInstruction = 0x0d,
}
