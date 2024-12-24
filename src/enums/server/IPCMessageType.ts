export enum IPCMessageType {
  LogMessage = 0x00,
  CreateObject = 0x01,
  DestroyObject = 0x02,
  CreateScript = 0x03,
  DestroyScript = 0x04,
  LoadModule = 0x05,
  UnloadModule = 0x06,
  SetScriptBreakpoint = 0x07,
  RemoveScriptBreakpoint = 0x08,
}