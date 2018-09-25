/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The THREE.MDLLoader is used for loading MDL/MDX files from the game archives
 */

THREE.MDLLoader = function ( manager ) {
	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
};

THREE.MDLLoader.prototype = {

	constructor: THREE.MDLLoader,

	load: function ( args ) {

    args = $.extend({
      file: null,
      options: null,
      onLoad: null,
      onError: null
    }, args);

    let isLocal = false;

    try{
      isLocal = fs.lstatSync(args.file).isFile();
    }catch(e){}

    //Arg3 used to be isLocal this is included for backwards compatibility for charCode
    //that was using isLocal instead of args.onError
    if(args.onError === true)
      isLocal = false;

    if(ModelCache.models.hasOwnProperty(args.file)){
      if(typeof args.onLoad == 'function')
        args.onLoad(ModelCache.models[args.file]);

    }else{

      if(!isLocal){

        try{

          ResourceLoader.loadResource(ResourceTypes['mdl'], args.file, (mdlData) => {
            ResourceLoader.loadResource(ResourceTypes['mdx'], args.file, (mdxData) => {

              let mdlReader = new BinaryReader(mdlData);
              let mdxReader = new BinaryReader(mdxData);

              let auroraModel = new AuroraModel(mdlReader, mdxReader);
              ModelCache.models[args.file] = auroraModel;
              if(typeof args.onLoad == 'function')
                args.onLoad(auroraModel);
            }, (e) => {
              console.error('MDX 404', args.file);
              if(args.onError != null && typeof args.onError === 'function')
                args.onError(e)
            })
          }, (e) => {
            console.error('MDL 404', args.file);
            if(args.onError != null && typeof args.onError === 'function')
              args.onError(e)
          });

        }catch(e){
          console.error('MDLLoader.load', args.file, e);
          if(args.onError != null && typeof args.onError === 'function')
            args.onError(e)
        }

      }else{
        this.loadLocal(args.file, args.onLoad, null, args.onError);
      }

    }

    return null;

	},

  loadSync: function ( args ) {

    args = $.extend({
      file: null,
      options: null
    }, args);

    let name = args.file;

    let isLocal = false;

    if(ModelCache.models.hasOwnProperty(args.file)){
      //console.log('Loading model from cache');
      let cache = ModelCache.models[args.file];
      return cache;

    }else{

      if(!isLocal){

        try{

          let mdlBuffer = ResourceLoader.loadResourceSync(ResourceTypes['mdl'], args.file);
          let mdxBuffer = ResourceLoader.loadResourceSync(ResourceTypes['mdx'], args.file);

          if(mdlBuffer){
            if(mdxBuffer){

              let mdlData2 = new Buffer(mdlBuffer.length);
              mdlBuffer.copy(mdlData2);

              let mdxData2 = new Buffer(mdxBuffer.length);
              mdxBuffer.copy(mdxData2);
          
              let mdlReader = new BinaryReader(mdlData2);
              let mdxReader = new BinaryReader(mdxData2);

              let auroraModel = new AuroraModel(mdlReader, mdxReader);
              ModelCache.models[args.file] = {mdlData: mdlBuffer, mdxData: mdxBuffer};
              return auroraModel;
            } else {
              console.error('MDX 404', args.file);
              throw 'Model MDX 404: '+args.file;
            }
          } else {
            console.error('MDL 404', args.file);
            throw 'Model MDL 404: '+args.file;
          }

        }catch(e){
          return e;
        }

      }else{
        throw 'Model 404 Local file not supported: '+args.file;
        return null;
      }

    }

    throw 'Model 404 nothing found: '+args.file;

    return null;

	}

}
