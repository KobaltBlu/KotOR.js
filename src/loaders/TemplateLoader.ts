/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { Utility } from "../utility/Utility";

/* @file
 * The TemplateLoader class.
 * 
 * This should be used for loading game templates like UTC, UTP, UTD, etc.
 * These assets can be found in the current module, in the games' override
 * folder, or in the games templates.bif
 *
 * The order for searching should be just that unless the override search has
 * been disabled by the user. ("look_in_override" == false in ConfigManager)
 */

export class TemplateLoader {

  static cache: any = {};

  static Load(args = {}){

    args = Object.assign({
      ResRef: null,
      ResType: null,
      onLoad: null,
      onFail: null
    }, args);

    if(typeof Forge.Project != 'undefined'){
      TemplateLoader.LoadFromProject({
        ResType: args.ResType, 
        ResRef: args.ResRef, 
        onLoad: (data) => {
          if(args.onLoad != null)
              args.onLoad(data);
        }, onFail: () => {
          ResourceLoader.loadResource(args.ResType, args.ResRef, (data) => {
            new GFFObject(data, (gff, rootNode) => {
              if(args.onLoad != null)
                args.onLoad(gff);
            }); 
          }, args.onFail);
        }
      });
    }else{
      ResourceLoader.loadResource(args.ResType, args.ResRef, (data) => {
        new GFFObject(data, (gff, rootNode) => {
          if(args.onLoad != null)
            args.onLoad(gff);
        }); 
      }, args.onFail);
    }



    /*if(args.ResRef != null && args.ResType != null){

      if(!TemplateLoader.cache.hasOwnProperty(args.ResType)){
        TemplateLoader.cache[args.ResType] = {};
      }

      if(!TemplateLoader.cache[args.ResType].hasOwnProperty(args.ResRef)){
        console.log('Load Fresh', args.ResRef);
        

          TemplateLoader.LoadFromResources({
            ResRef: args.ResRef,
            ResType: args.ResType,
            onLoad: (buffer) => {
              new GFFObject(buffer, (gff, rootNode) => {
                gff.SetResourceID('//KOTOR/BIF/Templates/' + args.ResRef.toLowerCase() + '.' + ResourceTypes.getKeyByValue(args.ResType) );
                TemplateLoader.cache[args.ResType][args.ResRef] = gff;
                if(args.onLoad != null)
                  args.onLoad(gff);
              });
            },
            onFail: () => {

              if(args.onFail != null)
                args.onFail();

            }
          });

        //}

      }else{
        console.log('Load Cache', args.ResRef);
        if(args.onLoad != null)
          args.onLoad(TemplateLoader.cache[args.ResType][args.ResRef]);

      }

    }else{

      if(args.onFail != null)
        args.onFail();

    }*/

  }

  static LoadFromProject ( args = null ) {

    args = Object.assign({
      ResRef: null,
      ResType: null,
      onLoad: null,
      onFail: null
    }, args);

    if(typeof Forge.Project != 'undefined' && Forge.Project != null){
      let projectFilePath = path.join(Forge.Project.directory, 'files', args.ResRef + '.' + ResourceTypes.getKeyByValue(args.ResType));
      //Check in the project directory
      Utility.FileExists(projectFilePath, (exists) => {
        if(exists){
          fs.readFile(projectFilePath, (err, buffer) => {
            new GFFObject(buffer, (gff, rootNode) => {
              if(args.onLoad != null)
                args.onLoad(gff);
            });
          });
        }else{
          if(args.onFail != null)
            args.onFail();
        }
      });

    }else{
      if(args.onFail != null)
        args.onFail();
    }

  }

  static LoadFromResources ( args: any = {} ) {

    args = Object.assign({
      ResRef: null,
      ResType: null,
      onLoad: null,
      onFail: null
    }, args);

    if(typeof Global.kotorBIF != 'undefined' && Global.kotorBIF != null){

      let resKey = GameState.module.rim_s.GetResourceByLabel(args.ResRef.toLowerCase(), args.ResType);
      if(resKey != null){
        //console.log('Template Resource found');
        GameState.module.rim_s.GetResourceData(resKey, (buffer) => {
          if(args.onLoad != null)
            args.onLoad(buffer);
        });

        return;
      }

      resKey = Global.kotorBIF['templates'].GetResourceByLabel(args.ResRef.toLowerCase(), args.ResType);
      if(resKey != null){
        //console.log('Template Resource found');
        Global.kotorBIF['templates'].GetResourceData(resKey, (buffer) => {
          if(args.onLoad != null)
            args.onLoad(buffer);
        });

        return;
      }

      resKey = ResourceLoader.getResource(args.ResType, args.ResRef.toLowerCase());
      if(resKey){
        if(!resKey.inArchive){
          
        }else{

        }
      }
      
      if(args.onFail != null)
        args.onFail();
    }else{
      if(args.onFail != null)
        args.onFail();
    }
  }

}
