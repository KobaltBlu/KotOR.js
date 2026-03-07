import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";

/**
 * NWScriptStackVariable class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptStackVariable.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptStackVariable {
  value: any;
  type: NWScriptDataType;

  constructor(args: any = {}){
    const {value, type} = args;
    this.value = value;
    this.type = type;

    if(this.value == undefined && this.type == NWScriptDataType.STRING){
      this.value = ''; console.warn('NWScriptStackVariable', 'Undefined STRING');
    }

    if(this.type == NWScriptDataType.INTEGER){
      if(this.value == undefined){
        this.value = 0; console.warn('NWScriptStackVariable', 'Undefined INTEGER');
      }

      if(typeof this.value === 'boolean'){
        this.value = this.value ? 1 : 0;
      }
    }
  }

}