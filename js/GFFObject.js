/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The GFFObject class.
 */

const GFFDataTypes = {
  BYTE: 0,
  CHAR: 1,
  WORD: 2,
  SHORT: 3,
  DWORD: 4,
  INT: 5,
  DWORD64: 6,
  INT64: 7,
  FLOAT: 8,
  DOUBLE: 9,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  VOID: 13,
  STRUCT: 14,
  LIST: 15,
  ORIENTATION: 16,
  VECTOR: 17,
};

class GFFObject {

  constructor(file, onComplete = null){

    //START EXPORT VARS

    this.BWStructs;
    this.BWFields;
    this.BWFieldData;
    this.BWLabels;
    this.BWFieldIndicies;
    this.BWListIndicies;

    this.FileType = '';
    this.FileVersion = 'V3.2';

    this.StructCount = 0;
    this.FieldCount = 0;
    this.LabelCount = 0;

    this.exportedLabels = [];
    this.path = null;
    this.resourceID = null;
    this.ext = null;

    this.signals = {
		    onSaved: new Signal(),
    		onUpdated: new Signal()
    };

    this.json = {};

    //END EXPORT VARS

    if(file == null){
      this.RootNode = new Struct(-1);
    }else{

      if(typeof file == 'string'){
        this.file = file;

        let fileInfo = path.parse(this.file);
        this.path = fileInfo.dir;
        this.file = fileInfo.name;
        this.ext = fileInfo.ext.substr(1);

        //let start = performance.now();
        //console.log(file)
        fs.readFile(file, (err, binary) => {
          this.resourceID = file;
          this.Parse(binary, onComplete);
        });

      }else{
        //if file is not a string then its a binary array
        this.Parse(file, onComplete);

        let templateResRef = this.RootNode.GetFieldByLabel('TemplateResRef');
        if(templateResRef instanceof Field){
          this.file = templateResRef.Value;
        }

      }

    }

  }

  static FromStruct(strt = null, type = -1){
    let gff = new GFFObject();
    if(strt instanceof Struct){
      gff.RootNode.Type = type;
      gff.RootNode.Fields = strt.Fields;
      gff.json = gff.ToJSON();
    }
    return gff;
  }

  //We use the ResourceID to tell where the file came from
  SetResourceID(resID = ''){
    this.resourceID = resID;
  }

  Parse(binary, onComplete = null){
    this.reader = new BinaryReader(binary);

    this.FileType = this.reader.ReadChars(4);
    this.FileVersion = this.reader.ReadChars(4);
    this.StructOffset = this.reader.ReadUInt32();
    this.StructCount = this.reader.ReadUInt32();
    this.FieldOffset = this.reader.ReadUInt32();
    this.FieldCount = this.reader.ReadUInt32();
    this.LabelOffset = this.reader.ReadUInt32();
    this.LabelCount = this.reader.ReadUInt32();
    this.FieldDataOffset = this.reader.ReadUInt32();
    this.FieldDataCount = this.reader.ReadUInt32();
    this.FieldIndicesOffset = this.reader.ReadUInt32();
    this.FieldIndicesCount = this.reader.ReadUInt32();
    this.ListIndicesOffset = this.reader.ReadUInt32();
    this.ListIndicesCount = this.reader.ReadUInt32();

    this.tmpStructArray = [];
    this.tmpLabelArray = [];
    this.tmpFieldsArray = [];

    //Start Structs
    this.reader.Seek(this.StructOffset);
    for (let i = 0; i < this.StructCount; i++) {
      this.tmpStructArray[i] = {Type: this.reader.ReadInt32(), DataOrDataOffset: this.reader.ReadInt32(), FieldCount: this.reader.ReadInt32()};
    }
    //End Structs

    //Start Labels
    this.reader.Seek(this.LabelOffset);
    for (let i = 0; i < this.LabelCount; i++) {
      this.tmpLabelArray[i] = this.reader.ReadChars(16).replace(/\0[\s\S]*$/g,'');
    }
    //End Labels

    //Start Fields
    this.reader.Seek(this.FieldOffset);
    for (let i = 0; i < this.FieldCount; i++) {
      this.tmpFieldsArray[i] = {Type: this.reader.ReadInt32(), Label: this.reader.ReadInt32(), Data: this.reader.ReadBytes(4), Val: "", Index: i};
    }
    //End Fields

    this.RootNode = this.BuildStruct(this.tmpStructArray[0]);

    this.reader = null;
    this.tmpStructArray = [];
    this.tmpLabelArray = [];
    this.tmpFieldsArray = [];

    this.json = this.ToJSON();

    if(onComplete != null){
      onComplete(this, this.RootNode);
    }

  }

