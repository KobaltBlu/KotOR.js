import { GFFObject } from "../resource/GFFObject";
import { createScopedLogger, LogScope } from "../utility/Logger";

const log = createScopedLogger(LogScope.Loader);
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
export interface TemplateLoaderLoadArgs {
  ResRef?: string | null;
  ResType?: number | null;
  onLoad?: ((gff: GFFObject) => void) | null;
  onFail?: ((e: unknown) => void) | null;
}

export class TemplateLoader {

  static cache: Record<string, unknown> = {};

  static Load(args: TemplateLoaderLoadArgs = {}): void {

    const opts = Object.assign({
      ResRef: null,
      ResType: null,
      onLoad: null,
      onFail: null
    }, args) as Required<TemplateLoaderLoadArgs>;

    log.info('TemplateLoader', opts.ResType, opts.ResRef);
    const resType = opts.ResType ?? 0;
    const resRef = opts.ResRef ?? '';
    ResourceLoader.loadResource(resType, resRef).then((data: Uint8Array) => {
      log.info('TemplateLoader', opts.ResType, opts.ResRef, data);
      new GFFObject(data, (gff: GFFObject) => {
        if (opts.onLoad != null) opts.onLoad(gff);
      });
    }).catch((e: unknown) => {
      log.error(e);
      if (typeof opts.onFail === 'function') opts.onFail(e);
    });
  }

  static LoadFromResources(args: TemplateLoaderLoadArgs = {}): void {

    const _opts = Object.assign({
      ResRef: null,
      ResType: null,
      onLoad: null,
      onFail: null
    }, args);

    // if(true){

    //   let resKey = GameState.module.rim_s.getResource(args.ResRef.toLowerCase(), args.ResType);
    //   if(resKey != null){
    //     //log.info('Template Resource found');
    //     GameState.module.rim_s.getResourceBuffer(resKey, (buffer) => {
    //       if(args.onLoad != null)
    //         args.onLoad(buffer);
    //     });

    //     return;
    //   }

    //   resKey = BIFManager.GetBIFByName('templates').getResource(args.ResRef.toLowerCase(), args.ResType);
    //   if(resKey != null){
    //     //log.info('Template Resource found');
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
