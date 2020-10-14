/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ERFObject class.
 */

class ERFObject {

  constructor(file = null, onComplete = null){
    this.file = file;
    this.LocalizedStrings = [];
    this.KeyList = [];
    this.Resources = [];
    this.HeaderSize = 160;

    this.Header = {
      FileType: 'MOD ',
      FileVersion: 'V1.0'
    };

    if(typeof file != 'string'){
      this.inMemory = true;
      this.buffer = file;
    }else{
      this.inMemory = false;
      this.pathInfo = path.parse(this.file);
    }

    try{

      if(this.inMemory){

        let header = Buffer.from(this.buffer, 0, this.HeaderSize);
        this.Reader = new BinaryReader(header);

        this.Header.FileType = this.Reader.ReadChars(4);
        this.Header.FileVersion = this.Reader.ReadChars(4);

        this.Header.LanguageCount = this.Reader.ReadUInt32();
        this.Header.LocalizedStringSize = this.Reader.ReadUInt32();
        this.Header.EntryCount = this.Reader.ReadUInt32();
        this.Header.OffsetToLocalizedString = this.Reader.ReadUInt32();
        this.Header.OffsetToKeyList = this.Reader.ReadUInt32();
        this.Header.OffsetToResourceList = this.Reader.ReadUInt32();
        this.Header.BuildYear = this.Reader.ReadUInt32();
        this.Header.BuildDay = this.Reader.ReadUInt32();
        this.Header.DescriptionStrRef = this.Reader.ReadUInt32();
        this.Header.Reserved = this.Reader.ReadBytes(116);                 //Byte 116

        header = this.Reader = null;

        //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
        this.erfDataOffset = (this.Header.OffsetToResourceList + (this.Header.EntryCount * 8));
        header = Buffer.from(this.buffer, 0, this.erfDataOffset);
        this.Reader = new BinaryReader(header);

        this.Reader.Seek(this.Header.OffsetToLocalizedString);

        for (let i = 0; i < this.Header.LanguageCount; i++) {
          let str = {};
          str.LanguageID = this.Reader.ReadUInt32();
          str.StringSize = this.Reader.ReadUInt32();
          str.String = this.Reader.ReadChars(str.StringSize);
          this.LocalizedStrings.push(str);
        }

        this.Reader.Seek(this.Header.OffsetToKeyList);

        for (let i = 0; i < this.Header.EntryCount; i++) {
          let str = {};
          str.ResRef = this.Reader.ReadChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
          str.ResID = this.Reader.ReadUInt32();
          str.ResType = this.Reader.ReadUInt16();
          str.Unused = this.Reader.ReadUInt16();
          this.KeyList.push(str);
        }

        this.Reader.Seek(this.Header.OffsetToResourceList);

        for (let i = 0; i < this.Header.EntryCount; i++) {
          let str = {};
          str.OffsetToResource = this.Reader.ReadUInt32();
          str.ResourceSize = this.Reader.ReadUInt32();
          this.Resources.push(str);
        }

        header = this.Reader = null;

        if(typeof onComplete == 'function')
          onComplete(this);

      }else{
        fs.open(this.file, 'r', (e, fd) => {
          if (e) {
            console.error('ERFObject', 'ERF Header Read', status.message);
            return;
          }
          let header = Buffer.alloc(this.HeaderSize);
          fs.read(fd, header, 0, this.HeaderSize, 0, (e, num) => {
            this.Reader = new BinaryReader(header);

            this.Header.FileType = this.Reader.ReadChars(4);
            this.Header.FileVersion = this.Reader.ReadChars(4);

            this.Header.LanguageCount = this.Reader.ReadUInt32();
            this.Header.LocalizedStringSize = this.Reader.ReadUInt32();
            this.Header.EntryCount = this.Reader.ReadUInt32();
            this.Header.OffsetToLocalizedString = this.Reader.ReadUInt32();
            this.Header.OffsetToKeyList = this.Reader.ReadUInt32();
            this.Header.OffsetToResourceList = this.Reader.ReadUInt32();
            this.Header.BuildYear = this.Reader.ReadUInt32();
            this.Header.BuildDay = this.Reader.ReadUInt32();
            this.Header.DescriptionStrRef = this.Reader.ReadUInt32();
            this.Header.Reserved = this.Reader.ReadBytes(116);               //Byte 116

            header = this.Reader = null;

            //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
            this.erfDataOffset = (this.Header.OffsetToResourceList + (this.Header.EntryCount * 8));
            header = Buffer.alloc(this.erfDataOffset);
            fs.read(fd, header, 0, this.erfDataOffset, 0, (e, num) => {
              this.Reader = new BinaryReader(header);

              this.Reader.Seek(this.Header.OffsetToLocalizedString);

              for (let i = 0; i < this.Header.LanguageCount; i++) {
                let str = {};
                str.LanguageID = this.Reader.ReadUInt32();
                str.StringSize = this.Reader.ReadUInt32();
                str.String = this.Reader.ReadChars(str.StringSize);
                this.LocalizedStrings.push(str);
              }

              this.Reader.Seek(this.Header.OffsetToKeyList);

              for (let i = 0; i < this.Header.EntryCount; i++) {
                let str = {};
                str.ResRef = this.Reader.ReadChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
                str.ResID = this.Reader.ReadUInt32();
                str.ResType = this.Reader.ReadUInt16();
                str.Unused = this.Reader.ReadUInt16();
                this.KeyList.push(str);
              }

              this.Reader.Seek(this.Header.OffsetToResourceList);

              for (let i = 0; i < this.Header.EntryCount; i++) {
                let str = {};
                str.OffsetToResource = this.Reader.ReadUInt32();
                str.ResourceSize = this.Reader.ReadUInt32();
                this.Resources.push(str);
              }

              header = this.Reader = null;

              fs.close(fd, function(e) {

                if(typeof onComplete == 'function')
                  onComplete(this);

                if (e) {
                  console.error('ERFObject', "close error:  " + error.message);
                } else {
                  console.log('ERFObject', "File was closed!");
                }
              });

            });

          });

        });
      }
    }catch(e){
      console.error('ERFObject', 'ERF Open Error', e);
      if(typeof onComplete == 'function')
        onComplete(this);
    }

  }

