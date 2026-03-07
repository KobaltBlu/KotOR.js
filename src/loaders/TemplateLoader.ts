import { GFFObject } from "../resource/GFFObject";
import { ResourceLoader } from "./ResourceLoader";

/**
 * TemplateLoader class.
 * 
 * This should be used for loading game templates like UTC, UTP, UTD, etc.
 * These assets can be found in the current module, in the games' override
 * folder, or in the games templates.bif
 *
 * The order for searching should be just that unless the override search has
 * been disabled by the user. ("look_in_override" == false in ConfigManager)
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TemplateLoader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @deprecated
 */
export class TemplateLoader {

  static cache: any = {};

  static Load(args: any = {}){

    args = Object.assign({
      ResRef: null,
      ResType: null,
      onLoad: null,
      onFail: null
    }, args);

    console.log('TemplateLoader', args.ResType, args.ResRef)
    ResourceLoader.loadResource(args.ResType, args.ResRef).then((data: Uint8Array) => {
      console.log('TemplateLoader', args.ResType, args.ResRef, data);
      new GFFObject(data, (gff) => {
        if(args.onLoad != null)
          args.onLoad(gff);
      }); 
    }).catch( (e) => {
      console.error(e)
      if(typeof args.onFail === 'function'){
        args.onFail(e);
      }
    });

  }

  static LoadFromResources ( args: any = {} ) {

    args = Object.assign({
      ResRef: null,
      ResType: null,
      onLoad: null,
      onFail: null
    }, args);

    // if(true){

    //   let resKey = GameState.module.rim_s.getResource(args.ResRef.toLowerCase(), args.ResType);
    //   if(resKey != null){
    //     //console.log('Template Resource found');
    //     GameState.module.rim_s.getResourceBuffer(resKey, (buffer) => {
    //       if(args.onLoad != null)
    //         args.onLoad(buffer);
    //     });

    //     return;
    //   }

    //   resKey = BIFManager.GetBIFByName('templates').getResource(args.ResRef.toLowerCase(), args.ResType);
    //   if(resKey != null){
    //     //console.log('Template Resource found');
    //     BIFManager.GetBIFByName('templates').getResourceBuffer(resKey, (buffer) => {
    //       if(args.onLoad != null)
    //         args.onLoad(buffer);
    //     });

    //     return;
    //   }

    //   resKey = ResourceLoader.getResource(args.ResType, args.ResRef.toLowerCase());
    //   if(resKey){
    //     if(!resKey.inArchive){
          
    //     }else{

    //     }
    //   }
      
    //   if(args.onFail != null)
    //     args.onFail();
    // }else{
    //   if(args.onFail != null)
    //     args.onFail();
    // }
  }

}