  ToJSON(){
    return this._StructToJSON(this.RootNode);
  }

  _StructToJSON(s = null){
    
    let struct = {
      type: s.GetType(),
      fields: {}
    };

    for(let i = 0; i < s.Fields.length; i++){
      let f = s.Fields[i];
      struct.fields[f.Label] = this._FieldToJSON(f);
    }

    return struct;

  }

  _FieldToJSON(f = null){

    let field = {
      type: f.GetType(),
      value: f.GetValue(),
      structs: []
    };

    switch (f.GetType()) {
      case GFFDataTypes.CEXOLOCSTRING:
        field.value = f.GetCExoLocString();
      break;
      case GFFDataTypes.VOID:
        field.value = f.GetVoid();
      break;
      case GFFDataTypes.ORIENTATION:
        field.value = f.GetOrientation();
      break;
      case GFFDataTypes.VECTOR:
        field.value = f.GetVector();
      break;
    }

    let children = f.GetChildStructs();
    for(let i = 0; i < children.length; i++){
      field.structs[i] = this._StructToJSON(children[i]);
    }

    return field;

  }

  BuildStruct(struct){
    let strt = new Struct();

    strt.SetType(struct.Type);
    if (struct.FieldCount == 1){
      let index = struct.DataOrDataOffset;
      strt.AddField(this.BuildField(this.tmpFieldsArray[index]));
    }
    else if(struct.FieldCount != 0){
      let originalPos = this.reader.Tell();
      this.reader.Seek(this.FieldIndicesOffset + struct.DataOrDataOffset);
      for (let i = 0; i!=struct.FieldCount; i++){
        let index = this.reader.ReadInt32();
        strt.AddField(this.BuildField(this.tmpFieldsArray[index]));
      }
      this.reader.Seek(originalPos);
    }

    return strt;
  }

  BuildField(f){
    let field = new Field(f.Type, this.tmpLabelArray[f.Label]);

    let data = f.Data;
    let offset = data.readUInt32LE();

    let OriginalPos = this.reader.Tell();//Store the original position of the reader object
    switch (field.GetType()){
      case GFFDataTypes.BYTE: //Byte
        field.SetValue(data.readUInt8());
        break;
      case GFFDataTypes.CHAR: //Char
        field.SetValue(data.readUInt8());
        break;
      case GFFDataTypes.WORD: //UInt16
        field.SetValue(data.readUInt16LE());
        break;
      case GFFDataTypes.SHORT: //Int16
        field.SetValue(data.readInt16LE());
        break;
      case GFFDataTypes.DWORD: //UInt32
        field.SetValue(data.readUInt32LE());
        break;
      case GFFDataTypes.INT: //Int32
        field.SetValue(data.readInt32LE());
        break;
      case GFFDataTypes.FLOAT: //Float
        field.SetValue(data.readFloatLE());
        break;
      case GFFDataTypes.DWORD64: //Dword64
        field.SetData(this.GetDword64(offset));
        break;
      case GFFDataTypes.INT64: //Int64
        field.SetData(this.GetInt64(offset));
        break;
      case GFFDataTypes.DOUBLE: //Double
        field.SetValue(this.GetDouble(offset));
        break;
      case GFFDataTypes.CEXOSTRING:
        field.SetValue(this.GetCExoString(offset));
        break;
      case GFFDataTypes.RESREF:
        field.SetValue(this.GetRESREF(offset));
        break;
      case GFFDataTypes.CEXOLOCSTRING:
        field.SetCExoLocString(this.GetCExoLocString(offset));
        break;
      case GFFDataTypes.VOID:
        field.SetData(this.GetVoid(offset));
        break;
      case GFFDataTypes.STRUCT:
        field.AddChildStruct(this.BuildStruct(this.tmpStructArray[offset]));
        break;
      case GFFDataTypes.LIST:
        if (offset != 0xFFFFFFFF){
          this.reader.Seek(this.ListIndicesOffset + offset);
          let ListSize = this.reader.ReadUInt32();//The first 4 bytes indicate the size of the array
          let arr = [];
          for (let i = 0; i != ListSize; i++){
            arr[i] = this.BuildStruct(this.tmpStructArray[this.reader.ReadInt32()]);
          }

          field.SetChildStructs(arr);
        }
        break;
      case GFFDataTypes.ORIENTATION:
        field.SetOrientation(this.GetOrientation(offset));
        break;
      case GFFDataTypes.VECTOR:
        field.SetVector(this.GetVector(offset));
        break;
    }
    this.reader.Seek(OriginalPos);//Return the reader position to the original

    return field;
  }

