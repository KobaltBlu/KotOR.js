import { TwoDAObject } from "../../resource/TwoDAObject";

export class SWWeaponSound {
  id: number = -1;
  label: string = '';
  pitchOffset: number = 0;
  cloth0: string = '';
  cloth1: string = '';
  leather0: string = '';
  leather1: string = '';
  armor0: string = '';
  armor1: string = '';
  forceField0: string = '';
  forceField1: string = '';
  metal0: string = '';
  metal1: string = '';
  wood0: string = '';
  wood1: string = '';
  stone0: string = '';
  stone1: string = '';
  parry0: string = '';
  parry1: string = '';
  swingShort0: string = '';
  swingShort1: string = '';
  swingShort2: string = '';
  swingLong0: string = '';
  swingLong1: string = '';
  swingLong2: string = '';
  swingTwirl0: string = '';
  swingTwirl1: string = '';
  clash0: string = '';
  clash1: string = '';

  getClothResRef(){
    const sndIdx = Math.round(Math.random()*1);
    return sndIdx == 0 ? this.cloth0 : this.cloth1;
  }

  getLeatherResRef(){
    const sndIdx = Math.round(Math.random()*1);
    return sndIdx == 0 ? this.leather0 : this.leather1;
  }

  getArmorResRef(){
    const sndIdx = Math.round(Math.random()*1);
    return sndIdx == 0 ? this.armor0 : this.armor1;
  }

  getForceFieldResRef(){
    const sndIdx = Math.round(Math.random()*1);
    return sndIdx == 0 ? this.forceField0 : this.forceField1;
  }

  getMetalResRef(){
    const sndIdx = Math.round(Math.random()*1);
    return sndIdx == 0 ? this.metal0 : this.metal1;
  }

  getWoodResRef(){
    const sndIdx = Math.round(Math.random()*1);
    return sndIdx == 0 ? this.wood0 : this.wood1;
  }

  getStoneResRef(){
    const sndIdx = Math.round(Math.random()*1);
    return sndIdx == 0 ? this.stone0 : this.stone1;
  }

  getHitParryResRef(){
    const sndIdx = Math.round(Math.random()*1);
    return sndIdx == 0 ? this.parry0 : this.parry1;
  }

  getSwingShortResRef(){
    const sndIdx = Math.round(Math.random()*2);
    return sndIdx == 0 ? this.swingShort0 : sndIdx == 1 ? this.swingShort1 : this.swingShort2;
  }

  getSwingLongResRef(){
    const sndIdx = Math.round(Math.random()*2);
    return sndIdx == 0 ? this.swingLong0 : sndIdx == 1 ? this.swingLong1 : this.swingLong2;
  }

  getSwingTwirlResRef(){
    const sndIdx = Math.round(Math.random()*1);
    return sndIdx == 0 ? this.swingTwirl0 : this.swingTwirl1;
  }

  getClashResRef(){
    const sndIdx = Math.round(Math.random()*1);
    return sndIdx == 0 ? this.clash0 : this.clash1;
  }

  static From2DA(row: any = {}){
    const weaponSound = new SWWeaponSound();
    weaponSound.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    weaponSound.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    weaponSound.pitchOffset = TwoDAObject.normalizeValue(row.pitchoffset, 'number', 0);
    weaponSound.cloth0 = TwoDAObject.normalizeValue(row.cloth0, 'string', '');
    weaponSound.cloth1 = TwoDAObject.normalizeValue(row.cloth1, 'string', '');
    weaponSound.leather0 = TwoDAObject.normalizeValue(row.leather0, 'string', '');
    weaponSound.leather1 = TwoDAObject.normalizeValue(row.leather1, 'string', '');
    weaponSound.armor0 = TwoDAObject.normalizeValue(row.armor0, 'string', '');
    weaponSound.armor1 = TwoDAObject.normalizeValue(row.armor1, 'string', '');
    weaponSound.forceField0 = TwoDAObject.normalizeValue(row.forcefield0, 'string', '');
    weaponSound.forceField1 = TwoDAObject.normalizeValue(row.forcefield1, 'string', '');
    weaponSound.metal0 = TwoDAObject.normalizeValue(row.metal0, 'string', '');
    weaponSound.metal1 = TwoDAObject.normalizeValue(row.metal1, 'string', '');
    weaponSound.wood0 = TwoDAObject.normalizeValue(row.wood0, 'string', '');
    weaponSound.wood1 = TwoDAObject.normalizeValue(row.wood1, 'string', '');
    weaponSound.stone0 = TwoDAObject.normalizeValue(row.stone0, 'string', '');
    weaponSound.stone1 = TwoDAObject.normalizeValue(row.stone1, 'string', '');
    weaponSound.parry0 = TwoDAObject.normalizeValue(row.parry0, 'string', '');
    weaponSound.parry1 = TwoDAObject.normalizeValue(row.parry1, 'string', '');
    weaponSound.swingShort0 = TwoDAObject.normalizeValue(row.swingshort0, 'string', '');
    weaponSound.swingShort1 = TwoDAObject.normalizeValue(row.swingshort1, 'string', '');
    weaponSound.swingShort2 = TwoDAObject.normalizeValue(row.swingshort2, 'string', '');
    weaponSound.swingLong0 = TwoDAObject.normalizeValue(row.swinglong0, 'string', '');
    weaponSound.swingLong1 = TwoDAObject.normalizeValue(row.swinglong1, 'string', '');
    weaponSound.swingLong2 = TwoDAObject.normalizeValue(row.swinglong2, 'string', '');
    weaponSound.swingTwirl0 = TwoDAObject.normalizeValue(row.swingtwirl0, 'string', '');
    weaponSound.swingTwirl1 = TwoDAObject.normalizeValue(row.swingtwirl1, 'string', '');
    weaponSound.clash0 = TwoDAObject.normalizeValue(row.clash0, 'string', '');
    weaponSound.clash1 = TwoDAObject.normalizeValue(row.clash1, 'string', '');
    return weaponSound;
  }
}