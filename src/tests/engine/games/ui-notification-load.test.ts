/**
 * Save-load must not flash Item Given / other HUD status icons.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    isLoadingSave: false,
  },
}));

import { GameState } from '@engine/runtime/GameState';
import { UIIconTimerType } from '@engine/enums/engine/UIIconTimerType';
import { UINotificationManager } from '@engine/managers/UINotificationManager';

describe('UINotificationManager save-load gate', () => {
  beforeEach(() => {
    GameState.isLoadingSave = false;
    UINotificationManager.ItemReceivedTimer = 0;
    UINotificationManager.ItemLostTimer = 0;
    UINotificationManager.CreditsReceivedTimer = 0;
    UINotificationManager.bNotificationSoundQueued = false;
  });

  it('enables ITEM_RECEIVED during normal play', () => {
    UINotificationManager.EnableUINotificationIconType(UIIconTimerType.ITEM_RECEIVED);
    expect(UINotificationManager.ItemReceivedTimer).toBeGreaterThan(0);
    expect(UINotificationManager.bNotificationSoundQueued).toBe(true);
  });

  it('suppresses ITEM_RECEIVED while loading a save', () => {
    GameState.isLoadingSave = true;
    UINotificationManager.EnableUINotificationIconType(UIIconTimerType.ITEM_RECEIVED);
    expect(UINotificationManager.ItemReceivedTimer).toBe(0);
    expect(UINotificationManager.bNotificationSoundQueued).toBe(false);
  });
});