  static TypeValueToString(val){
    for (let key in GFFDataTypes) {
      if (GFFDataTypes.hasOwnProperty(key)) {
        if(val == GFFDataTypes[key])
          return String(key);
      }
    }
    return null;
  }

  GetFieldByLabel(Label, Fields = null){
    if (Fields == null)
      Fields = this.RootNode.GetFields();

    for(let i = 0; i!=Fields.length; i++){
      let field = Fields[i];
      if (field.Label == Label){
        return field;
      }

      if (field.GetType() == GFFDataTypes.LIST || field.GetType() == GFFDataTypes.STRUCT){
        for(let j = 0; j!=field.GetChildStructs().length; j++){
          let str = field.GetChildStructs()[j];
          let child = this.GetFieldByLabel(Label, str.GetFields());
          if (child != null){
            return child;
          }
        }
      }
    }

    return null;
  }

  /*
  COMPLEXDATATYPE GETTERS
  */
  //Gets data from the FieldDataHeader
  GetRESREF(offset){
    let RESREF = "";
    let OriginalPos = this.reader.Tell();//Store the original position of the reader object
    this.reader.Seek(this.FieldDataOffset + offset);

    let length = this.reader.ReadByte();// Get the length of the string
    if (length != 0)
      RESREF = this.reader.ReadChars(length);

    this.reader.Seek(OriginalPos);//Return the reader position to the original
    return RESREF;
  }

  //Gets data from the FieldDataHeader
  GetCExoLocString(offset){
    //console.log('GetCExoLocString', offset);
    let data = new CExoLocString(-1);

    let OriginalPos = this.reader.Tell();//Store the original position of the reader object
    this.reader.Seek(this.FieldDataOffset + offset);

    let length = this.reader.ReadInt32();// Get the length of the string
    data.SetRESREF(this.reader.ReadInt32());
    let stringCount = this.reader.ReadInt32()

    for (let i = 0; i < stringCount; i++) {
      let stringID = this.reader.ReadInt32();
      let stringLength = this.reader.ReadInt32();
      let subString = new CExoLocSubString(stringID, this.reader.ReadChars(stringLength));
      data.AddSubString(subString);
    }

    //if (length != 0)
      //RESREF = new string(Reader.ReadChars(length));

    this.reader.Seek(OriginalPos);//Return the reader position to the original
    return data;
  }

  //Gets data from the FieldDataHeader
  GetCExoString(offset){
    let str = "";
    let OriginalPos = this.reader.Tell();//Store the original position of the reader object
    this.reader.Seek(this.FieldDataOffset + offset);
    //console.log('GetCExoString', this.FieldDataOffset + offset, this.FieldDataOffset, offset)
    let length = this.reader.ReadInt32();// Get the length of the string
    if (length != 0)
      str = this.reader.ReadChars(length);

    this.reader.Seek(OriginalPos);//Return the reader position to the original
    return str;
  }

  //Gets data from the FieldDataHeader
  GetDword64(offset){
    let OriginalPos = this.reader.Tell();//Store the original position of the reader object
    this.reader.Seek(this.FieldDataOffset + offset);
    let Dword64 = this.reader.ReadUInt64();
    this.reader.Seek(OriginalPos);//Return the reader position to the original
    return Dword64;
  }

  //Gets data from the FieldDataHeader
  GetInt64(offset){
    let OriginalPos = this.reader.Tell();//Store the original position of the reader object
    this.reader.Seek(this.FieldDataOffset + offset);
    let value = this.reader.ReadInt64();
    this.reader.Seek(OriginalPos);//Return the reader position to the original
    return value;
  }

  //Gets data from the FieldDataHeader
  GetDouble(offset){
    let OriginalPos = this.reader.Tell();//Store the original position of the reader object
    this.reader.Seek(this.FieldDataOffset + offset);
    let Double = this.reader.ReadDouble();
    this.reader.Seek(OriginalPos);//Return the reader position to the original
    return Double;
  }

