/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The BIFObject class.
 */

class BIFObject {

  constructor(file = null, onComplete = null){
    this.file = file;
    this.pathInfo = path.parse(this.file);
    this.resources = [];
    this.HeaderSize = 20;

    try{

      fs.open(this.file, 'r', (err, fd) => {
        if (err) {
            console.log('BIF Header Read', status.message);
            throw 'BIFObject: Failed to open '+this.file+' for reading.';
            return;
        }
        var header = new Buffer(this.HeaderSize);
        fs.read(fd, header, 0, this.HeaderSize, 0, (err, num) => {
          this.reader = new BinaryReader(header);

          this.FileType = this.reader.ReadChars(4);
          this.FileVersion = this.reader.ReadChars(4);
          this.VariableResourceCount = this.reader.ReadUInt32();
          this.FixedResourceCount = this.reader.ReadUInt32();
          this.VariableTableOffset = this.reader.ReadUInt32();

          this.VariableTableRowSize = 16;
          this.VariableTableSize = this.VariableResourceCount * this.VariableTableRowSize;

          header = this.reader = null;

          //Read variable tabs blocks
          var variableTable = new Buffer(this.VariableTableSize);
          fs.read(fd, variableTable, 0, this.VariableTableSize, this.VariableTableOffset, (err, num) => {
            this.reader = new BinaryReader(variableTable);

            for(let i = 0; i!=this.VariableResourceCount; i++){
              this.resources[i] = {
                ID: this.reader.ReadUInt32(),
                Offset: this.reader.ReadUInt32(),
                FileSize: this.reader.ReadUInt32(),
                ResType: this.reader.ReadUInt32()
              };
            }

            variableTable = this.reader = null;

            if(typeof onComplete == 'function')
              onComplete();

            fs.close(fd, function(error) {
              if (error) {
                console.error("close error:  " + error.message);
              } else {
                console.log("File was closed!");
              }
            });

          });

        });

      });

    }catch(e){
      console.log('BIF Open Error', e);
      if(typeof onComplete == 'function')
        onComplete();
    }

  }

  GetResourceById(id = null){
    if(id != null){
      for(let i = 0; i!=this.VariableResourceCount; i++){
        if(this.resources[i].ID == id){
          return this.resources[i];
        }
      }
    }
    return null;
  }

  GetResourcesByType(ResType = null){
    let arr = []
    if(ResType != null){
      for(let i = 0; i!=this.VariableResourceCount; i++){
        if(this.resources[i].ResType == ResType){
          arr.push(this.resources[i]);
        }
      }
    }
    return arr;
  }

  GetResourceByLabel(label = null, ResType = null){
    if(label != null){
      let len = Global.kotorKEY.keys.length;
      for(let i = 0; i != len; i++){
        let key = Global.kotorKEY.keys[i];
        if(key.ResRef == label && key.ResType == ResType){
          for(let j = 0; j != this.resources.length; j++){
            let res = this.resources[j];
            if(res.ID == key.ResID && res.ResType == ResType){
              return res;
            }
          }
        }
      }
    }
    return null;
  }

  GetResourceData(res = null, onComplete = null, onError = null){
    if(res != null){

      let _buffers = [];

      if(res.FileSize){

        fs.createReadStream(this.file, {autoClose: true, start: res.Offset, end: res.Offset + (res.FileSize - 1)}).on('data', function (chunk) {
          _buffers.push(chunk);
        })
        .on('end', function () {  // done

          //console.log('BIF.GetResourceData', 'from disk', _buffers);

          let buffer = Buffer.concat(_buffers);

          if(typeof onComplete == 'function')
            onComplete(buffer);

        });

      }else{
        if(typeof onComplete == 'function')
          onComplete(new Buffer(0));
      }
    }else{
      if(typeof onError == 'function')
        onError();
    }
  }

  GetResourceDataSync(res = null){
    if(res != null){
      let fd = fs.openSync(this.file, 'r');
      let buffer = new Buffer(res.FileSize);
      fs.readSync(fd, buffer, 0, res.FileSize, res.Offset);
      fs.closeSync(fd);
      return buffer;
    }else{
      return null;
    }
  }

  load( path, onLoad = null, onError = null ){

    let pathInfo = Utility.filePathInfo(path);

    if(pathInfo.location == 'archive' && pathInfo.archive.type == 'bif'){
      let key = Global.kotorKEY.GetFileKey(pathInfo.file.name, ResourceTypes[pathInfo.file.ext]);
      if(key != null){

        this.GetResourceData(this.GetResourceByLabel(pathInfo.file.name, ResourceTypes[pathInfo.file.ext]), (buffer) => {
          if(typeof onLoad === 'function')
            onLoad(buffer);
        }, (e) => {
          if(typeof onError === 'function')
            onError('Resource not found in BIF archive '+pathInfo.archive.name);
        });

      }
    }else{
      if(typeof onError === 'function')
        onError('Path is not pointing to a resource inside of a BIF archive');
    }

  }

  /*static load( path, onLoad = null, onError = null ){

    let pathInfo = Utility.filePathInfo(path);

    if(pathInfo.location == 'archive' && pathInfo.archive.type == 'bif'){
      let key = Global.kotorKEY.GetFileKey(pathInfo.file.name, ResourceTypes[pathInfo.file.ext]);
      if(key != null){

        Global.kotorBIF[pathInfo.archive.name].GetResourceData(Global.kotorBIF[pathInfo.archive.name].GetResourceByLabel(pathInfo.file.name, ResourceTypes[pathInfo.file.ext]), (buffer) => {
          if(typeof onLoad === 'function')
            onLoad(buffer);
        });

      }
    }else{
      if(typeof onError === 'function')
        onError('Path is not pointing to a resource inside of a BIF archive');
    }

  }*/

}

module.exports = BIFObject;
