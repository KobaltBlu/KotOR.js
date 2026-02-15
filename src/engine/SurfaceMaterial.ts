/**
 * SurfaceMaterial class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file SurfaceMaterial.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SurfaceMaterial {

  label: string;
  sound: string = '';
  name: string = '';

  walk: boolean = false;
  walkCheck: boolean = false;
  lineOfSight: boolean = false;
  grass: boolean = false;

  static From2DA(row: Record<string, string | number> = {}): SurfaceMaterial {
    const surface = new SurfaceMaterial();
    surface.label = '';
    if (typeof row.label !== 'undefined') surface.label = String(row.label) === '****' ? '' : String(row.label);
    if (typeof row.sound !== 'undefined') surface.sound = String(row.sound) === '****' ? '' : String(row.sound);
    if (typeof row.name !== 'undefined') surface.name = String(row.name) === '****' ? '' : String(row.name);
    if(typeof row.walk !== 'undefined') surface.walk = parseInt(row.walk) ? true : false;
    if(typeof row.walkcheck !== 'undefined') surface.walkCheck = parseInt(row.walkcheck) ? true : false;
    if(typeof row.lineofsight !== 'undefined') surface.lineOfSight = parseInt(row.lineofsight) ? true : false;
    if(typeof row.grass !== 'undefined') surface.grass = parseInt(row.grass) ? true : false;
    return surface;
  }

}