  //Gets data from the FieldDataHeader
  GetOrientation(offset){
    let OriginalPos = this.reader.Tell();//Store the original position of the reader object
    this.reader.Seek(this.FieldDataOffset + offset);
    let o = {x: this.reader.ReadSingle(), y: this.reader.ReadSingle(), z: this.reader.ReadSingle(), w: this.reader.ReadSingle()};
    this.reader.Seek(OriginalPos);//Return the reader position to the original
    return o;
  }

  //Gets data from the FieldDataHeader
  GetVector(offset){
    let OriginalPos = this.reader.Tell();//Store the original position of the reader object
    this.reader.Seek(this.FieldDataOffset + offset);
    let v = {x: this.reader.ReadSingle(), y: this.reader.ReadSingle(), z: this.reader.ReadSingle()};
    this.reader.Seek(OriginalPos);//Return the reader position to the original
    return v;
  }

  GetVoid(offset){
    let OriginalPos = this.reader.Tell();//Store the original position of the reader object
    this.reader.Seek(this.FieldDataOffset + offset);
    let size =  this.reader.ReadUInt32();
    let bytes = this.reader.ReadBytes(size);
    this.reader.Seek(OriginalPos);//Return the reader position to the original
    return bytes;
  }

  DeleteField(f, strt = null){
    if(gff != null){
      if(strt == null){
        strt = this.RootNode;
      }
      $.each(strt.GetFields(), (i, field) => {
        if(field === f){
          strt.GetFields().splice(i, 1);
          return;
        }
        $.each(field.GetChildStructs(), (j, struct) => {
          this.DeleteField(f, struct);
        });
      });
    }
  }

  DeleteStruct(s, strt = null){
    if(gff != null){
      if(strt == null){
        strt = this.RootNode;
      }
      $.each(strt.GetFields(), (i, field) => {
        $.each(field.GetChildStructs(), (j, struct) =>{
          if(struct === s){
            field.GetChildStructs().splice(j, 1);
            return;
          }

          this.DeleteStruct(s, struct);
        });
      });
    }
  }

  Merge(gff){
    if(gff instanceof GFFObject){
      this.RootNode.MergeStruct(gff.RootNode);
    }
  }

  Save(file = '', onExport = null, onError = null){
    this.Export(file, onExport, onError);
  }

  Export(file = null, onExport = null, onError = null){

    let savePath = file ? file : this.file;

    if(!savePath){
      console.error('Export GFF: Missing Export Path');
      return;
    }

    console.log('Export GFF', savePath, this);
    let fileInfo = path.parse(savePath);

    //Update the TemplateResRef field if it exists
    let templateResRef = this.RootNode.GetFieldByLabel('TemplateResRef');
    if(templateResRef instanceof Field){
      fileInfo.name = templateResRef.Value = fileInfo.name.substr(0, 16);
      //fileInfo.base = fileInfo.name + '.'+this.FileType.substr(0, 3).toLowerCase();
      fileInfo.base = fileInfo.name + fileInfo.ext;
    }

    let buffer = this.GetExportBuffer();

    console.log('Export GFF', fileInfo, this);

    fs.writeFile( path.join(fileInfo.dir, fileInfo.base), buffer, (err) => {
      if (err){
        if(typeof onError === 'function')
          onError(err);
      }else{
        if(typeof onExport === 'function')
          onExport(err);
      }
    });

    this.signals.onSaved.dispatch( this );
    this.signals.onUpdated.dispatch( this );

  }

