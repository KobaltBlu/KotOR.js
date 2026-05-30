import { TwoDAObject } from '@/resource/TwoDAObject';

/**
 * One row of `animations.2da` (see `research/2da-csv/animations.csv`).
 * Flag columns are 0/1 in the table; exposed as booleans for game logic.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file SWAnimation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class SWAnimation {
  /** Row index in the 2DA (`__index`). */
  index: number = 0;
  /** Animation resref / name (column `name`). */
  name: string = '';
  nameLower: string = '';

  stationary: boolean = false;
  pause: boolean = false;
  walking: boolean = false;
  running: boolean = false;
  looping: boolean = false;
  fireforget: boolean = false;
  overlay: boolean = false;
  playoutofplace: boolean = false;
  dialog: boolean = false;
  damage: boolean = false;
  parry: boolean = false;
  dodge: boolean = false;
  attack: boolean = false;
  hideequippeditems: boolean = false;

  constructor(index: number = 0) {
    this.index = index;
  }

  /** True if the 2DA cell is non-zero after numeric normalization. */
  private static flag(row: any, column: string): boolean {
    return TwoDAObject.normalizeValue(row[column], 'number', 0) !== 0;
  }

  apply2DA(row: any): void {
    this.index = TwoDAObject.normalizeValue(row.__index, 'number', 0);
    this.name = TwoDAObject.normalizeValue(row.name, 'string', '');
    this.nameLower = this.name.toLowerCase();

    this.stationary = SWAnimation.flag(row, 'stationary');
    this.pause = SWAnimation.flag(row, 'pause');
    this.walking = SWAnimation.flag(row, 'walking');
    this.running = SWAnimation.flag(row, 'running');
    this.looping = SWAnimation.flag(row, 'looping');
    this.fireforget = SWAnimation.flag(row, 'fireforget');
    this.overlay = SWAnimation.flag(row, 'overlay');
    this.playoutofplace = SWAnimation.flag(row, 'playoutofplace');
    this.dialog = SWAnimation.flag(row, 'dialog');
    this.damage = SWAnimation.flag(row, 'damage');
    this.parry = SWAnimation.flag(row, 'parry');
    this.dodge = SWAnimation.flag(row, 'dodge');
    this.attack = SWAnimation.flag(row, 'attack');
    this.hideequippeditems = SWAnimation.flag(row, 'hideequippeditems');
  }

  static From2DA(row: any): SWAnimation {
    const anim = new SWAnimation();
    anim.apply2DA(row);
    return anim;
  }
}
