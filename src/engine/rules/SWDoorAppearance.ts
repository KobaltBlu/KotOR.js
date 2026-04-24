import { TwoDAObject } from '@/resource/TwoDAObject';

/**
 * SWDoorAppearance class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file SWDoorAppearance.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWDoorAppearance {
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

  static From2DA(
    row: import('@/resource/TwoDAObject').ITwoDARowData | Record<string, string | number> = {}
  ): SWDoorAppearance {
    const appearance = new SWDoorAppearance();

    appearance.id = parseInt(row.__index);

    if (Object.hasOwn(row, 'label')) appearance.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    if (Object.hasOwn(row, 'strref')) appearance.strref = TwoDAObject.normalizeValue(row.strref, 'number', -1);
    if (Object.hasOwn(row, 'modelname')) appearance.modelname = TwoDAObject.normalizeValue(row.modelname, 'string', '');
    if (Object.hasOwn(row, 'blocksight'))
      appearance.blocksight = TwoDAObject.normalizeValue(row.blocksight, 'boolean', false);
    if (Object.hasOwn(row, 'visiblemodel'))
      appearance.visiblemodel = TwoDAObject.normalizeValue(row.visiblemodel, 'boolean', false);
    if (Object.hasOwn(row, 'soundapptype'))
      appearance.soundapptype = TwoDAObject.normalizeValue(row.soundapptype, 'number', -1);
    if (Object.hasOwn(row, 'name')) appearance.name = TwoDAObject.normalizeValue(row.name, 'string', '');
    if (Object.hasOwn(row, 'preciseuse'))
      appearance.preciseuse = TwoDAObject.normalizeValue(row.preciseuse, 'boolean', false);
    if (Object.hasOwn(row, 'nobin')) appearance.nobin = TwoDAObject.normalizeValue(row.nobin, 'boolean', false);
    if (Object.hasOwn(row, 'staticanim'))
      appearance.staticanim = TwoDAObject.normalizeValue(row.staticanim, 'string', '');

    return appearance;
  }
}