  GetExportBuffer(){

    this.BWStructs = new BinaryWriter();
    this.BWFields = new BinaryWriter();
    this.BWFieldData = new BinaryWriter();
    this.BWLabels = new BinaryWriter();
    this.BWFieldIndicies = new BinaryWriter();
    this.BWListIndicies = new BinaryWriter();

    this.exportedLabels = [];

    this.StructCount = 0;
    this.FieldCount = 0;
    this.LabelCount = 0;

    let bw = new BinaryWriter();

    this.ExportStruct(this.RootNode);

    let StructsLength = this.BWStructs.length;
    let FieldsLength = this.BWFields.length;
    let LabelsLength = this.BWLabels.length;
    let FieldDataLength = this.BWFieldData.length;
    let FieldIndiciesLength = this.BWFieldIndicies.length;
    let ListIndiciesLength = this.BWListIndicies.length;

    let _header = {
      FileType : this.FileType,
      FileVersion : this.FileVersion,
      StructOffset: 0, //(uint32)
      StructCount : this.StructCount, //(uint32)
      FieldOffset: 0, //(uint32)
      FieldCount : this.FieldCount, //(uint32)
      LabelOffset: 0, //(uint32)
      LabelCount : this.LabelCount, //(uint32)
      FieldDataOffset: 0, //(uint32)
      FieldDataCount : FieldDataLength, //(uint32)
      FieldIndicesOffset: 0, //(uint32)
      FieldIndicesCount : FieldIndiciesLength, //(uint32)
      ListIndicesOffset: 0, //(uint32)
      ListIndicesCount : ListIndiciesLength, //(uint32)
    };

    //Write the Structs data
    _header.StructOffset = 56;
    bw.position = _header.StructOffset;
    bw.Write(this.BWStructs.buffer);

    //Write the Fields data
    _header.FieldOffset = (_header.StructOffset + StructsLength); //(uint)
    bw.position = _header.FieldOffset;
    bw.Write(this.BWFields.buffer);

    //Write the Labels data
    _header.LabelOffset = (_header.FieldOffset + FieldsLength); //(uint)
    bw.position = _header.LabelOffset;
    bw.Write(this.BWLabels.buffer);

    //Write the FieldData data
    _header.FieldDataOffset = (_header.LabelOffset + LabelsLength); //(uint)
    bw.position = _header.FieldDataOffset;
    bw.Write(this.BWFieldData.buffer);

    //Write the FieldIndicies data
    _header.FieldIndicesOffset = (_header.FieldDataOffset + FieldDataLength); //(uint)
    bw.position = _header.FieldIndicesOffset;
    bw.Write(this.BWFieldIndicies.buffer);

    //Write the ListIndicies data
    _header.ListIndicesOffset = (_header.FieldIndicesOffset + FieldIndiciesLength); //(uint)
    bw.position = _header.ListIndicesOffset;
    bw.Write(this.BWListIndicies.buffer);

    bw.position = 0;

    bw.WriteChars(this.PadRight(_header.FileType, '\0', 4).substr(0, 4));
    bw.WriteChars(this.PadRight(_header.FileVersion, '\0', 4).substr(0, 4));
    bw.WriteUInt32(_header.StructOffset);
    bw.WriteUInt32(_header.StructCount);
    bw.WriteUInt32(_header.FieldOffset);
    bw.WriteUInt32(_header.FieldCount);
    bw.WriteUInt32(_header.LabelOffset);
    bw.WriteUInt32(_header.LabelCount);
    bw.WriteUInt32(_header.FieldDataOffset);
    bw.WriteUInt32(_header.FieldDataCount);
    bw.WriteUInt32(_header.FieldIndicesOffset);
    bw.WriteUInt32(_header.FieldIndicesCount);
    bw.WriteUInt32(_header.ListIndicesOffset);
    bw.WriteUInt32(_header.ListIndicesCount);

    bw.Close();

    this.BWStructs = undefined;
    this.BWFields = undefined;
    this.BWFieldData = undefined;
    this.BWLabels = undefined;
    this.BWFieldIndicies = undefined;
    this.BWListIndicies = undefined;

    return bw.buffer;
  }

  ExportStruct(strt = null){
    //console.log('Export Struct');
    let structIndex = this.StructCount;
    this.StructCount += 1;
    let fieldArray = [];

    let fieldIndieciesPos = this.BWFieldIndicies.position;
    //console.log(strt.GetType());
    this.BWStructs.WriteUInt32(strt.GetType() == -1 ? 0xFFFFFFFF : strt.GetType() );
    let offset = this.BWStructs.position;
    this.BWStructs.position += 4;
    this.BWStructs.WriteUInt32(strt.GetFields().length);

    //BWFieldIndicies.position += 4 * strt.GetFields().Count);
    $.each(strt.GetFields(), (i, f) => {
      //Export the Field and add its index to the fieldArray
      fieldArray.push(this.ExportField(f));
    });

    let DataOrDataOffset = 0;

    //If there is more than one index in the fieldArray then create an entry in the fieldIndiciesArray
    if (fieldArray.length == 1){
      let cached = this.BWStructs.position;
      DataOrDataOffset = fieldArray[0];

      this.BWStructs.position = offset;
      this.BWStructs.WriteUInt32(DataOrDataOffset);

      //Return the pointer to the previous position
      this.BWStructs.position = cached;
    } else {
      let returnTo = this.BWStructs.position;
      DataOrDataOffset = this.BWFieldIndicies.position;

      this.BWStructs.position = offset;
      this.BWStructs.WriteUInt32(DataOrDataOffset);

      //Return the pointer to the previous position
      this.BWStructs.position = returnTo;

      //console.log("Struct ID: " + strt.GetType());
      $.each(fieldArray, (i, index) => {
        this.BWFieldIndicies.WriteUInt32(index);
        //console.log("Field Indicie: " + index);
      });
    }

    return structIndex;
  }

