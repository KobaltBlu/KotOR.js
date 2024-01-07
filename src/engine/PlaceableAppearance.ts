import { TwoDAObject } from "../resource/TwoDAObject";

/**
 * PlaceableAppearance class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file PlaceableAppearance.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class PlaceableAppearance {
  id: number = -1;
  label: string = '';
  strref: number = -1;
  modelname: string = '';
  lightcolor: number = 0xFFFFFF;
  lightoffsetx: number = 0;
  lightoffsety: number = 0;
  lightoffsetz: number = 0;
  soundapptype: number = -1;
  shadowsize: number = 1;
  bodybag: number = 0;
  lowgore: boolean = false;
  preciseuse: boolean = false;
  hitcheck: boolean = false;
  canseeheight: number = 1.5;
  hostile: boolean = false;
  nocull: boolean = false;
  ignorestatichitcheck: boolean = false;
  usesearch: boolean = false; //TSL

  static From2DA (row: any = {}): PlaceableAppearance {
    const appearance = new PlaceableAppearance();

    appearance.id = parseInt(row.__index);

    if(row.hasOwnProperty('label'))
      appearance.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    if(row.hasOwnProperty('strref'))
      appearance.strref = TwoDAObject.normalizeValue(row.strref, 'number', -1);
    if(row.hasOwnProperty('modelname'))
      appearance.modelname = TwoDAObject.normalizeValue(row.modelname, 'string', '');
    if(row.hasOwnProperty('lightcolor'))
      appearance.lightcolor = TwoDAObject.normalizeValue(row.lightcolor, 'number', 0xFFFFFF);
    if(row.hasOwnProperty('lightoffsetx'))
      appearance.lightoffsetx = TwoDAObject.normalizeValue(row.lightoffsetx, 'number', 0);
    if(row.hasOwnProperty('lightoffsety'))
      appearance.lightoffsety = TwoDAObject.normalizeValue(row.lightoffsety, 'number', 0);
    if(row.hasOwnProperty('lightoffsetz'))
      appearance.lightoffsetz = TwoDAObject.normalizeValue(row.lightoffsetz, 'number', 0);
    if(row.hasOwnProperty('soundapptype'))
      appearance.soundapptype = TwoDAObject.normalizeValue(row.soundapptype, 'number', -1);
    if(row.hasOwnProperty('shadowsize'))
      appearance.shadowsize = TwoDAObject.normalizeValue(row.shadowsize, 'number', 1);
    if(row.hasOwnProperty('bodybag'))
      appearance.bodybag = TwoDAObject.normalizeValue(row.bodybag, 'number', 0);
    if(row.hasOwnProperty('lowgore'))
      appearance.lowgore = TwoDAObject.normalizeValue(row.lowgore, 'boolean', false);
    if(row.hasOwnProperty('preciseuse'))
      appearance.preciseuse = TwoDAObject.normalizeValue(row.preciseuse, 'boolean', false);
    if(row.hasOwnProperty('hitcheck'))
      appearance.hitcheck = TwoDAObject.normalizeValue(row.hitcheck, 'boolean', false);
    if(row.hasOwnProperty('canseeheight'))
      appearance.canseeheight = TwoDAObject.normalizeValue(row.canseeheight, 'number', 1.5);
    if(row.hasOwnProperty('hostile'))
      appearance.hostile = TwoDAObject.normalizeValue(row.hostile, 'boolean', false);
    if(row.hasOwnProperty('nocull'))
      appearance.nocull = TwoDAObject.normalizeValue(row.nocull, 'boolean', false);
    if(row.hasOwnProperty('ignorestatichitcheck'))
      appearance.ignorestatichitcheck = TwoDAObject.normalizeValue(row.ignorestatichitcheck, 'boolean', false);
    if(row.hasOwnProperty('usesearch'))
      appearance.usesearch = TwoDAObject.normalizeValue(row.usesearch, 'boolean', false);
    
    return appearance;
  }
}
