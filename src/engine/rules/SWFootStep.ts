import { TwoDAObject } from "@/resource/TwoDAObject";

export class SWFootStep {
  id: number = -1;
  label: string = '';
  rumblePattern: number = -1;
  rumbleCutOff: number = 0;
  pitchOffset: number = 0;
  rolling: string = '';
  dirt0: string = '';
  dirt1: string = '';
  dirt2: string = '';
  grass0: string = '';
  grass1: string = '';
  grass2: string = '';
  stone0: string = '';
  stone1: string = '';
  stone2: string = '';
  wood0: string = '';
  wood1: string = '';
  wood2: string = '';
  water0: string = '';
  water1: string = '';
  water2: string = '';
  carpet0: string = '';
  carpet1: string = '';
  carpet2: string = '';
  metal0: string = '';
  metal1: string = '';
  metal2: string = '';
  puddles0: string = '';
  puddles1: string = '';
  puddles2: string = '';
  leaves0: string = '';
  leaves1: string = '';
  leaves2: string = '';
  force0: string = '';
  force1: string = '';
  force2: string = '';

  isRolling(): boolean {
    return !!this.rolling && this.rolling != '';
  }

  getRollingResRef(): string {
    return this.rolling;
  }

  getSurfaceSoundResRef(surfaceId: number = 0){
    let sound = '';
    const sndIdx = Math.round(Math.random()*2);
    switch(surfaceId){
      case 1:
        sound = sndIdx == 0 ? this.dirt0 : sndIdx == 1 ? this.dirt1 : this.dirt2;
      break;
      case 3:
        sound = sndIdx == 0 ? this.grass0 : sndIdx == 1 ? this.grass1 : this.grass2;
      break;
      case 4:
        sound = sndIdx == 0 ? this.stone0 : sndIdx == 1 ? this.stone1 : this.stone2;
      break;
      case 5:
        sound = sndIdx == 0 ? this.wood0 : sndIdx == 1 ? this.wood1 : this.wood2;
      break;
      case 6:
        sound = sndIdx == 0 ? this.water0 : sndIdx == 1 ? this.water1 : this.water2;
      break;
      case 9:
        sound = sndIdx == 0 ? this.carpet0 : sndIdx == 1 ? this.carpet1 : this.carpet2;
      break;
      case 10:
        sound = sndIdx == 0 ? this.metal0 : sndIdx == 1 ? this.metal1 : this.metal2;
      break;
      case 11:
      case 13:
        sound = sndIdx == 0 ? this.puddles0 : sndIdx == 1 ? this.puddles1 : this.puddles2;
      break;
      case 14:
        sound = sndIdx == 0 ? this.leaves0 : sndIdx == 1 ? this.leaves1 : this.leaves2;
      break;
      default:
        sound = sndIdx == 0 ? this.dirt0 : sndIdx == 1 ? this.dirt1 : this.dirt2;
      break;
    }
    if(!sound){
      sound = this.rolling;
    }
    return !!sound ? sound : '';
  }


  static From2DA(row: any = {}){
    const footStep = new SWFootStep();
    footStep.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    footStep.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    footStep.rumblePattern = TwoDAObject.normalizeValue(row.rumblepattern, 'number', -1);
    footStep.rumbleCutOff = TwoDAObject.normalizeValue(row.rumblecutoff, 'number', 0);
    footStep.pitchOffset = TwoDAObject.normalizeValue(row.pitchoffset, 'number', 0);
    footStep.rolling = TwoDAObject.normalizeValue(row.rolling, 'string', '');
    footStep.dirt0 = TwoDAObject.normalizeValue(row.dirt0, 'string', '');
    footStep.dirt1 = TwoDAObject.normalizeValue(row.dirt1, 'string', '');
    footStep.dirt2 = TwoDAObject.normalizeValue(row.dirt2, 'string', '');
    footStep.grass0 = TwoDAObject.normalizeValue(row.grass0, 'string', '');
    footStep.grass1 = TwoDAObject.normalizeValue(row.grass1, 'string', '');
    footStep.grass2 = TwoDAObject.normalizeValue(row.grass2, 'string', '');
    footStep.stone0 = TwoDAObject.normalizeValue(row.stone0, 'string', '');
    footStep.stone1 = TwoDAObject.normalizeValue(row.stone1, 'string', '');
    footStep.stone2 = TwoDAObject.normalizeValue(row.stone2, 'string', '');
    footStep.wood0 = TwoDAObject.normalizeValue(row.wood0, 'string', '');
    footStep.wood1 = TwoDAObject.normalizeValue(row.wood1, 'string', '');
    footStep.wood2 = TwoDAObject.normalizeValue(row.wood2, 'string', '');
    footStep.water0 = TwoDAObject.normalizeValue(row.water0, 'string', '');
    footStep.water1 = TwoDAObject.normalizeValue(row.water1, 'string', '');
    footStep.water2 = TwoDAObject.normalizeValue(row.water2, 'string', '');
    footStep.carpet0 = TwoDAObject.normalizeValue(row.carpet0, 'string', '');
    footStep.carpet1 = TwoDAObject.normalizeValue(row.carpet1, 'string', '');
    footStep.carpet2 = TwoDAObject.normalizeValue(row.carpet2, 'string', '');
    footStep.metal0 = TwoDAObject.normalizeValue(row.metal0, 'string', '');
    footStep.metal1 = TwoDAObject.normalizeValue(row.metal1, 'string', '');
    footStep.metal2 = TwoDAObject.normalizeValue(row.metal2, 'string', '');
    footStep.puddles0 = TwoDAObject.normalizeValue(row.puddles0, 'string', '');
    footStep.puddles1 = TwoDAObject.normalizeValue(row.puddles1, 'string', '');
    footStep.puddles2 = TwoDAObject.normalizeValue(row.puddles2, 'string', '');
    footStep.leaves0 = TwoDAObject.normalizeValue(row.leaves0, 'string', '');
    footStep.leaves1 = TwoDAObject.normalizeValue(row.leaves1, 'string', '');
    footStep.leaves2 = TwoDAObject.normalizeValue(row.leaves2, 'string', '');
    footStep.force0 = TwoDAObject.normalizeValue(row.force0, 'string', '');
    footStep.force1 = TwoDAObject.normalizeValue(row.force1, 'string', '');
    footStep.force2 = TwoDAObject.normalizeValue(row.force2, 'string', '');
    return footStep;
  }
}