  //The method returns the exported fields index in the FieldsArray
  ExportField(field = null){
    //console.log('Export Field');
    let fieldIndex = this.FieldCount;
    //console.log("Field Index: " + fieldIndex);
    this.FieldCount += 1;
    //console.log("Field Offset: " + this.BWFields.position);
    //console.log(field.GetLabel(), field.GetType())
    this.BWFields.WriteUInt32(field.GetType());
    this.BWFields.WriteUInt32(this.ExportLabel(field.GetLabel()));
    let cached = this.BWFields.position;//Cache the position where we are going to write the placeholder value
    //BWFields.Write((uint)'\0');
    switch (field.GetType()) {
      case GFFDataTypes.BYTE:
        this.BWFields.WriteUInt32(field.Value);
        break;
      case GFFDataTypes.CEXOLOCSTRING:
        this.BWFields.WriteUInt32(this.BWFieldData.position);
        //Figure out the total length of the CExoLocString structure
        let CExoLocStringTotalSize = 8;//the size of two DWORDS
        $.each(field.GetCExoLocString().GetStrings(), (i, sub) => {
          //the size of two DWORDS plus the string length
          CExoLocStringTotalSize += (8 + sub.getString().length);
        });

        this.BWFieldData.WriteUInt32(CExoLocStringTotalSize);
        this.BWFieldData.WriteUInt32(field.GetCExoLocString().GetRESREF() == -1 ? 0xFFFFFFFF : field.GetCExoLocString().GetRESREF() );
        this.BWFieldData.WriteUInt32(field.GetCExoLocString().GetStrings().length);

        $.each(field.GetCExoLocString().GetStrings(), (i, sub) => {
          this.BWFieldData.WriteUInt32(sub.GetStringID());
          this.BWFieldData.WriteUInt32(sub.getString().length);
          this.BWFieldData.WriteChars(sub.getString());
        });

        break;
      case GFFDataTypes.CEXOSTRING:
        this.BWFields.WriteUInt32(this.BWFieldData.position);
        this.BWFieldData.WriteUInt32(field.Value.length);
        this.BWFieldData.WriteChars(field.Value);
        break;
      case GFFDataTypes.CHAR:
        this.BWFields.WriteUInt32(field.Value.charCodeAt());
        break;
      case GFFDataTypes.DOUBLE:
        this.BWFields.WriteUInt32(this.BWFieldData.position);
        this.BWFieldData.WriteDouble(field.Value);
        break;
      case GFFDataTypes.DWORD:
        this.BWFields.WriteUInt32(field.Value);
        break;
      case GFFDataTypes.DWORD64:
        this.BWFields.WriteUInt32(this.BWFieldData.position);
        this.BWFieldData.WriteBytes(field.Data);
        break;
      case GFFDataTypes.FLOAT:
        this.BWFields.WriteSingle(field.Value);
        break;
      case GFFDataTypes.INT:
        this.BWFields.WriteUInt32(field.Value);
        break;
      case GFFDataTypes.INT64:
        this.BWFields.WriteUInt32(this.BWFieldData.position);
        Bthis.WFieldData.WriteBytes(field.Data);
        break;
      case GFFDataTypes.LIST:
        if (field.GetChildStructs().length == 0){
            this.BWFields.WriteUInt32(0xFFFFFFFF);
        }
        else {
            this.BWFields.WriteUInt32(this.BWListIndicies.position);
            this.BWListIndicies.WriteUInt32(field.GetChildStructs().length);
            $.each(field.GetChildStructs(), (i, strt) => {
              //console.log('LIST: Child Struct');
              this.BWListIndicies.WriteUInt32(this.ExportStruct(strt));
            });
        }
        break;
      case GFFDataTypes.ORIENTATION:
        //Export the Orientation data to the FieldData block and record the offset with the field
        this.BWFields.WriteUInt32(this.BWFieldData.position);
        this.BWFieldData.WriteSingle(field.GetOrientation().x);
        this.BWFieldData.WriteSingle(field.GetOrientation().y);
        this.BWFieldData.WriteSingle(field.GetOrientation().z);
        this.BWFieldData.WriteSingle(field.GetOrientation().w);
        break;
      case GFFDataTypes.RESREF:
        this.BWFields.WriteUInt32(this.BWFieldData.position);
        this.BWFieldData.WriteByte(field.Value.length);
        this.BWFieldData.WriteChars(field.Value);
        break;
      case GFFDataTypes.SHORT:
        this.BWFields.WriteUInt32(field.Value);
        break;
      case GFFDataTypes.STRUCT:
        //BWFields.Write((uint)0);//Write a placeholder value
        //console.log('Export Child Struct')
        this.BWFields.position += 4;

        let index = this.ExportStruct(field.GetChildStructs()[0]);

        let returnTo = this.BWFields.position;
        this.BWFields.position = cached;
        this.BWFields.WriteUInt32(index);//Write the struct index value
        this.BWFields.position = returnTo;
        break;
      case GFFDataTypes.VECTOR:
        //Export the vector data to the FieldData block and record the offset with the field
        this.BWFields.WriteUInt32(this.BWFieldData.position);
        this.BWFieldData.WriteSingle(field.GetVector().x);
        this.BWFieldData.WriteSingle(field.GetVector().y);
        this.BWFieldData.WriteSingle(field.GetVector().z);
        break;
      case GFFDataTypes.VOID:
        this.BWFields.WriteUInt32(this.BWFieldData.position);
        this.BWFieldData.WriteUInt32(field.GetVoid().length);
        this.BWFieldData.WriteBytes(field.GetVoid());
        break;
      case GFFDataTypes.WORD:
        this.BWFields.WriteUInt32(field.Value);
        break;
      default:
        throw('Unknown');
    }

    return fieldIndex;
  }

