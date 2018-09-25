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

    if(typeof file != 'string'){
      this.inMemory = true;
    }else{
      this.inMemory = false;
      this.pathInfo = path.parse(this.file);
    }

    try{

      if(this.inMemory){

        var header = Buffer.from(this.file, 0, this.HeaderSize);
        this.Reader = new BinaryReader(header);

        this.Header = {};

        this.Header.FileType = this.Reader.ReadChars(4);
        this.Header.FileVersion = this.Reader.ReadChars(4);

        this.Header.LanguageCount = this.Reader.ReadInt32();
        this.Header.LocalizedStringSize = this.Reader.ReadInt32();
        this.Header.EntryCount = this.Reader.ReadInt32();
        this.Header.OffsetToLocalizedString = this.Reader.ReadInt32();
        this.Header.OffsetToKeyList = this.Reader.ReadInt32();
        this.Header.OffsetToResourceList = this.Reader.ReadInt32();
        this.Header.BuildYear = this.Reader.ReadBytes(4);                //Byte 4
        this.Header.BuildDay = this.Reader.ReadBytes(4);                 //Byte 4
        this.Header.DescriptionStrRef = this.Reader.ReadBytes(4);        //Byte 4
        this.Header.Reserved = this.Reader.ReadBytes(116);                 //Byte 116

        header = this.Reader = null;

        //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
        this.erfDataOffset = (this.Header.OffsetToResourceList + (this.Header.EntryCount * 8));
        header = Buffer.from(this.file, 0, this.erfDataOffset);
        this.Reader = new BinaryReader(header);

        this.Reader.Seek(this.Header.OffsetToLocalizedString);

        for (let i = 0; i < this.Header.LanguageCount; i++) {
          let str = {};
          str.LanguageID = this.Reader.ReadInt32();
          str.StringSize = this.Reader.ReadInt32();
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
          var header = new Buffer(this.HeaderSize);
          fs.read(fd, header, 0, this.HeaderSize, 0, (e, num) => {
            this.Reader = new BinaryReader(header);

            this.Header = {};

            this.Header.FileType = this.Reader.ReadChars(4);
            this.Header.FileVersion = this.Reader.ReadChars(4);

            this.Header.LanguageCount = this.Reader.ReadInt32();
            this.Header.LocalizedStringSize = this.Reader.ReadInt32();
            this.Header.EntryCount = this.Reader.ReadInt32();
            this.Header.OffsetToLocalizedString = this.Reader.ReadInt32();
            this.Header.OffsetToKeyList = this.Reader.ReadInt32();
            this.Header.OffsetToResourceList = this.Reader.ReadInt32();
            this.Header.BuildYear = this.Reader.ReadBytes(4);                //Byte 4
            this.Header.BuildDay = this.Reader.ReadBytes(4);                 //Byte 4
            this.Header.DescriptionStrRef = this.Reader.ReadBytes(4);        //Byte 4
            this.Header.Reserved = this.Reader.ReadBytes(116);                 //Byte 116

            header = this.Reader = null;

            //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
            this.erfDataOffset = (this.Header.OffsetToResourceList + (this.Header.EntryCount * 8));
            header = new Buffer(this.erfDataOffset);
            fs.read(fd, header, 0, this.erfDataOffset, 0, (e, num) => {
              this.Reader = new BinaryReader(header);

              this.Reader.Seek(this.Header.OffsetToLocalizedString);

              for (let i = 0; i < this.Header.LanguageCount; i++) {
                let str = {};
                str.LanguageID = this.Reader.ReadInt32();
                str.StringSize = this.Reader.ReadInt32();
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
          let buffer = new Buffer(resource.ResourceSize);
          this.file.copy(buffer, 0, resource.OffsetToResource, resource.OffsetToResource + (resource.ResourceSize - 1));

          if(typeof onComplete == 'function')
            onComplete(buffer);
        }else{

          fs.open(this.file, 'r', (e, fd) => {
            var buffer = new Buffer(resource.ResourceSize);
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
          onComplete(new Buffer(0));
      }

    }else{
      if(onComplete != null)
        onComplete(new Buffer(0));
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
          let buffer = Buffer.from(this.file, resource.DataOffset, resource.DataOffset + (resource.DataSize - 1));
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
            var buffer = new Buffer(resource.DataSize);
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

}

ERFObject._erfCache = {};

module.exports = ERFObject;