  getRawResource(key, restype, onComplete = null) {
    let resource = this.getResourceByKey(key, restype);
    if (resource != null) {

      if(resource.ResourceSize){
        let chunks = [];

        if(this.inMemory){
          let buffer = Buffer.alloc(resource.ResourceSize);
          this.buffer.copy(buffer, 0, resource.OffsetToResource, resource.OffsetToResource + (resource.ResourceSize - 1));

          if(typeof onComplete == 'function')
            onComplete(buffer);
        }else{

          fs.open(this.file, 'r', (e, fd) => {
            let buffer = Buffer.alloc(resource.ResourceSize);
            fs.read(fd, buffer, 0, buffer.length, resource.OffsetToResource, function(err, br, buf) {
              //console.log(err, buf);
              fs.close(fd, function(e) {
                if(typeof onComplete === 'function')
                  onComplete(buf);
              });
            });
          });

        }

      }else{
        if(onComplete != null)
          onComplete(Buffer.alloc(0));
      }

    }else{
      if(onComplete != null)
        onComplete(Buffer.alloc(0));
    }
  }

  getResourceByKey(key, restype){
      key = key.toLowerCase();

      for(let i = 0; i < this.KeyList.length; i++){
          let _key = this.KeyList[i];
          if (_key.ResRef == key && _key.ResType == restype) {
              return this.Resources[_key.ResID];
          }
      };
      return null;
  }

  exportRawResource(directory = null, resref = '', restype = 0x000F, onComplete = null) {
    if(directory != null){
      let resource = this.getResourceByKey(restype, resref);
      if(resource){
        if(this.inMemory){
          let buffer = Buffer.from(this.buffer, resource.DataOffset, resource.DataOffset + (resource.DataSize - 1));
          fs.writeFile(path.join(directory, resource.ResRef+'.'+ResourceTypes.getKeyByValue(resource.ResType)), buffer, (err) => {
            if (err) console.log(err);

            if(onComplete != null)
              onComplete(buffer);

          });
        }else{
          fs.open(this.file, 'r', function(err, fd) {
            if (err) {
              console.log('ERF Read', status.message);
              return;
            }
            let buffer = Buffer.alloc(resource.DataSize);
            fs.read(fd, buffer, 0, resource.DataSize, resource.DataOffset, function(err, num) {
              console.log('ERF Export', 'Writing File', path.join(directory, resource.ResRef+'.'+ResourceTypes.getKeyByValue(resource.ResType)));
              fs.writeFile(path.join(directory, resource.ResRef+'.'+ResourceTypes.getKeyByValue(resource.ResType)), buffer, (err) => {
                if (err) console.log(err);

                if(onComplete != null)
                  onComplete(buffer);

              });

            });
          });
        }
      }else{
        if(onComplete != null)
          onComplete(new ArrayBuffer(0));
      }
    }else{
      if(onComplete != null)
        onComplete(new ArrayBuffer(0));
    }
  }

