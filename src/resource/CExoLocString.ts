import { TLKManager } from "../managers/TLKManager";
import { CExoLocSubString } from "./CExoLocSubString";

export class CExoLocString {

  RESREF: number;
  strings: CExoLocSubString[] = [];

  constructor(RESREF: number = -1) {
    this.RESREF = RESREF;
    this.strings = [];
  }

  AddSubString(subString: CExoLocSubString|string, index = -1) {
    if(index == -1)
      index = this.strings.length;

    if( !(subString instanceof CExoLocSubString) ){
      subString = new CExoLocSubString(0, subString.toString());
    }

    this.strings[index] = subString;
    return this;
  }

  SetRESREF(RESREF: number = -1) {
    this.RESREF = RESREF;
    return this;
  }

  GetStrings(): CExoLocSubString[] {
    return this.strings;
  }

  GetString(index = 0): CExoLocSubString {
    return this.strings[index];
  }

  GetTLKValue() {
    return TLKManager.GetStringById(this.RESREF).Value;
  }

  GetRESREF() {
    return this.RESREF;
  }

  StringCount() {
    return this.strings.length;
  }

  GetValue(){
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