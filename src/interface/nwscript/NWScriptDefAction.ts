import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";

export interface NWScriptDefAction {
  comment: string,
  name: string,
  type: NWScriptDataType,
  args: NWScriptDataType[],
  action?: (args: any[]) => any
};