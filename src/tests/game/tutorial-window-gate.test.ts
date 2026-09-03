/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { TutorialManager } from '@/managers/TutorialManager';

describe('shouldShowTutorialWindow (global tutorial.2da gate)', () => {
  it('shows only when enabled, Tutorial Popups on, and not yet seen', () => {
    expect(TutorialManager.shouldShowTutorialWindow(true, true, false)).toBe(true);
  });

  it('SetTutorialWindowsEnabled(0) blocks', () => {
    expect(TutorialManager.shouldShowTutorialWindow(false, true, false)).toBe(false);
  });

  it('Options Tutorial Popups off blocks', () => {
    expect(TutorialManager.shouldShowTutorialWindow(true, false, false)).toBe(false);
  });

  it('already-seen PT_TUT_WND_SHOWN bit blocks', () => {
    expect(TutorialManager.shouldShowTutorialWindow(true, true, true)).toBe(false);
  });
});
