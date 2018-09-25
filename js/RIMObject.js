/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The RIMObject class.
 */

class RIMObject {

  constructor(file = null, onComplete = null){
    this.file = file;

    this.Resources = [];
    this.HeaderSize = 160;

    this.inMemory = false;
    this.buffer = null;

    try{

      if(typeof file == 'string'){
        fs.open(this.file, 'r', (err, fd) => {
          if (err) {
              console.log('RIM Header Read', status.message);
              return;
          }
          var header = new Buffer(this.HeaderSize);
          fs.read(fd, header, 0, this.HeaderSize, 0, (err, num) => {
            this.Reader = new BinaryReader(header);
  
            this.Header = {};
  
            this.Header.FileType = this.Reader.ReadChars(4);
            this.Header.FileVersion = this.Reader.ReadChars(4);
  
            this.Reader.Skip(4);
  
            this.Header.ResourceCount = this.Reader.ReadUInt32();
            this.Header.ResourcesOffset = this.Reader.ReadUInt32();
  
            header = this.Reader = null;
  
            //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
            this.rimDataOffset = (this.Header.ResourcesOffset + (this.Header.ResourceCount * 34));
            header = new Buffer(this.rimDataOffset);
            fs.read(fd, header, 0, this.rimDataOffset, 0, (err, num) => {
              this.Reader = new BinaryReader(header);
  
              this.Reader.Seek(this.Header.ResourcesOffset);
  
              for (let i = 0; i != this.Header.ResourceCount; i++) {
                let res = {
                  ResRef: this.Reader.ReadChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase(),
                  ResType: this.Reader.ReadUInt16(),
                  Unused: this.Reader.ReadUInt16(),
                  ResID: this.Reader.ReadUInt32(),
                  DataOffset: this.Reader.ReadUInt32(),
                  DataSize: this.Reader.ReadUInt32()
                };
                this.Resources.push(res);
              }
  
              header = this.Reader = null;
  
              if(onComplete != null)
                onComplete(this);
  
            });
  
          });
  
        });
      }else{
        this.inMemory = true;

        var header = Buffer.from(this.file, 0, this.HeaderSize);
        this.Reader = new BinaryReader(header);

        this.Header = {};

        this.Header.FileType = this.Reader.ReadChars(4);
        this.Header.FileVersion = this.Reader.ReadChars(4);

        this.Reader.Skip(4);

        this.Header.ResourceCount = this.Reader.ReadUInt32();
        this.Header.ResourcesOffset = this.Reader.ReadUInt32();

        header = this.Reader = null;

        //Enlarge the buffer to the include the entire structre up to the beginning of the image file data
        this.rimDataOffset = (this.Header.ResourcesOffset + (this.Header.ResourceCount * 34));
        header = Buffer.from(this.file, 0, this.rimDataOffset);
        this.Reader = new BinaryReader(header);
        this.Reader.Seek(this.Header.ResourcesOffset);

        for (let i = 0; i != this.Header.ResourceCount; i++) {
          let res = {
            ResRef: this.Reader.ReadChars(16).replace(/\0[\s\S]*$/g,'').trim().toLowerCase(),
            ResType: this.Reader.ReadUInt16(),
            Unused: this.Reader.ReadUInt16(),
            ResID: this.Reader.ReadUInt32(),
            DataOffset: this.Reader.ReadUInt32(),
            DataSize: this.Reader.ReadUInt32()
          };
          this.Resources.push(res);
        }

        header = this.Reader = null;

        if(onComplete != null)
          onComplete(this);


      }

      
    }catch(e){
      console.log('RIM Open Error', e);
      if(onComplete != null)
        onComplete();
    }

  }

  getRawResource(resref = '', restype = 0x000F, onComplete = null) {
    for(let i = 0; i != this.Resources.length; i++){
      let resource = this.Resources[i];
      if (resource.ResRef == resref && resource.ResType == restype) {
        try {
          let _buffers = [];

          if(this.inMemory){
            let buffer = new Buffer(resource.ResourceSize);
            this.file.copy(buffer, 0, resource.DataOffset, resource.DataOffset + (resource.DataSize - 1));

            if(typeof onComplete == 'function')
              onComplete(buffer);
          }else{
            fs.createReadStream(this.file, {autoClose: true, start: resource.DataOffset, end: resource.DataOffset + (resource.DataSize - 1)}).on('data', function (chunk) {
              _buffers.push(chunk);
            })
            .on('end', function () {
      
              let buffer = Buffer.concat(_buffers);
              if(typeof onComplete == 'function')
                onComplete(buffer);
      
            });
          }
          
        }
        catch (e) {
          console.log(e);
          if(onComplete != null)
            onComplete(new ArrayBuffer(0));
        }
        break;
      }
    }
  }

  getResourceByKey(key, restype){
      key = key.toLowerCase();

      for(let i = 0; i != this.Resources.length; i++){
          let _key = this.Resources[i];
          if (_key.ResRef == key && _key.ResType == restype) {
              return _key;
          }
      };
      return null;
  }

  GetResourceByLabel(label = null, ResType = null){
    return this.getResourceByKey(label, ResType);
  }

  GetResourceData(resource = null, onComplete = null) {
    if(resource != null){
      try {

        let _buffers = [];

        if(this.inMemory){
          let buffer = new Buffer(resource.ResourceSize);
          this.file.copy(buffer, 0, resource.DataOffset, resource.DataOffset + (resource.DataSize - 1));
          if(typeof onComplete == 'function')
            onComplete(buffer);
        }else{
          fs.createReadStream(this.file, {autoClose: true, start: resource.DataOffset, end: resource.DataOffset + (resource.DataSize - 1)}).on('data', function (chunk) {
            _buffers.push(chunk);
          })
          .on('end', function () {
    
            let buffer = Buffer.concat(_buffers);
            if(typeof onComplete == 'function')
              onComplete(buffer);
    
          });
        }
      }
      catch (e) {
        console.log(e);
        if(onComplete != null)
          onComplete(new ArrayBuffer(0));
      }
    }
  }

  exportRawResource(directory = null, resref = '', restype = 0x000F, onComplete = null) {
    if(directory != null){
      for(let i = 0; i != this.Resources.length; i++){
        let resource = this.Resources[i];
        if (resource.ResRef == resref && resource.ResType == restype) {
          try {

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
                  console.log('RIM Read', status.message);
                  return;
                }
                var buffer = new Buffer(resource.DataSize);
                fs.read(fd, buffer, 0, resource.DataSize, resource.DataOffset, function(err, num) {
                  console.log('RIM Export', 'Writing File', path.join(directory, resource.ResRef+'.'+ResourceTypes.getKeyByValue(resource.ResType)));
                  fs.writeFile(path.join(directory, resource.ResRef+'.'+ResourceTypes.getKeyByValue(resource.ResType)), buffer, (err) => {
                    if (err) console.log(err);
  
                    if(onComplete != null)
                      onComplete(buffer);
  
                  });
  
                });
              });
            }

          }
          catch (e) {
            console.log(e);
            if(onComplete != null)
              onComplete(new ArrayBuffer(0));
          }
        }
      }
    }
  }

}

module.exports = RIMObject;
