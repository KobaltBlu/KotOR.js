import { NWScriptDataType } from "../enums/nwscript/NWScriptDataType";
import { createScopedLogger, LogScope } from "../utility/Logger";

const log = createScopedLogger(LogScope.NWScript);

/** Value that can be stored in an NWScript stack slot (engine objects are typed as object). */
export type NWScriptStackValue = number | string | boolean | object | undefined;

export interface INWScriptStackVariableArgs {
  value?: NWScriptStackValue;
  type: NWScriptDataType;
}

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
  value: NWScriptStackValue;
  type: NWScriptDataType;

  constructor(args: INWScriptStackVariableArgs = { type: NWScriptDataType.VOID }){
    const { value, type } = args;
    this.value = value;
    this.type = type;

    if(this.value == null && this.type === NWScriptDataType.STRING){
      this.value = '';
      log.warn('NWScriptStackVariable: Undefined STRING, defaulting to empty string');
    }

    if(this.type === NWScriptDataType.INTEGER){
      if(this.value == null){
        this.value = 0;
        log.warn('NWScriptStackVariable: Undefined INTEGER, defaulting to 0');
      }

      if(typeof this.value === 'boolean'){
        this.value = this.value ? 1 : 0;
      }
    }
  }

}