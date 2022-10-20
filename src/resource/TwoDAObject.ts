/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as fs from 'fs';
import isBuffer from 'is-buffer';
import { BinaryReader } from "../BinaryReader";
import { GameFileSystem } from '../utility/GameFileSystem';

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

  constructor(file: Buffer|string|undefined = undefined, onComplete?: Function){
    this.file = file;
    this.columns = ["__rowlabel"];
    this.ColumnCount = 0;
    this.CellCount = 0;
    this.rows = {};
    
    if(!!file){
      if(isBuffer(file)) {
        let br = new BinaryReader(file as Buffer);
        this.Read2DA(br);

        if(onComplete != null)
          onComplete();
      }else if(typeof file === "string"){
        this.file = file;
        GameFileSystem.readFile(this.file).then((buffer) => {
          let br = new BinaryReader(buffer);
          this.Read2DA(br);

          if(onComplete != null)
            onComplete();
        }).catch((err) => {
          throw err;
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

    let str = "";
    let ch;
    this.columns = ["__rowlabel"];
    while ((ch = br.ReadChar()).charCodeAt(0) != 0){
      if(ch.charCodeAt(0) != 9){
        str = str + ch;
      }else{
        this.columns.push(str);
        str = '';
      }
    }

    this.ColumnCount = this.columns.length - 1;
    this.RowCount = br.ReadUInt32();

    //Get the row index numbers
    let RowIndexes = [];
    for (let i = 0; i < this.RowCount; i++){
      let rowIndex = "";
      let c;

      while ((c = br.ReadChar()).charCodeAt(0) != 9){
        rowIndex = rowIndex + c;
      }

      RowIndexes[i] = parseInt(rowIndex);
    }

    //Get the Row Data Offsets
    this.CellCount = this.ColumnCount * this.RowCount;
    let offsets = [];
    for (let i = 0; i < this.CellCount; i++){
      offsets[i] = br.ReadUInt16();
    }

    br.position += 2;
    let dataOffset = br.position;

    //Get the Row Data
    for (let i = 0; i < this.RowCount; i++){

      let row: any = {"__index": i, "__rowlabel": RowIndexes[i] };

      for (let j = 0; j < this.ColumnCount; j++){

        let offset = dataOffset + offsets[i * this.ColumnCount + j];

        try{
          br.position = offset;
        }catch(e){
          console.error(e);
          throw e;
        }

        let token = "";
        let c;

        while((c = br.ReadChar()).charCodeAt(0) != 0)
          token = token + c;

        if(token == "")
          token = "****";

        row[this.columns[j+1]] = token;
      }

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
