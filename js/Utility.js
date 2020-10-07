/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The Utility class.
 */

class Utility {
  constructor() {
  }

  static NormalizeRadian(fVal){
    return fVal - (Utility.TWO_PI) * Math.floor( (fVal + Math.PI) / (Utility.TWO_PI) )
  }

  static PadInt(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
  }

  static is2daNULL(str = null){

    if(str === null)
      return true;

    if(str === '****')
      return true;

    return false;

  }

  static FileExists(file = null, onComplete = null){
    if(file != null){
      fs.stat(file, (err, stat) => {
        if(err == null) {
          if(onComplete != null)
            onComplete(true);
        } else if(err.code == 'ENOENT') {
          if(onComplete != null)
            onComplete(false);
        } else {
          if(onComplete != null)
            onComplete(false);
        }
      });
    }else{
      if(onComplete != null)
        onComplete(false);
    }

  }

  static BuildModulesList(onComplete = null){

    fs.readdir(path.join(Config.options.Games['KOTOR'].Location, 'modules'), (err, files) => {

      let modules = [];
      for(let i = 0; i!=files.length; i++){
        let fileInfo = path.parse(files[i]);
        if(fileInfo.base.includes('.rim') && !fileInfo.base.includes('_s.rim')){
          modules.push(fileInfo.base);
        }
      }

      let _data = [];

      let i = 0;
      let readModule = () => {
        let module = modules[i];
        let rim = new RIMObject(path.join(Config.options.Games['KOTOR'].Location, 'modules', module), (rim) => {

          $.each(rim.Resources, (k, res) => {
            switch(res.ResType){
              case ResourceTypes['are']:

                rim.getRawResource(res.ResRef, res.ResType, (data) => {
                  let are = new GFFObject(data, (gff, rootNode) => {

                    let Name = gff.GetFieldByLabel('Name').GetCExoLocString();

                    _data.push({module: module, name: Global.kotorTLK.TLKStrings[Name.RESREF].Value, nameref: Name.RESREF});

                    i++;
                    if(i != modules.length){
                      readModule();
                    }else{
                      if(typeof onComplete === 'function')
                        onComplete(_data);
                    }
                  });
                });

              break;
            }
          });

        });

      };
      readModule();





    });


  }

  //Determine if the file is on the hdd or in an archive

  /*

  ***Local Example***
  C:\waterfall.tga
  C:\images\biowarelogo.tpc

  ***Archive Example***
  bif.textures://waterfall.tga
  erf.swpc_tex_tpa://biowarelogo.tpc
  */

  static filePathInfo(filePath){

    //isLocal
    if(filePath.indexOf(':\\') > -1){

      let filePathInfo = path.parse(filePath);

      let fileInfo = filePath.split('\\');
      fileInfo = fileInfo[fileInfo.length - 1].split('.');

      if(filePathInfo.ext.indexOf('.') == 0)
        filePathInfo.ext = filePathInfo.ext.substr(1, filePathInfo.ext.length - 1);

      return {
        location: 'local',
        path: filePath,
        file: {
          name: filePathInfo.name,
          ext: filePathInfo.ext
        }
      };
    }

    //isArchive
    else if(filePath.indexOf('://') > -1){

      let locInfo = filePath.split('://')[0].split('.');
      let fileInfo = filePath.split('://')[1].split('.');

      return {
        location: 'archive',
        path: path,
        archive: {
          type: locInfo[0],
          name: locInfo[1],
        },
        file: {
          name: fileInfo[0],
          ext: fileInfo[1]
        }
      };

    }

    //possible relative filePath
    else{

    }


  }

  static isPOW2(n){

  }

  static calculateMipMaps(size = 1){

    if (typeof size !== 'number')
      throw 'Not a number';

    if(size < 1)
      throw 'The size cannot be smaller than 1';

    if(!Utility.isPOW2(size))
      throw 'The size must be Power of 2';

    let mipmaps = 1;
    while(size > 1){
      //console.log(size);
      mipmaps++;
      size = size >> 1;
    }
    return mipmaps;
  }
  
  static Distance2D(v0, v1){
    var dx = v0.x - v1.x, dy = v0.y - v1.y;
		return Math.abs(Math.sqrt( dx * dx + dy * dy ));
  }


}

Utility.ArrayMatch = function(array1, array2){
  return (array1.length == array2.length) && array1.every(function(element, index) {
    return element === array2[index];
  });
}

Utility.TWO_PI = 2 * Math.PI;

module.exports = Utility;