  ExportLabel(label = ""){
    if (this.exportedLabels.indexOf(label) == -1){
      this.exportedLabels.push(label);
      this.LabelCount++;

      //PadRight is not implemented in JavaScript
      let newLabel = this.PadRight(label, '\0', 16);

      this.BWLabels.WriteChars(newLabel.substr(0, 16));
    }

    //console.log(label, this.exportedLabels.indexOf(label), this.exportedLabels)
    return this.exportedLabels.indexOf(label);
  }

  PadRight(str = "", pad = '\0', count = 16){
    let newLabel = str;
    while(newLabel.length < count){
      newLabel+=pad;
    }
    return newLabel;
  }

}

class Struct {

  constructor(Type = 0){
    this.Fields = [];
    this.Type = Type;
  }

  SetType(i){
    this.Type = i;
    return this;
  }

  AddField(field){
    return this.Fields[this.Fields.length] = field;
  }

  GetType(){
    return this.Type;
  }

  GetFields(){
    return this.Fields;
  }

  GetFieldByLabel(Label){

    for(let i = 0; i!=this.Fields.length; i++){
      let field = this.Fields[i];
      if (field.Label == Label){
        return field;
      }

      /*if (field.GetType() == GFFDataTypes.LIST || field.GetType() == GFFDataTypes.STRUCT){
        for(let j = 0; j!=field.GetChildStructs().length; j++){
          let str = field.GetChildStructs()[j];
          let child = str.GetFieldByLabel(Label);
          if (child != null){
            return child;
          }
        }
      }*/
    }

    return null;
  }

  MergeStruct(strt){
    if(strt instanceof Struct){
      for(let i = 0; i < strt.Fields.length; i++){
        this.Fields.push(strt.Fields[i]);
      }
    }
    return this;
  }

  HasField(Label){
    for(let i = 0; i!=this.Fields.length; i++){
      let field = this.Fields[i];
      if (field.Label == Label)
        return true;
    }
    return false;
  }

}


class Field {

  constructor(Type = 0, Label = "", Value = 0){
    this.Type = Type;
    this.Label = Label;
    this.Data = [];
    this.Value = Value;
    this.ChildStructs = [];
    this.CExoLocString = null;
    this.Vector = null;
    this.Orientation = null;

    switch(this.Type){
      case GFFDataTypes.CEXOSTRING:
      case GFFDataTypes.RESREF:
        if(typeof this.Value !== 'string')
          this.Value = '';
      break;
      case GFFDataTypes.CEXOLOCSTRING:
        this.CExoLocString = new CExoLocString();
      break;
    }

  }

