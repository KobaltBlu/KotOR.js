import { TwoDAObject } from "../../resource/TwoDAObject";

interface IEXPTableRow {
  index: number;
  level: number;
  xp: number;
}

export class SWEXPTable {

  expTable: IEXPTableRow[] = [];
  expList: number[] = [];


  apply2DA(table: TwoDAObject){
    for(let i = 0; i < table.RowCount; i++){
      const row = table.rows[i];

      this.expTable[i] = {
        index: TwoDAObject.normalizeValue(row.rowLabel, 'number', 0),
        level: TwoDAObject.normalizeValue(row.level, 'number', 0),
        xp: TwoDAObject.normalizeValue(row.xp, 'number', 0)
      };

      this.expList[i] = TwoDAObject.normalizeValue(row.xp, 'number', 0);
    }
  }

  static From2DA(table: TwoDAObject){
    const xpTable = new SWEXPTable();
    xpTable.apply2DA(table);
    return xpTable;
  }
}
