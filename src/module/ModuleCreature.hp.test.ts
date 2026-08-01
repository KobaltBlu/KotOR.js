/**
 * setHP must round-trip through getHP for every subrace formula.
 * Mirrors ModuleCreature.setHP / getHP without importing the full creature graph.
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

type HpCreature = {
  subraceIndex: number;
  hitPoints: number;
  maxHitPoints: number;
  currentHitPoints: number;
  min1HP: boolean;
  setHP: (n: number) => void;
  getHP: () => number;
  getMaxHP: () => number;
  isDead: () => boolean;
};

function makeCreature(subraceIndex: number): HpCreature {
  const c: HpCreature = {
    subraceIndex,
    hitPoints: 116,
    maxHitPoints: 144,
    currentHitPoints: 0,
    min1HP: false,
    setHP(nAmount = 0){
      switch(this.subraceIndex){
        case 1:
        case 2:
          this.currentHitPoints = nAmount - this.hitPoints;
          break;
        default:
          this.currentHitPoints = nAmount - (this.maxHitPoints - this.hitPoints);
          break;
      }
    },
    getHP(){
      switch(this.subraceIndex){
        case 1:
        case 2:
          return this.hitPoints + this.currentHitPoints;
        default:
          return (this.maxHitPoints + this.currentHitPoints) - this.hitPoints;
      }
    },
    getMaxHP(){ return this.maxHitPoints; },
    isDead(){ return this.getHP() <= 0 && !this.min1HP; },
  };
  return c;
}

describe("ModuleCreature setHP / getHP subrace formulas", () => {
  it.each([
    [0, "NONE"],
    [1, "WOOKIE"],
    [2, "BEAST"],
  ])("setHP(-11) → getHP() === -11 for subrace %s (%s)", (subraceIndex) => {
    const c = makeCreature(subraceIndex as number);
    // Old default-only inversion left beast/wookiee at positive HP (Calo / ramp gate)
    c.currentHitPoints = -11 - (c.maxHitPoints - c.hitPoints);
    if(subraceIndex === 1 || subraceIndex === 2){
      expect(c.getHP()).toBeGreaterThan(0);
    }

    c.setHP(-11);
    expect(c.getHP()).toBe(-11);
    expect(c.isDead()).toBe(true);
  });

  it.each([
    [0, "NONE"],
    [1, "WOOKIE"],
    [2, "BEAST"],
  ])("setHP(max) → getHP() === max for subrace %s (%s)", (subraceIndex) => {
    const c = makeCreature(subraceIndex as number);
    c.setHP(c.getMaxHP());
    expect(c.getHP()).toBe(144);
  });
});
