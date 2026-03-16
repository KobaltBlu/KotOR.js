import { TLKManager } from "@/managers/TLKManager";
import { TwoDAObject, type ITwoDARowData } from "@/resource/TwoDAObject";

/**
 * SWItemPropsDef class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SWCostTable.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWCostTable {

  id: number;
  name: string;
  label: string;
  clientLoad: boolean;

  static From2DA(row: any = {}){
    const costTable = new SWCostTable();
    costTable.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    costTable.name = TwoDAObject.normalizeValue(row.name, 'string', '');
    costTable.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    costTable.clientLoad = TwoDAObject.normalizeValue(row.clientload, 'boolean', false);
    return costTable;
  }
}