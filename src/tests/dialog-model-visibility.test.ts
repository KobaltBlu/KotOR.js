/**
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import { EngineMode } from '@/enums/engine/EngineMode';
import { CutsceneMode } from '@/enums/dialog/CutsceneMode';
import { resolveDialogModelVisibility } from '@/module/dialog-model-visibility';

describe('resolveDialogModelVisibility', () => {
  test('DIALOG follows room visibility', () => {
    expect(resolveDialogModelVisibility({
      mode: EngineMode.DIALOG,
      cutsceneMode: CutsceneMode.DIALOG,
      isPartyMember: true,
      objectCutsceneMode: false,
      hasRoom: true,
      roomModelVisible: false,
    })).toBe(false);
  });

  test('ANIMATED cut hides party non-stunt participants', () => {
    expect(resolveDialogModelVisibility({
      mode: EngineMode.DIALOG,
      cutsceneMode: CutsceneMode.ANIMATED,
      isPartyMember: true,
      objectCutsceneMode: false,
      hasRoom: true,
      roomModelVisible: true,
    })).toBe(false);
  });

  test('ANIMATED cut keeps StuntList participants', () => {
    expect(resolveDialogModelVisibility({
      mode: EngineMode.DIALOG,
      cutsceneMode: CutsceneMode.ANIMATED,
      isPartyMember: true,
      objectCutsceneMode: true,
      hasRoom: true,
      roomModelVisible: true,
    })).toBe(true);
  });

  test('MINIGAME forces visible', () => {
    expect(resolveDialogModelVisibility({
      mode: EngineMode.MINIGAME,
      cutsceneMode: CutsceneMode.DIALOG,
      isPartyMember: true,
      objectCutsceneMode: false,
      hasRoom: true,
      roomModelVisible: false,
    })).toBe(true);
  });
});
