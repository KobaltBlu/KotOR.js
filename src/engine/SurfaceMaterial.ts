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

  static From2DA(row: any = {}){
    const surface = new SurfaceMaterial();
    if(typeof row.label !== 'undefined') surface.label = row.label == '****' ? '' : row.label;
    if(typeof row.sound !== 'undefined') surface.sound = row.sound == '****' ? '' : row.sound;
    if(typeof row.name !== 'undefined') surface.name = row.name == '****' ? '' : row.name;
    if(typeof row.walk !== 'undefined') surface.walk = parseInt(row.walk) ? true : false;
    if(typeof row.walkCheck !== 'undefined') surface.walkCheck = parseInt(row.walkCheck) ? true : false;
    if(typeof row.lineOfSight !== 'undefined') surface.lineOfSight = parseInt(row.lineOfSight) ? true : false;
    if(typeof row.grass !== 'undefined') surface.grass = parseInt(row.grass) ? true : false;
    return surface;
  }

}
