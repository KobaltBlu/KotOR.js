import { TLKManager } from "../managers/TLKManager";
import { CExoLocSubString } from "./CExoLocSubString";

/**
 * CExoLocString class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CExoLocString.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CExoLocString {

  RESREF: number;
  strings: CExoLocSubString[] = [];

  constructor(RESREF: number = -1) {
    this.RESREF = RESREF;
    this.strings = [];
  }

  addSubString(subString: CExoLocSubString|string, index = -1) {
    if(index == -1)
      index = this.strings.length;

    if( !(subString instanceof CExoLocSubString) ){
      subString = new CExoLocSubString(0, subString.toString());
    }

    this.strings[index] = subString;
    return this;
  }

  setRESREF(RESREF: number = -1) {
    this.RESREF = RESREF;
    return this;
  }

  getStrings(): CExoLocSubString[] {
    return this.strings;
  }

  getString(index = 0): CExoLocSubString {
    return this.strings[index];
  }

  getTLKValue(): string {
    return TLKManager.GetStringById(this.RESREF).Value;
  }

  getRESREF() {
    return this.RESREF;
  }

  stringCount() {
    return this.strings.length;
  }

  getValue(){
    if(this.strings.length){
      return this.strings[0].str;
    }else{
      if(this.RESREF > -1)
        return TLKManager.TLKStrings[this.RESREF].Value;
      else
        return '';
    }
  }
}