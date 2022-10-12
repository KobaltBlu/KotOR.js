import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";

export class NWScriptStackVariable {
  value: any;
  type: any;

  constructor(args: any = {}){
    const {value, type} = args;
    this.value = value;
    this.type = type;

    if(this.value == undefined && this.type == NWScriptDataType.STRING){
      this.value = ''; console.warn('NWScriptStackVariable', 'Undefined STRING');
    }

    if(this.value == undefined && this.type == NWScriptDataType.INTEGER){
      this.value = 0; console.warn('NWScriptStackVariable', 'Undefined INTEGER');
    }
  }

}