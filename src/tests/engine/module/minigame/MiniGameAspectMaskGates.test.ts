import { describe, expect, test } from '@jest/globals';
import { EngineMode } from '@engine/enums/engine/EngineMode';
import { MiniGameType } from '@engine/enums/engine/MiniGameType';
import { resolveMiniGameAspectMaskPass } from '@engine/render/shaders/pass/MiniGameAspectMaskGates';

describe('resolveMiniGameAspectMaskPass', () => {
  test('enables for swoop in MINIGAME mode', () => {
    expect(
      resolveMiniGameAspectMaskPass({
        engineMode: EngineMode.MINIGAME,
        hasMiniGame: true,
        miniGameType: MiniGameType.SWOOPRACE,
      })
    ).toBe(true);
  });

  test('enables for turret in MINIGAME mode', () => {
    expect(
      resolveMiniGameAspectMaskPass({
        engineMode: EngineMode.MINIGAME,
        hasMiniGame: true,
        miniGameType: MiniGameType.TURRET,
      })
    ).toBe(true);
  });

  test('disables outside MINIGAME mode', () => {
    expect(
      resolveMiniGameAspectMaskPass({
        engineMode: EngineMode.INGAME,
        hasMiniGame: true,
        miniGameType: MiniGameType.SWOOPRACE,
      })
    ).toBe(false);
  });

  test('disables when area has no minigame', () => {
    expect(
      resolveMiniGameAspectMaskPass({
        engineMode: EngineMode.MINIGAME,
        hasMiniGame: false,
      })
    ).toBe(false);
  });
});
