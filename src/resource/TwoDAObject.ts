import { BinaryReader } from "../BinaryReader";
import { GameFileSystem } from '../utility/GameFileSystem';
import { BinaryWriter } from '../BinaryWriter';

/**
 * TwoDAObject class.
 * 
 * Class representing a 2D Array file in memory.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TwoDAObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TwoDAObject {

  file: Uint8Array|string|undefined = undefined;
  FileType: string;
  FileVersion: string;
  ColumnCount: number;
  RowCount: number;
  CellCount: number;
  columns: string[];
  rows: any = {};

  constructor(file: Uint8Array|string|undefined = undefined, onComplete?: Function){
    this.file = file;
    this.columns = ["__rowlabel"];
    this.ColumnCount = 0;
    this.CellCount = 0;
    this.rows = {};
    
    if(!!file){
      if(file instanceof Uint8Array) {
        let br = new BinaryReader(file);
        this.read2DA(br);

        if(onComplete != null)
          onComplete();
      }else if(typeof file === "string"){
        this.file = file;
        GameFileSystem.readFile(this.file).then((buffer) => {
          let br = new BinaryReader(buffer);
          this.read2DA(br);

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

  read2DA(br: BinaryReader): void {
    this.FileType = br.readChars(4);
    this.FileVersion = br.readChars(4);

    br.position += 1; //0x0A = Newline (Skip)

    let str = "";
    let ch;
    this.columns = ["__rowlabel"];
    while ((ch = br.readChar()).charCodeAt(0) != 0){
      if(ch.charCodeAt(0) != 9){
        str = str + ch;
      }else{
        this.columns.push(str);
        str = '';
      }
    }

    this.ColumnCount = this.columns.length - 1;
    this.RowCount = br.readUInt32();

    //Get the row index numbers
    let RowIndexes = [];
    for (let i = 0; i < this.RowCount; i++){
      let rowIndex = "";
      let c;

      while ((c = br.readChar()).charCodeAt(0) != 9){
        rowIndex = rowIndex + c;
      }

      RowIndexes[i] = (rowIndex);
    }

    //Get the Row Data Offsets
    this.CellCount = this.ColumnCount * this.RowCount;
    let offsets = [];
    for (let i = 0; i < this.CellCount; i++){
      offsets[i] = br.readUInt16();
    }

    const dataSize = br.readUInt16();
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

        while((c = br.readChar()).charCodeAt(0) != 0)
          token = token + c;

        if(token == "")
          token = "****";

        row[this.columns[j+1]] = token;
      }

      this.rows[ i ] = row;

    }

  }

  toExportBuffer(): Uint8Array {
    try{
      const bw = new BinaryWriter();
      bw.writeChars('2DA ');
      bw.writeChars('V2.b');
      bw.writeByte(0x0A);//NewLine

      for(let i = 1; i < this.columns.length; i++){
        bw.writeChars(this.columns[i]);
        bw.writeByte(0x09); //HT Delineate Column Entry 
      }

      bw.writeByte(0x00); //Null Terminate Columns List

      const indexes = Object.keys(this.rows);
      //Write the row count as a UInt32
      bw.writeUInt32(indexes.length);

      for(let i = 0; i < indexes.length; i++){
        bw.writeChars(indexes[i]);
        bw.writeByte(0x09); //HT Delineate Row Index Entry 
      }

      const valuesWriter = new BinaryWriter();
      const values = new Map<string, number>(); //value, offset
      // values.set('Some Value', 0);
      for(let i = 0; i < indexes.length; i++){
        const index = indexes[i];
        const row = this.rows[index];
        const rowKeys = Object.keys(row);
        for(let j = 0; j < rowKeys.length; j++){
          const key = rowKeys[j];
          if(key != '__rowlabel' && key != '__index'){
            const value: string = row[key] == '****' ? '' : String(row[key]);
            if(values.has(value)){
              bw.writeUInt16(values.get(value));
            }else{
              const offset = valuesWriter.position;
              bw.writeUInt16(offset);
              valuesWriter.writeStringNullTerminated(value);
              values.set(value, offset);
            }
          }
        }
      }

      bw.writeUInt16(valuesWriter.buffer.length);
      bw.writeBytes(valuesWriter.buffer);

      return bw.buffer;
    }catch(e){
      console.error(e);
      return new Uint8Array(0);
    }
  }

  toCSV(): string {
    let csv = '';
    for(let i = 0; i < this.columns.length; i++){
      csv += this.columns[i];
      if(i < this.columns.length - 1) csv += ',';
    }
    csv += '\n';
    const indexes = Object.keys(this.rows);
    for(let i = 0; i < indexes.length; i++){
      const index = indexes[i];
      const row = this.rows[index];
      for(let j = 0; j < this.columns.length; j++){
        csv += row[this.columns[j]];
        if(j < this.columns.length - 1) csv += ',';
      }
      csv += '\n';
    }
    return csv;
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

  static normalizeValue(value: any, datatype: 'number'|'string'|'boolean', default_value: any){
    switch(datatype){
      case 'number':
        if(typeof default_value === 'undefined') default_value = 0;
        if(value === '****') return default_value;

        if(typeof value === 'string' && value.slice(0, 2) == '0x'){
          return parseInt(value);
        }
        
        value = parseFloat(value);
        if(isNaN(value)) value = default_value;
        return value;
      break;
      case 'string':
        if(typeof default_value === 'undefined') default_value = '';
        if(value === '****') return default_value;
        return value;
      break;
      case 'boolean':
        if(typeof default_value === 'undefined') default_value = false;
        if(value === '****') return default_value;
        return !!value;
      break;
    }
    console.warn('normalizeValue', 'unhandled datatype', value);
    return '';
  }

}
