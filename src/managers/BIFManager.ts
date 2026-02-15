import { IBIFResource } from "@/interface/resource/IBIFResource";
import { BIFObject } from "@/resource/BIFObject";
import { KEYObject } from "@/resource/KEYObject";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Manager);

/**
 * BIFManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file BIFManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
/* eslint-disable @typescript-eslint/no-extraneous-class -- Manager is a static namespace by design */
export class BIFManager {

  static bifs: Map<number, BIFObject> = new Map();
  static bifIndexes: Map<string, number> = new Map();

  static Load(onComplete?: () => void){
    log.trace('BIFManager.Load()');
    log.debug('BIFManager.Load() no-op implementation');
    if (typeof onComplete === 'function') {
      onComplete();
    }
  }

  static LoadBIFResource(resource: IBIFResource, onComplete?: (buffer?: Uint8Array) => void){
    log.trace('BIFManager.LoadBIFResource()', 'resource.Id=', resource?.Id);
    if(resource){
      const bifIndex = KEYObject.getBIFIndex(resource.Id);
      const bif = BIFManager.bifs.get(bifIndex);
      log.debug('BIFManager.LoadBIFResource() bifIndex=%s bif=%s', String(bifIndex), bif ? 'found' : 'missing');
      if(bif){
        bif.getResourceBuffer(resource).then( (buffer: Uint8Array) => {
          log.info('BIFManager.LoadBIFResource() buffer loaded length=%s', String(buffer?.length ?? 0));
          if(typeof onComplete === 'function'){
            onComplete(buffer);
          }
        }).catch((err: unknown) => {
          log.error('BIFManager.LoadBIFResource() getResourceBuffer failed', err);
          if (typeof onComplete === 'function') {
            onComplete(undefined);
          }
        });
        return;
      }
      log.warn('BIFManager.LoadBIFResource() no BIF found for resource.Id=%s', String(resource.Id));
    } else {
      log.warn('BIFManager.LoadBIFResource() called with no resource');
    }

    if(typeof onComplete === 'function') {
      onComplete(undefined);
    }
  }

  static GetBIFByName(name: string): BIFObject | undefined {
    log.trace('BIFManager.GetBIFByName()', name);
    const idx = BIFManager.bifIndexes.get(name);
    if (idx === undefined) {
      log.debug(`BIFManager.GetBIFByName() no index for name=${name}`);
      return undefined;
    }
    const bif = BIFManager.bifs.get(idx);
    if (!bif) {
      log.debug(`BIFManager.GetBIFByName() no BIF for name=${name}`);
    }
    return bif;
  }

}
