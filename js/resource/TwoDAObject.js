/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The TwoDAObject class.
 */

class TwoDAObject {

  constructor(file = null, onComplete = null){
    this.file = null;
    this.columns = ["(Row Label)"];
    this.rows = {};
    if(file != null){

      if(typeof file === "object") {
        let br = new BinaryReader(file);
        this.Read2DA(br);

        if(onComplete != null)
          onComplete();
      }

      if(typeof file === "string"){
        this.file = file;
        fs.readFile(this.file, (err, binary) => {
          if (err) throw err;

          let br = new BinaryReader(binary);
          this.Read2DA(br);

          if(onComplete != null)
            onComplete();
        });
      }

    }
  }

  Read2DA(br){
    this.FileType = br.ReadChars(4);
    this.FileVersion = br.ReadChars(4);

    br.position += 1; //10 = Newline (Skip)

    let str = "";
    let ch;
    while ((ch = br.ReadChar()).charCodeAt() != 0)
      str = str + ch;

    let columns = str.split(/\s|\t/);
    let colLen = columns.length;
    for(let i = 0; i < colLen; i++){
      if(columns[i].charCodeAt(0) != ''){
        this.columns[i+1] = columns[i];
      }
    }

    this.ColumnCount = this.columns.length - 2;
    this.RowCount = br.ReadUInt32();

    //Get the row index numbers
    let RowIndexes = [];
    for (let i = 0; i!=this.RowCount; i++){
      let rowIndex = "";
      let c;

      while ((c = br.ReadChar()).charCodeAt() != 9){
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

      let row = {"__index": i, "(Row Label)": RowIndexes[i] };

      for (let j = 0; j < this.ColumnCount; j++){

        let offset = dataOffset + offsets[i * this.ColumnCount + j];

        try{
          br.position = offset;
        }catch(e){
          throw new Exception();
        }

        let token = "";
        let c;

        while((c = br.ReadChar()).charCodeAt() != 0)
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
      if(this.rows[key]['(Row Label)'] == index){
        return this.rows[key];
      }
    }
  }

  static cellParser(cell){
    if(cell === '****'){
      return null;
    }else{
      return cell;
    }
  }

}
module.exports = TwoDAObject;
