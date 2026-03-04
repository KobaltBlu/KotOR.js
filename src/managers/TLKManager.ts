import { TLKObject } from "@/resource/TLKObject";
import { TLKString } from "@/resource/TLKString";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Manager);

/**
 * TLKManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file TLKManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
/* eslint-disable @typescript-eslint/no-extraneous-class -- static manager pattern */
export class TLKManager {

  static TLKStrings: TLKString[] = [];
  static TLKObject: TLKObject;

  static async LoadTalkTable(onProgress?: (current: number, total: number) => void): Promise<TLKObject> {
    log.trace('TLKManager.LoadTalkTable()');
    return new Promise<TLKObject>((resolve, reject) => {
      GameFileSystem.readFile('dialog.tlk').then((buffer) => {
        log.debug('TLKManager.LoadTalkTable() dialog.tlk read, length=%s', String(buffer?.length ?? 0));
        TLKManager.TLKObject = new TLKObject(undefined);
        TLKManager.TLKObject.LoadFromBuffer(buffer, (index: number = 0, count: number = 0) => {
          if (typeof onProgress === 'function') onProgress(index, count);
        }).then(() => {
          TLKManager.TLKStrings = TLKManager.TLKObject.TLKStrings;
          log.info('TLKManager.LoadTalkTable() loaded stringCount=%s', String(TLKManager.TLKStrings.length));
          resolve(TLKManager.TLKObject);
        }).catch((err) => {
          log.warn('TLKManager.LoadTalkTable() LoadFromBuffer failed, using partial strings', err);
          TLKManager.TLKStrings = TLKManager.TLKObject.TLKStrings;
          resolve(TLKManager.TLKObject);
        });
      }).catch((err) => {
        log.error('TLKManager.LoadTalkTable() readFile failed', err);
        if (err) {
          reject(undefined);
        }
      });
    });
  }

  static GetStringById(index: number = 0): TLKString | undefined {
    log.trace('TLKManager.GetStringById()', String(index));
    const entry = TLKManager.TLKStrings[index];
    if (!entry) log.debug('TLKManager.GetStringById() no entry for index=%s', String(index));
    return entry;
  }

  static Search(query: string): { index: number; text: string }[] {
    log.trace('TLKManager.Search()', query);
    const results = this.TLKStrings
      .filter((str) => str.Value.indexOf(query) >= 0)
      .map((str) => ({
        index: this.TLKStrings.indexOf(str),
        text: str.Value
      }));
    log.debug('TLKManager.Search() query=%s resultCount=%s', query, String(results.length));
    return results;
  }

}
