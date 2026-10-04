import type * as path from 'path';

/**
 * IResourceDiskInfo interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IResourceDiskInfo.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IResourceDiskInfo {
  pathInfo: path.ParsedPath;
  path: string;
  existsOnDisk: boolean;
}