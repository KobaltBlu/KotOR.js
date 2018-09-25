/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The KEYObject class.
 */

class KEYObject {

  constructor(file = null, onComplete = null){
    this.file = file;
    this.keys = [];
    fs.readFile(file, (err, binary) => {

      this.reader = new BinaryReader(binary);

      this.FileType = this.reader.ReadChars(4);
      this.FileVersion = this.reader.ReadChars(4);
      this.BIFCount = this.reader.ReadUInt32();
      this.KeyCount = this.reader.ReadUInt32();
      this.OffsetToFileTable = this.reader.ReadUInt32();
      this.OffsetToKeyTable = this.reader.ReadUInt32();
      this.BuildYear = this.reader.ReadUInt32();
      this.BuildDay = this.reader.ReadUInt32();
      this.Reserved = this.reader.ReadBytes(32);

      this.bifs = [];

      this.reader.Seek(this.OffsetToFileTable);
      for(let i = 0; i!=this.BIFCount; i++){
        this.bifs[i] = {FileSize:this.reader.ReadUInt32(), FilenameOffset: this.reader.ReadUInt32(), FilenameSize: this.reader.ReadUInt16(), Drives: this.reader.ReadUInt16()};

        let _pos = this.reader.position;
        this.reader.Seek(this.bifs[i].FilenameOffset);
        this.bifs[i].filename = this.reader.ReadChars(this.bifs[i].FilenameSize).replace(/\0[\s\S]*$/g,'')

        this.reader.Seek(_pos);

      }


      this.reader.Seek(this.OffsetToKeyTable);
      //let tmpKeys = [];
      for(let i = 0; i!=this.KeyCount; i++){
        this.keys[i] = {ResRef: this.reader.ReadChars(16).replace(/\0[\s\S]*$/g,''), ResType: this.reader.ReadUInt16(), ResID: this.reader.ReadUInt32()};
      }

      /*for(let i = 0; i!=tmpKeys.length; i++){
        let key = tmpKeys[i];
        this.keys[key.ResID] = key;
      }*/

      //console.log(this.keys);

      if(onComplete != null)
        onComplete();

    });


  }

  GetFileLabel(index = 0){
    for(let i = 0; i!=this.keys.length; i++){
      if(index == this.keys[i].ResID)
        return this.keys[i].ResRef;
    }
    /*try{
      return this.keys[index].ResRef;
    }catch(e) { return null; }*/
    return null;
  }

  GetFileKey(ResRef, ResType){
    for(let i = 0; i!=this.keys.length; i++){
      let key = this.keys[i];
      if ( key.ResRef == ResRef && key.ResType == ResType){
        return key;
      }
    }
    return null;
  }

  GetFileKeyByRes(Res){
    for(let i = 0; i!=this.keys.length; i++){
      let key = this.keys[i];
      if ( key.ResID == Res.ID && key.ResType == Res.ResType){
        return key;
      }
    }
    return null;
  }

  GetFileData(key = null, onComplete = null){

    if(key != null){

      let bifs = Object.keys(Global.kotorBIF);
      let bif = Global.kotorBIF[bifs[key.ResID >> 20]];

      if(typeof bif != undefined){
        bif.GetResourceData(bif.GetResourceById(key.ResID), onComplete);
        return true;
      }
      
      return false;

    }
    
    return false;
  
  }

  GetFileDataSync(key = null){
    
    if(key != null){

      let bifs = Object.keys(Global.kotorBIF);
      let bif = Global.kotorBIF[bifs[key.ResID >> 20]];

      if(typeof bif != undefined){
        return bif.GetResourceDataSync(bif.GetResourceById(key.ResID));
      }
      
      return null;

    }
    
    return null;
  
  }

}

module.exports = KEYObject;
