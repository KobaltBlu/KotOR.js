import { TwoDAObject } from "../resource/TwoDAObject";

/**
 * DoorAppearance class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file DoorAppearance.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class DoorAppearance {
  id: number = -1;
  label: string = '';
  strref: number = -1;
  modelname: string = '';
  blocksight: boolean = false;
  visiblemodel: boolean = false;
  soundapptype: number = -1;
  name: string = '';
  preciseuse: boolean = false;
  nobin: boolean = false;
  staticanim: string = '';

  static From2DA (row: any = {}): DoorAppearance {
    const appearance = new DoorAppearance();
    
    appearance.id = parseInt(row.__index);

    if(row.hasOwnProperty('label'))
      appearance.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    if(row.hasOwnProperty('strref'))
      appearance.strref = TwoDAObject.normalizeValue(row.strref, 'number', -1);
    if(row.hasOwnProperty('modelname'))
      appearance.modelname = TwoDAObject.normalizeValue(row.modelname, 'string', '');
    if(row.hasOwnProperty('blocksight'))
      appearance.blocksight = TwoDAObject.normalizeValue(row.blocksight, 'boolean', false);
    if(row.hasOwnProperty('visiblemodel'))
      appearance.visiblemodel = TwoDAObject.normalizeValue(row.visiblemodel, 'boolean', false);
    if(row.hasOwnProperty('soundapptype'))
      appearance.soundapptype = TwoDAObject.normalizeValue(row.soundapptype, 'number', -1);
    if(row.hasOwnProperty('name'))
      appearance.name = TwoDAObject.normalizeValue(row.name, 'string', '');
    if(row.hasOwnProperty('preciseuse'))
      appearance.preciseuse = TwoDAObject.normalizeValue(row.preciseuse, 'boolean', false);
    if(row.hasOwnProperty('nobin'))
      appearance.nobin = TwoDAObject.normalizeValue(row.nobin, 'boolean', false);
    if(row.hasOwnProperty('staticanim'))
      appearance.staticanim = TwoDAObject.normalizeValue(row.staticanim, 'string', '');

    return appearance;
  }
}
