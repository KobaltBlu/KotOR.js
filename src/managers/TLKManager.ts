import { TLKString } from "../resource/TLKString";

export class TLKManager {

  static TLKStrings: TLKString[] = [];

  static GetStringById(index: number = 0){
    return TLKManager.TLKStrings[index];
  }

}