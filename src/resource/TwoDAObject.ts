/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as fs from 'fs';
import { BinaryReader } from "../BinaryReader";

/* @file
 * The TwoDAObject class.
 */

export class TwoDAObject {

  file: Buffer|string|undefined = undefined;
  FileType: string;
  FileVersion: string;
  ColumnCount: number;
  RowCount: number;
  CellCount: number;
  columns: string[];
  rows: any = {};

  constructor(file: Buffer|string|undefined = undefined, onComplete: Function|undefined = undefined){
    this.file = file;
    this.columns = ["__rowlabel"];
    this.ColumnCount = 0;
    this.CellCount = 0;
    this.rows = {};
    
    if(!!file){
      if(file instanceof Buffer) {
        let br = new BinaryReader(file);
        this.Read2DA(br);

        if(onComplete != null)
          onComplete();
      }else if(typeof file === "string"){
        this.file = file;
        fs.readFile(this.file, (err, binary) => {
          if (err) throw err;

          let br = new BinaryReader(binary);
          this.Read2DA(br);

          if(onComplete != null)
            onComplete();
        });
      }else{
        //invalid resource
      }
    }else{
      //invalid resource
    }
  }

  Read2DA(br: BinaryReader): void {
    this.FileType = br.ReadChars(4);
    this.FileVersion = br.ReadChars(4);

    br.position += 1; //10 = Newline (Skip)

    let readingColumns:boolean = true;
    this.columns = [];//str.split(/\s|\t/);
    while(!!readingColumns){
      let label: string = br.ReadString();

      if(!label.length || label.charCodeAt(0) == 0){
        readingColumns = false;
      }else{
        this.columns.push(label);
      }
    }
    this.ColumnCount = this.columns.length;
    this.RowCount = br.ReadUInt32();

    //Get the row index numbers
    const RowIndexes: number[] = [];
    for (let i = 0; i < this.RowCount; i++){
      let rowIndex: string = br.ReadString();
      RowIndexes[i] = parseInt(rowIndex);
    }

    //Get the Row Data Offsets
    this.CellCount = this.ColumnCount * this.RowCount;
    let offsets: number[] = [];
    for (let i = 0; i < this.CellCount; i++){
      offsets[i] = br.ReadUInt16();
    }

    const dataBlockSize = br.ReadUInt16();
    let dataOffset: number = br.position;
    console.log(dataBlockSize, dataOffset);

    //Get the Row Data
    for (let i = 0; i < this.RowCount; i++){
      let row: any = {"__index": i, "__rowlabel": RowIndexes[i] };
      for (let j = 0; j < this.ColumnCount; j++){
        let offset = dataOffset + offsets[i * this.ColumnCount + j];
        br.position = offset;
        let value = br.ReadString();

        if(value == "")
          value = "****";

        row[this.columns[j]] = value;
      }
      console.log(i, row);
      this.rows[ i ] = row;
    }

  }

  getRowByIndex(index = -1){
    for (let key of Object.keys(this.rows)) {
      if(this.rows[key]['__index'] == index){
        return this.rows[key];
      }
    }
  }

  getByID(index = -1){
    for (let key of Object.keys(this.rows)) {
      if(this.rows[key]['__rowlabel'] == index){
        return this.rows[key];
      }
    }
  }

  getRowByColumnAndValue(column: string = '', value: any = undefined){
    for (let key of Object.keys(this.rows)) {
      if(this.rows[key][column] == value){
        return this.rows[key];
      }
    }
  }

  static cellParser(cell: any){
    if(cell === '****'){
      return null;
    }else{
      return cell;
    }
  }

}
