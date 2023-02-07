
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
    if(typeof row.walk !== 'undefined') surface.walk = row.walk ? true : false;
    if(typeof row.walkCheck !== 'undefined') surface.walkCheck = row.walkCheck ? true : false;
    if(typeof row.lineOfSight !== 'undefined') surface.lineOfSight = row.lineOfSight ? true : false;
    if(typeof row.grass !== 'undefined') surface.grass = row.grass ? true : false;
    return surface;
  }

}
