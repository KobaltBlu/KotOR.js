/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { shouldShowTutorialWindow } from '@/managers/tutorial-window-gate';

describe('shouldShowTutorialWindow (global tutorial.2da gate)', () => {
  it('shows only when enabled, Tutorial Popups on, and not yet seen', () => {
    expect(shouldShowTutorialWindow(true, true, false)).toBe(true);
  });

  it('SetTutorialWindowsEnabled(0) blocks', () => {
    expect(shouldShowTutorialWindow(false, true, false)).toBe(false);
  });

  it('Options Tutorial Popups off blocks', () => {
    expect(shouldShowTutorialWindow(true, false, false)).toBe(false);
  });

  it('already-seen PT_TUT_WND_SHOWN bit blocks', () => {
    expect(shouldShowTutorialWindow(true, true, true)).toBe(false);
  });
});