  GetType(){
    return this.Type;
  }

  GetLabel(){
    return this.Label;
  }

  GetVoid(){
    return this.Data;
  }

  GetValue(){
    switch(this.Type){
      case GFFDataTypes.CEXOLOCSTRING:
        return this.CExoLocString.GetValue();
      default:
        return this.Value;
    }
  }

  GetVector(){
    return this.Vector;
  }

  GetChildStructs(){
    return this.ChildStructs;
  }

  GetChildStructByType(type = -1){
    for(let i = 0; i < this.ChildStructs.length; i++){
      if(this.ChildStructs[i].Type == type)
        return this.ChildStructs[i];
    }
    return null;
  }

  GetFieldByLabel(Label){
    if(this.ChildStructs.length){
      for(let i = 0; i!=this.ChildStructs[0].Fields.length; i++){
        let field = this.ChildStructs[0].Fields[i];
        if (field.Label == Label){
          return field;
        }
      }
    }

    return null;
  }

  GetCExoLocString(){
    return this.CExoLocString;
  }

  GetOrientation(){
    return this.Orientation;
  }

  SetData(data){
    this.Data = data;
  }

  SetValue(val){

    switch(this.Type){
      case GFFDataTypes.CEXOLOCSTRING:
        if(typeof val === 'number'){
          this.CExoLocString.SetRESREF(val);
        }else if(typeof val === 'string'){
          this.CExoLocString.AddSubString(val, 0);
        }
      break;
      default:
        this.Value = val;
      break;
    }

  }

  SetType(type){
    this.Type = type;
  }

  SetLabel(label){
    this.Label = label;
  }

  SetCExoLocString(val){
    this.CExoLocString = val;
  }

  SetVector(v){
    this.Vector = v;
  }

  SetOrientation(v){
    this.Orientation = v;
  }

  AddChildStruct(strt){
    this.ChildStructs.push(strt);
  }

  RemoveChildStruct(strt){
    let index = this.ChildStructs.indexOf(strt);
    if(index >= 0){
      this.ChildStructs.splice(index, 1);
    }
  }

  SetChildStructs(strts){
    this.ChildStructs = strts;
  }

}

class CExoLocString {

  constructor(RESREF = -1) {
    this.RESREF = RESREF;
    this.strings = [];
  }

  AddSubString(subString, index = -1) {
    if(index == -1)
      index = this.strings.length;

    this.strings[index] = subString;
    return this;
  }

  SetRESREF(RESREF = -1) {
    this.RESREF = RESREF;
    return this;
  }

  GetStrings() {
    return this.strings;
  }

  GetString(index = 0) {
    return this.strings[index];
  }

  GetTLKValue(onVal) {
    return Global.kotorTLK.GetStringById(this.RESREF, onVal);
  }

  GetRESREF() {
    return this.RESREF;
  }

  StringCount() {
    return strings.length;
  }

  GetValue(){
    if(this.strings.length){
      return this.strings[0].str;
    }else{
      if(this.RESREF > -1)
        return Global.kotorTLK.TLKStrings[this.RESREF].Value;
      else
        return '';
    }
  }
}

class CExoLocSubString {

  constructor(stringId = 0, str) {
    this.language = Math.floor(stringId / 2);
    this.gender = stringId % 2;
    this.StringID = stringId;
    this.str = str; //1024 character limit
  }

  getLanguage() {
    return this.language;
  }

  getGender() {
    return this.gender;
  }

  GetStringID() {
    return (this.language * 2) + this.gender;
  }

  getString() {
    return this.str;
  }

  setLanguage(lang) {
    this.language = lang;
  }

  setGender(gender) {
    this.gender = gender;
  }

  setString(str) {
    this.str = str;
  }

  setStringID(StringID = 0){
    this.StringID = StringID;
    this.language = Math.floor(StringID / 2);
    this.gender = StringID % 2;
  }

}

CExoLocString.LANGUAGEID = {
  'English' : 0,
  'French' : 1,
  'German' : 2,
  'Italian' : 3,
  'Spanish' : 4,
  'Polish' : 5,
  'Korean' : 128,
  'Chinese Traditional' : 129,
  'Chinese Simplified' : 130,
  'Japanese' : 131
};

module.exports = {
  GFFObject: GFFObject,
  GFFDataTypes: GFFDataTypes,
  Struct: Struct,
  Field: Field,
  CExoLocString: CExoLocString,
  CExoLocSubString: CExoLocSubString
}
