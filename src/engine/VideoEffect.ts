/**
 * VideoEffect class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file VideoEffect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class VideoEffect {

  id: number = 0;
  label: string;

  enableSaturation: boolean = false;
  enableScanNoise: boolean = false;
  enableClairVoyance: boolean = false;
  enableForceSight: boolean = false;
  enableClairVoyanceFull: boolean = false;
  enableFury: boolean = false;

  saturation: number = 0;
  modulation = {red: 0, blue: 0, green: 0};

  static From2DA(effect: any){
    const vEffect = new VideoEffect();
    vEffect.id = parseInt(effect.__rowlabel);
    vEffect.label = effect.label;
    vEffect.saturation = parseFloat(typeof effect.saturation != 'undefined' ? effect.saturation : effect.saturation_pc);
    vEffect.modulation.red = parseFloat(typeof effect.modulationred != 'undefined' ? effect.modulationred : effect.modulationred_pc);
    vEffect.modulation.green = parseFloat(typeof effect.modulationgreen != 'undefined' ? effect.modulationgreen : effect.modulationgreen_pc);
    vEffect.modulation.blue = parseFloat(typeof effect.modulationblue != 'undefined' ? effect.modulationblue : effect.modulationblue_pc);

    vEffect.enableSaturation = !!parseFloat(effect.enablesaturation);
    vEffect.enableScanNoise = !!parseFloat(effect.enablescannoise);
    vEffect.enableClairVoyance = !!parseFloat(effect.enableclairvoyance);
    vEffect.enableForceSight = !!parseFloat(effect.enableforcesight);
    vEffect.enableClairVoyanceFull = !!parseFloat(effect.enableclairvoyancefull);
    vEffect.enableFury = !!parseFloat(effect.enablefury);

    return vEffect;
  }

}