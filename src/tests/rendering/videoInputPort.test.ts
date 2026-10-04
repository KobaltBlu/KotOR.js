import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { GameState } from '@/GameState';
import { KeyMapper } from '@/controls/KeyMapper';
import { KeyMapAction } from '@/enums/controls/KeyMapAction';
import { VideoEffectManager } from '@/managers/VideoEffectManager';

jest.mock('@/GameState', () => ({ GameState: {} }));
jest.mock('@/controls/KeyMapper', () => ({ KeyMapper: { Actions: {} } }));
jest.mock('@/engine/VideoEffect', () => ({ VideoEffect: class {} }));

beforeEach(() => {
  GameState.controls = { gamePad: { stick_l_x: { value: 0 }, stick_l_y: { value: 0 } } } as any;
  for (const action of Object.keys(KeyMapper.Actions)) delete (KeyMapper.Actions as any)[action];
  GameState.odysseyShaderPass = undefined;
});

describe('video-effect movement input integration', () => {
  test('missing controls and idle controls produce no movement', () => {
    expect(VideoEffectManager.getMovementInputAmount()).toBe(0);
    GameState.controls = undefined;
    expect(VideoEffectManager.getMovementInputAmount()).toBe(0);
  });

  test.each([KeyMapAction.MoveForward, KeyMapAction.MoveBack, KeyMapAction.StrafeLeft, KeyMapAction.StrafeRight])
    ('uses the static gameplay binding %s, not GUI navigation', action => {
      KeyMapper.Actions[action] = { keyboardInput: { down: true } } as any;
      expect(VideoEffectManager.getMovementInputAmount()).toBe(1);
    });

  test('menu navigation does not count as movement', () => {
    KeyMapper.Actions[KeyMapAction.ActionUp] = { keyboardInput: { down: true } } as any;
    expect(VideoEffectManager.getMovementInputAmount()).toBe(0);
  });

  test('preserves partial analog magnitude and clamps diagonal input', () => {
    GameState.controls.gamePad.stick_l_x.value = 0.3;
    GameState.controls.gamePad.stick_l_y.value = 0.4;
    expect(VideoEffectManager.getMovementInputAmount()).toBeCloseTo(0.5);
    GameState.controls.gamePad.stick_l_x.value = 1;
    GameState.controls.gamePad.stick_l_y.value = 1;
    expect(VideoEffectManager.getMovementInputAmount()).toBe(1);
  });

  test('reset is safe before optional postprocessing is initialized', () => {
    VideoEffectManager.blurDirectionInitialized = true;
    VideoEffectManager.currentMotionBlurAmount = 1;
    expect(() => VideoEffectManager.Reset()).not.toThrow();
    expect(VideoEffectManager.blurDirectionInitialized).toBe(false);
    expect(VideoEffectManager.currentMotionBlurAmount).toBe(0);
  });
});