  addResource(resref = null, reskey = null, data = null){

    let resId = this.Resources.push({
      OffsetToResource: -1,
      ResourceSize: data.length,
      data: data
    }) - 1;

    this.KeyList.push({
      ResRef: resref,
      ResID: resId,
      ResType: reskey,
      Unused: 0
    });

  }

  export( file = null, onExport = null, onError = null ){

    if(!file){
      throw 'Failed to export: Missing file path.';
    }

    let buffer = this.getExportBuffer();

    fs.writeFile( file, buffer, (err) => {
      if (err){
        if(typeof onError === 'function')
          onError(err);
      }else{
        if(typeof onExport === 'function')
          onExport(err);
      }
    });

  }

  getExportBuffer(){

    let output = new BinaryWriter();

    let keyEleLen = 24;
    let resEleLen = 8;
    let locStringsLen = 0;

    for(let i = 0; i < this.LocalizedStrings.length; i++){
      locStringsLen += (this.LocalizedStrings[i].String.length + 8);
    }

    this.Header.OffsetToLocalizedString = this.HeaderSize;
    this.Header.LanguageCount = this.LocalizedStrings.length;
    this.Header.EntryCount = this.KeyList.length;
    this.Header.OffsetToKeyList = this.HeaderSize + locStringsLen;
    this.Header.OffsetToResourceList = this.HeaderSize + locStringsLen + (this.Header.EntryCount * keyEleLen);

    //Offset to the beginning of the data block
    let offset = this.Header.OffsetToResourceList + (this.Header.EntryCount * resEleLen);
    //Update the resource data offsets
    for(let i = 0; i < this.Resources.length; i++){
      this.Resources[i].OffsetToResource = offset;
      offset += this.Resources[i].ResourceSize;
    }

    output.WriteChars(this.Header.FileType);
    output.WriteChars(this.Header.FileVersion);
    output.WriteUInt32(this.Header.LanguageCount);
    output.WriteUInt32(this.Header.LocalizedStringSize);
    output.WriteUInt32(this.Header.EntryCount);
    output.WriteUInt32(this.Header.OffsetToLocalizedString);
    output.WriteUInt32(this.Header.OffsetToKeyList);
    output.WriteUInt32(this.Header.OffsetToResourceList);
    output.WriteUInt32(new Date().getFullYear() - 1900);
    output.WriteUInt32(ERFObject.DayOfTheYear());
    output.WriteUInt32(0);
    output.WriteBytes(Buffer.alloc(116));

    //LocalStrings
    for(let i = 0; i < this.LocalizedStrings.length; i++){
      output.WriteUInt32(this.LocalizedStrings[i].LanguageID);
      output.WriteUInt32(this.LocalizedStrings[i].StringSize);
      output.WriteChars(this.LocalizedStrings[i].String);
    }

    //Key List
    for(let i = 0; i < this.KeyList.length; i++){
      output.WriteChars( this.KeyList[i].ResRef.padEnd(16, '\0').substr(0, 16) );
      output.WriteUInt32( this.KeyList[i].ResID );
      output.WriteUInt16( this.KeyList[i].ResType );
      output.WriteUInt16( 0 );
    }

    //Resource List
    for(let i = 0; i < this.Resources.length; i++){
      output.WriteUInt32( this.Resources[i].OffsetToResource );
      output.WriteUInt32( this.Resources[i].ResourceSize );
    }

    //Data
    for(let i = 0; i < this.Resources.length; i++){
      output.WriteBytes( this.Resources[i].data );
    }

    return output.buffer;
  }

}

ERFObject._erfCache = {};

ERFObject.DayOfTheYear = (date = null) => {

  if(!date){
    date = new Date(Date.now());
  }

  return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
};

module.exports = ERFObject;
