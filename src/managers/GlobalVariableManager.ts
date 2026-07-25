import EngineLocation from "@/engine/EngineLocation";
import { IEngineGlobals } from "@/interface/engine/IEngineGlobals";
import { TwoDAManager } from "@/managers/TwoDAManager";

export type GlobalVariableCatalogType = 'Boolean' | 'Number' | 'String' | 'Location';

export interface GlobalVariableCatalogEntry {
  name: string;
  type: GlobalVariableCatalogType;
}

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

  /**
   * Retail CSWGlobalVariableTable identifiers walk order from globalcat.2da
   * (row index 0 .. RowCount-1). ExportGlobalVars emits Cat and Val lists in this order.
   */
  static Catalog: GlobalVariableCatalogEntry[] = [];
  
  public static Init(){
    GlobalVariableManager.Globals.Boolean.clear();
    GlobalVariableManager.Globals.Number.clear();
    GlobalVariableManager.Globals.String.clear();
    GlobalVariableManager.Globals.Location.clear();
    GlobalVariableManager.Catalog = [];

    const table = TwoDAManager.datatables.get('globalcat');
    if(!table){ return; }

    const rowCount = table.RowCount | 0;
    for (let i = 0; i < rowCount; i++) {
      const globItem = table.rows[i] || table.getRowByIndex?.(i);
      if(!globItem || !globItem.name){ continue; }

      const type = String(globItem.type || '') as GlobalVariableCatalogType;
      switch(type){
        case 'Boolean':
          GlobalVariableManager.Globals.Boolean.set(globItem.name.toLowerCase(), {name: globItem.name, value: false});
          GlobalVariableManager.Catalog.push({ name: globItem.name, type });
          break;
        case 'Location':
          GlobalVariableManager.Globals.Location.set(globItem.name.toLowerCase(), {name: globItem.name, value: new EngineLocation()});
          GlobalVariableManager.Catalog.push({ name: globItem.name, type });
          break;
        case 'Number':
          GlobalVariableManager.Globals.Number.set(globItem.name.toLowerCase(), {name: globItem.name, value: 0});
          GlobalVariableManager.Catalog.push({ name: globItem.name, type });
          break;
        case 'String':
          GlobalVariableManager.Globals.String.set(globItem.name.toLowerCase(), {name: globItem.name, value: ''});
          GlobalVariableManager.Catalog.push({ name: globItem.name, type });
          break;
      }
    }
  }

  /** Catalog entries of a given type in retail identifier / globalcat row order. */
  public static getCatalogByType(type: GlobalVariableCatalogType): GlobalVariableCatalogEntry[] {
    return GlobalVariableManager.Catalog.filter((e) => e.type === type);
  }
  
  public static SetGlobalBoolean(name = '', value = false){
    let key = GlobalVariableManager.Globals.Boolean.get(name.toLocaleLowerCase());
    if(key){
      key.value = value ? true : false;
    }
  }

  public static GetGlobalBoolean(name = ''): boolean {
    let key = GlobalVariableManager.Globals.Boolean.get(name.toLocaleLowerCase());
    if(key){
      return key.value ? true : false;
    }

    return false;
  }

  public static SetGlobalNumber(name:string = '', value:number = 0){
    let key = GlobalVariableManager.Globals.Number.get(name.toLocaleLowerCase());
    if(key){
      key.value = Math.floor(value);
    }
  }

  public static GetGlobalNumber(name:string = ''): number {
    let key = GlobalVariableManager.Globals.Number.get(name.toLocaleLowerCase());
    if(key) return key.value;

    return 0;
  }

  public static SetGlobalString(name:string = '', value: string = ''){
    let key = GlobalVariableManager.Globals.String.get(name.toLocaleLowerCase());
    if(key){
      key.value = value;
    }
  }

  public static GetGlobalString(name:string = ''): string {
    let key = GlobalVariableManager.Globals.String.get(name.toLocaleLowerCase());
    if(key) return key.value;

    return '';
  }

  public static SetGlobalLocation(name = '', value = new EngineLocation){
    let key = GlobalVariableManager.Globals.Location.get(name.toLocaleLowerCase());
    if(key && value instanceof EngineLocation)
      key.value = value;
  }

  public static GetGlobalLocation(name = ''): EngineLocation {
    let key = GlobalVariableManager.Globals.Location.get(name.toLocaleLowerCase());
    if(key) return key.value;

    return new EngineLocation;
  }

}
