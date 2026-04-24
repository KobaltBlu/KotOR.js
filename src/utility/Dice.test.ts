import { describe, expect, it, jest, afterEach } from '@jest/globals';
import { DiceType } from '@/enums/combat/DiceType';
import { Dice } from '@/utility/Dice';

// ---------------------------------------------------------------------------
// Helper: run a die-roll fn N times and verify every result is in [1, faces]
// ---------------------------------------------------------------------------
function rollsInRange(fn: () => number, faces: number, trials = 200): boolean {
  for (let i = 0; i < trials; i++) {
    const v = fn();
    if (v < 1 || v > faces) return false;
  }
  return true;
}

describe('Dice', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // intToDiceType
  // -------------------------------------------------------------------------
  describe('intToDiceType', () => {
    const cases: [number, DiceType][] = [
      [2, DiceType.d2],
      [3, DiceType.d3],
      [4, DiceType.d4],
      [6, DiceType.d6],
      [8, DiceType.d8],
      [10, DiceType.d10],
      [12, DiceType.d12],
      [20, DiceType.d20],
      [100, DiceType.d100],
    ];

    for (const [sides, expected] of cases) {
      it(`maps ${sides} sides to DiceType.${expected}`, () => {
        expect(Dice.intToDiceType(sides)).toBe(expected);
      });
    }

    it('defaults to d8 for an unknown value', () => {
      expect(Dice.intToDiceType(7)).toBe(DiceType.d8);
      expect(Dice.intToDiceType(0)).toBe(DiceType.d8);
    });

    it('defaults to d8 when called with no argument', () => {
      expect(Dice.intToDiceType()).toBe(DiceType.d8);
    });
  });

  // -------------------------------------------------------------------------
  // Zero-count guard
  // -------------------------------------------------------------------------
  describe('roll with num <= 0 returns 0', () => {
    it('roll(0, d6) returns 0', () => {
      expect(Dice.roll(0, DiceType.d6)).toBe(0);
    });

    it('roll(-1, d20) returns 0', () => {
      expect(Dice.roll(-1, DiceType.d20)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // roll() dispatch – deterministic via Math.random mock
  // -------------------------------------------------------------------------
  describe('roll() with deterministic Math.random', () => {
    /**
     * Math.floor(random * faces + 1) formula used in each rollD*:
     *   random = 0 → 1 (minimum)
     *   random = (faces-1)/faces → faces (maximum)
     */
    const rollCases: { die: DiceType; faces: number }[] = [
      { die: DiceType.d2, faces: 2 },
      { die: DiceType.d3, faces: 3 },
      { die: DiceType.d4, faces: 4 },
      { die: DiceType.d6, faces: 6 },
      { die: DiceType.d8, faces: 8 },
      { die: DiceType.d10, faces: 10 },
      { die: DiceType.d12, faces: 12 },
      { die: DiceType.d20, faces: 20 },
      { die: DiceType.d100, faces: 100 },
    ];

    for (const { die, faces } of rollCases) {
      it(`roll(1, ${die}) returns minimum (1) when Math.random() → 0`, () => {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        expect(Dice.roll(1, die)).toBe(1);
      });

      it(`roll(1, ${die}) returns maximum (${faces}) when Math.random() → (faces-1)/faces`, () => {
        jest.spyOn(Math, 'random').mockReturnValue((faces - 1) / faces);
        expect(Dice.roll(1, die)).toBe(faces);
      });
    }
  });

  // -------------------------------------------------------------------------
  // roll() modifier
  // -------------------------------------------------------------------------
  describe('modifier', () => {
    it('adds a positive modifier to the roll result', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0); // always minimum = 1
      expect(Dice.roll(1, DiceType.d6, 3)).toBe(4);
    });

    it('adds a negative modifier to the roll result', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0); // always minimum = 1
      expect(Dice.roll(1, DiceType.d6, -1)).toBe(0);
    });

    it('modifier defaults to 0', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      expect(Dice.roll(2, DiceType.d4)).toBe(2); // 2 × 1 + 0
    });
  });

  // -------------------------------------------------------------------------
  // roll() multi-die accumulation
  // -------------------------------------------------------------------------
  describe('multi-die rolls accumulate', () => {
    it('roll(3, d6) with Math.random()→0 returns 3 (3 × minimum 1)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      expect(Dice.roll(3, DiceType.d6)).toBe(3);
    });

    it('roll(2, d20) with Math.random()→19/20 returns 40 (2 × maximum 20)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(19 / 20);
      expect(Dice.roll(2, DiceType.d20)).toBe(40);
    });
  });

  // -------------------------------------------------------------------------
  // unknown DiceType
  // -------------------------------------------------------------------------
  describe('roll() unknown die type returns 0', () => {
    it('returns 0 for a DiceType not in the switch', () => {
      expect(Dice.roll(1, 'd99' as any)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Individual rollD* methods – probabilistic bounds check
  // -------------------------------------------------------------------------
  describe('individual rollD* methods produce values in range', () => {
    it('rollD2(1) always returns 1 or 2', () => {
      expect(rollsInRange(() => Dice.rollD2(1), 2)).toBe(true);
    });

    it('rollD4(1) always returns 1-4', () => {
      expect(rollsInRange(() => Dice.rollD4(1), 4)).toBe(true);
    });

    it('rollD6(1) always returns 1-6', () => {
      expect(rollsInRange(() => Dice.rollD6(1), 6)).toBe(true);
    });

    it('rollD8(1) always returns 1-8', () => {
      expect(rollsInRange(() => Dice.rollD8(1), 8)).toBe(true);
    });

    it('rollD10(1) always returns 1-10', () => {
      expect(rollsInRange(() => Dice.rollD10(1), 10)).toBe(true);
    });

    it('rollD12(1) always returns 1-12', () => {
      expect(rollsInRange(() => Dice.rollD12(1), 12)).toBe(true);
    });

    it('rollD20(1) always returns 1-20', () => {
      expect(rollsInRange(() => Dice.rollD20(1), 20)).toBe(true);
    });

    it('rollD100(1) always returns 1-100', () => {
      expect(rollsInRange(() => Dice.rollD100(1), 100)).toBe(true);
    });
  });
});
