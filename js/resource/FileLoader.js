/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The FileLoader class. This class was oringially designed to handle file loading inside KotOR Forge and isn't suitable for use inside the game engine
 */

class FileLoader {

  constructor( args = {} ){

    this.args = Object.assign({
      file: null,
      onLoad: null,
      onError: null
    }, args);

    this.buffers = {};

    console.log('FileLoader', this.args);

    if(this.args.file != null){

      if(this.args.file instanceof Array){
        console.log('FileLoader array')
        this.LoadFiles(0, this.args.files, (buffers) => {
          if(typeof this.args.onLoad == 'function')
            this.args.onLoad(buffers);
        }, this.args.onError);
      }else if(typeof this.args.file === 'string'){
        console.log('FileLoader string')
        this.LoadFile(this.args.file, (buffer) => {
          if(typeof this.args.onLoad == 'function')
            this.args.onLoad(buffer);
        }, this.args.onError)
      }else{
        console.log('Unknown Error');
        this.args.onError('Unknown error');
      }

    }else{
      if(typeof this.args.onError == 'function')
        this.args.onError('File argument was null');
    }

  }

  LoadFiles(index = 0, files = [], onLoad = null, onError = null){

    let i = index, len = files.length;

    LoadFile( files[i], (buffer) => {
      this.buffers[files[i].path] = buffer;
      if(i < len){
        i++;
        this.LoadFiles(i, files, onLoad, onError);
      }else{
        if(typeof onLoad == 'function')
          onLoad(this.buffers);
      }
    });

  }

  LoadFile( _file, onLoad = null, onError = null ){
    console.log('FileLoader.LoadFile', _file);
    let info = Utility.filePathInfo(_file);
    let file = path.parse(info.path);

    console.log(file, info);

    if(info.location == 'local'){

      fs.readFile(info.path, (err, buffer) => {
        if(err){
          if(typeof onError == 'function')
            onError('Resource: "'+info.file.name+'.'+info.file.ext+'" not found at '+info.path);
        }else if(typeof onLoad == 'function'){
          onLoad(buffer);
        }

      });

    }else if(info.location == 'archive'){
      switch(info.archive.type){
        case 'bif':
          Global.kotorBIF[info.archive.name].GetResourceData(Global.kotorBIF[info.archive.name].GetResourceByLabel(info.file.name, ResourceTypes[info.file.ext]), (buffer) => {
            if(typeof onLoad == 'function')
              onLoad(buffer);
          }, (e) => {
            console.error('FileLoader.LoadFile', 'Resource: "'+info.file.name+'.'+info.file.ext+'" not found in BIF archive '+info.archive.name);
            if(typeof onError == 'function')
              onError('Resource: "'+info.file.name+'.'+info.file.ext+'" not found in BIF archive '+info.archive.name);
          });
        break;
        case 'erf':
          let resKey = Global.kotorERF[info.archive.name].getResourceByKey(info.file.name, ResourceTypes[info.file.ext]);
          if(resKey instanceof Object){
            Global.kotorERF[info.archive.name].getRawResource(resKey, (buffer) => {
              if(typeof onLoad == 'function')
                onLoad(buffer);
            });
          }else{
            console.error('FileLoader.LoadFile', 'Resource: "'+info.file.name+'.'+info.file.ext+'" not found in ERF archive '+info.archive.name);
            if(typeof onError == 'function')
              onError('Resource: "'+info.file.name+'.'+info.file.ext+'" not found in ERF archive '+info.archive.name);
          }
        break;
      }
    }
  }

}
module.exports = FileLoader;
