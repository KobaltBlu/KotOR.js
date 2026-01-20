import EngineLocation from "../engine/EngineLocation";
import { IEngineGlobals } from "../interface/engine/IEngineGlobals";
import { TwoDAManager } from "./TwoDAManager";

/**
 * GlobalVariableManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GlobalVariableManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GlobalVariableManager {

  static Globals: IEngineGlobals = {
    Boolean   : new Map(), 
    Number    : new Map(), 
    String    : new Map(), 
    Location  : new Map(), 
  };
  
  public static Init(){
    const _initGlobals = TwoDAManager.datatables.get('globalcat').rows;
    for (const key in _initGlobals) {
      if (_initGlobals.hasOwnProperty(key)) {
        const globItem = _initGlobals[key];

        switch(globItem.type){
          case 'Boolean':
            GlobalVariableManager.Globals.Boolean.set(globItem.name.toLowerCase(), {name: globItem.name, value: false});
          break;
          case 'Location':
            GlobalVariableManager.Globals.Location.set(globItem.name.toLowerCase(), {name: globItem.name, value: new EngineLocation()});
          break;
          case 'Number':
            GlobalVariableManager.Globals.Number.set(globItem.name.toLowerCase(), {name: globItem.name, value: 0});
          break;
          case 'String':
            GlobalVariableManager.Globals.String.set(globItem.name.toLowerCase(), {name: globItem.name, value: ''});
          break;
        }
      }
    }
  }
  
  public static SetGlobalBoolean(name = '', value = false){
    const key = GlobalVariableManager.Globals.Boolean.get(name.toLocaleLowerCase());
    if(key){
      key.value = value ? true : false;
    }
  }

  public static GetGlobalBoolean(name = ''): boolean {
    const key = GlobalVariableManager.Globals.Boolean.get(name.toLocaleLowerCase());
    if(key){
      return key.value ? true : false;
    }

    return false;
  }

  public static SetGlobalNumber(name:string = '', value:number = 0){
    const key = GlobalVariableManager.Globals.Number.get(name.toLocaleLowerCase());
    if(key){
      key.value = Math.floor(value);
    }
  }

  public static GetGlobalNumber(name:string = ''): number {
    const key = GlobalVariableManager.Globals.Number.get(name.toLocaleLowerCase());
    if(key) return key.value;

    return 0;
  }

  public static SetGlobalString(name:string = '', value: string = ''){
    const key = GlobalVariableManager.Globals.String.get(name.toLocaleLowerCase());
    if(key){
      key.value = value;
    }
  }

  public static GetGlobalString(name:string = ''): string {
    const key = GlobalVariableManager.Globals.String.get(name.toLocaleLowerCase());
    if(key) return key.value;

    return '';
  }

  public static SetGlobalLocation(name = '', value = new EngineLocation){
    const key = GlobalVariableManager.Globals.Location.get(name.toLocaleLowerCase());
    if(key && value instanceof EngineLocation)
      key.value = value;
  }

  public static GetGlobalLocation(name = ''): EngineLocation {
    const key = GlobalVariableManager.Globals.Location.get(name.toLocaleLowerCase());
    if(key) return key.value;

    return new EngineLocation;
  }

}