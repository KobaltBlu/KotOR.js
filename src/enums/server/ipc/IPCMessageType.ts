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
  StepOverInstruction = 0x0B
}