export enum IPCMessageTypeDebug {
  Open = 0x01,
  Close = 0x02,

  ScriptSetBreakpoint = 0x07,
  ScriptRemovetBreakpoint = 0x08,
  ScriptUpdateState = 0x09,
  ScriptContinue = 0x0A,
  ScriptStepOverInstruction = 0x0B,
  ScriptStepIntoInstruction = 0x0C,
  ScriptStepOutInstruction = 0x0D
}