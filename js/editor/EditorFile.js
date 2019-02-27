class EditorFile {

  constructor( options = {} ){

    options = Object.assign({
      path: null,
      resref: null,
      restype: null,
      ext: null,
      archive_path: null,
      location: EditorFile.LOCATION_TYPE.LOCAL,
      buffer: []
    }, options);

    this.resref = options.resref;
    this.reskey = options.reskey;
    this.buffer = options.buffer;
    this.path = options.path;
    this.ext = options.ext;
    this.archive_path = options.archive_path;
    this.location = options.location;

    if(typeof this.path === 'string'){
      let path_obj = path.parse(this.path);

      //Test for archive file path
      if(this.path.indexOf('?') >= 0){
        let pth = this.path.split('?');
        this.path = pth[1];
        this.archive_path = pth[0];
        this.location = EditorFile.LOCATION_TYPE.ARCHIVE;
        path_obj = path.parse(this.path);
      }

      if(!this.resref){
        this.resref = path_obj.name;
      }

      if(!this.reskey){
        this.reskey = ResourceTypes[path_obj.ext.slice(1)];
      }

      this.ext = ResourceTypes.getKeyByValue(this.reskey);
    }

    if(!this.ext && this.reskey){
      this.ext = ResourceTypes.getKeyByValue(this.reskey);
    }

  }

  readFile( onLoad = null ){

    if(this.reskey == ResourceTypes.mdl || this.reskey == ResourceTypes.mdx){
      //Mdl / Mdx Special Loader
      if(this.archive_path){
        let archive_path = path.parse(this.archive_path);
        switch(archive_path.ext.slice(1)){
          case 'bif':
            new BIFObject(this.archive_path, (archive) => {

              if(!(this.buffer instanceof Buffer)){
                archive.GetResourceData(archive.GetResourceByLabel(this.resref, this.reskey), (buffer) => {
                  this.buffer = buffer;
                  let mdl_mdx_key = ResourceTypes.mdx;
                  if(this.reskey == ResourceTypes.mdx){
                    mdl_mdx_key = ResourceTypes.mdl;
                    archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer) => {
                      this.buffer2 = buffer;
                      if(typeof onLoad === 'function'){
                        onLoad(buffer, this.buffer);
                      }
                    });
                  }else{
                    archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer) => {
                      this.buffer2 = buffer;
                      if(typeof onLoad === 'function'){
                        onLoad(this.buffer, buffer);
                      }
                    });
                  }
                });
              }else{
                let mdl_mdx_key = ResourceTypes.mdx;
                if(this.reskey == ResourceTypes.mdx){
                  mdl_mdx_key = ResourceTypes.mdl;
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer) => {
                    this.buffer2 = buffer;
                    if(typeof onLoad === 'function'){
                      onLoad(buffer, this.buffer);
                    }
                  });
                }else{
                  archive.GetResourceData(archive.GetResourceByLabel(this.resref, mdl_mdx_key), (buffer) => {
                    this.buffer2 = buffer;
                    if(typeof onLoad === 'function'){
                      onLoad(this.buffer, buffer);
                    }
                  });
                }
              }
              
            });
          break;
          case 'erf':
          case 'mod':

          break;
        }
      }else{
        if(this.buffer instanceof Buffer){

          if(this.buffer2 instanceof Buffer){
            if(typeof onLoad === 'function'){
              onLoad(this.buffer, this.buffer2);
            }
          }else{
            if(typeof onLoad === 'function'){
              onLoad(this.buffer, Buffer.alloc(0));
            }
          }

        }else{
          //Load the MDL file
          fs.readFile(this.path, (err, buffer) => {
          
            if(err) throw err;

            let root_dir = path.parse(this.path).dir;

            //Load the MDX file
            fs.readFile(path.join(root_dir, this.resref+'.mdx'), (err, buffer2) => {

              if(err) throw err;

              if(typeof onLoad === 'function'){
                this.buffer = buffer;
                this.buffer2 = buffer2;
                onLoad(buffer, buffer2);
              }

            });
      
          });

        }

      }
    }else{
      //Common Loader
      if(this.buffer instanceof Buffer){
        if(typeof onLoad === 'function'){
          onLoad(this.buffer);
        }
      }else{

        if(this.archive_path){
          let archive_path = path.parse(this.archive_path);
          switch(archive_path.ext.slice(1)){
            case 'bif':
              new BIFObject(this.archive_path, (archive) => {
  
                archive.GetResourceData(archive.GetResourceByLabel(this.resref, this.reskey), (buffer) => {
                  this.buffer = buffer;
                  if(typeof onLoad === 'function'){
                    onLoad(this.buffer);
                  }
                });
                
              });
            break;
            case 'erf':
            case 'mod':
  
            break;
          }
        }else{
          if(typeof this.path === 'string'){
            fs.readFile(this.path, (err, buffer) => {
          
              if(err) throw err;

              this.buffer = buffer;
        
              if(typeof onLoad === 'function'){
                onLoad(this.buffer);
              }
        
            });
          }else{
            this.buffer = Buffer.alloc();
            if(typeof onLoad === 'function'){
              onLoad(this.buffer);
            }
          }
        }
        
      }
    }

  }

  getData(){
    return this.buffer;
  }

  getLocalPath(){
    if(!this.archive_path && this.path)
      return this.path;
    else
      return null;
  }

  getFilename(){
    return this.resref+'.'+this.ext;
  }

}

EditorFile.LOCATION_TYPE = {
  OTHER: -1,
  ARCHIVE: 1,
  LOCAL: 2
}

module.exports = EditorFile;