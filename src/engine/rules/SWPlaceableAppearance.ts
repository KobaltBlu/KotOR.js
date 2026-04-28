import { TwoDAObject } from '@/resource/TwoDAObject';

/**
 * SWPlaceableAppearance class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file SWPlaceableAppearance.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWPlaceableAppearance {
  id: number = -1;
  label: string = '';
  strref: number = -1;
  modelname: string = '';
  lightcolor: number = 0xffffff;
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

  static From2DA(
    row: import('@/resource/TwoDAObject').ITwoDARowData | Record<string, string | number> = {}
  ): SWPlaceableAppearance {
    const appearance = new SWPlaceableAppearance();

    appearance.id = parseInt(row.__index);

    if (Object.hasOwn(row, 'label')) appearance.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    if (Object.hasOwn(row, 'strref')) appearance.strref = TwoDAObject.normalizeValue(row.strref, 'number', -1);
    if (Object.hasOwn(row, 'modelname')) appearance.modelname = TwoDAObject.normalizeValue(row.modelname, 'string', '');
    if (Object.hasOwn(row, 'lightcolor'))
      appearance.lightcolor = TwoDAObject.normalizeValue(row.lightcolor, 'number', 0xffffff);
    if (Object.hasOwn(row, 'lightoffsetx'))
      appearance.lightoffsetx = TwoDAObject.normalizeValue(row.lightoffsetx, 'number', 0);
    if (Object.hasOwn(row, 'lightoffsety'))
      appearance.lightoffsety = TwoDAObject.normalizeValue(row.lightoffsety, 'number', 0);
    if (Object.hasOwn(row, 'lightoffsetz'))
      appearance.lightoffsetz = TwoDAObject.normalizeValue(row.lightoffsetz, 'number', 0);
    if (Object.hasOwn(row, 'soundapptype'))
      appearance.soundapptype = TwoDAObject.normalizeValue(row.soundapptype, 'number', -1);
    if (Object.hasOwn(row, 'shadowsize'))
      appearance.shadowsize = TwoDAObject.normalizeValue(row.shadowsize, 'number', 1);
    if (Object.hasOwn(row, 'bodybag')) appearance.bodybag = TwoDAObject.normalizeValue(row.bodybag, 'number', 0);
    if (Object.hasOwn(row, 'lowgore')) appearance.lowgore = TwoDAObject.normalizeValue(row.lowgore, 'boolean', false);
    if (Object.hasOwn(row, 'preciseuse'))
      appearance.preciseuse = TwoDAObject.normalizeValue(row.preciseuse, 'boolean', false);
    if (Object.hasOwn(row, 'hitcheck'))
      appearance.hitcheck = TwoDAObject.normalizeValue(row.hitcheck, 'boolean', false);
    if (Object.hasOwn(row, 'canseeheight'))
      appearance.canseeheight = TwoDAObject.normalizeValue(row.canseeheight, 'number', 1.5);
    if (Object.hasOwn(row, 'hostile')) appearance.hostile = TwoDAObject.normalizeValue(row.hostile, 'boolean', false);
    if (Object.hasOwn(row, 'nocull')) appearance.nocull = TwoDAObject.normalizeValue(row.nocull, 'boolean', false);
    if (Object.hasOwn(row, 'ignorestatichitcheck'))
      appearance.ignorestatichitcheck = TwoDAObject.normalizeValue(row.ignorestatichitcheck, 'boolean', false);
    if (Object.hasOwn(row, 'usesearch'))
      appearance.usesearch = TwoDAObject.normalizeValue(row.usesearch, 'boolean', false);

    return appearance;
  }
}
