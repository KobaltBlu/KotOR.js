/**
 * @jest-environment node
 */
import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  PAZAAK_TUT_CONTINUE_HIGH,
  PAZAAK_TUT_DRAWN_CARD,
  PAZAAK_TUT_GAME_START,
  PAZAAK_TUT_HAND_HELP,
  PAZAAK_TUT_SETUP,
  PAZAAK_TUT_STAND_HELP,
  PAZAAK_TUT_STAND_LOW,
  PazaakTutorialAction,
  PazaakTutorialDriver,
} from '@/engine/minigames/pazaak-tutorial';

describe('PazaakTutorialDriver (CSWGuiTutorial)', () => {
  let tut: PazaakTutorialDriver;

  beforeEach(() => {
    tut = new PazaakTutorialDriver();
  });

  it('disabled: beginSetup / beginGame return 0', () => {
    tut.setEnabled(false);
    expect(tut.beginSetup()).toBe(0);
    expect(tut.beginGameIfNeeded()).toBe(0);
    expect(tut.beginDrawnCardHelpIfNeeded()).toBe(0);
  });

  it('setup queues 0x96e3..0x96e5 and advances on close', () => {
    tut.setEnabled(true);
    expect(tut.beginSetup()).toBe(PAZAAK_TUT_SETUP[0]);
    expect(tut.queue).toEqual([PAZAAK_TUT_SETUP[1], PAZAAK_TUT_SETUP[2]]);

    let r = tut.onHelpClosed(PAZAAK_TUT_SETUP[0]);
    expect(r.action).toBe(PazaakTutorialAction.NONE);
    expect(r.nextStrRef).toBe(PAZAAK_TUT_SETUP[1]);

    r = tut.onHelpClosed(PAZAAK_TUT_SETUP[1]);
    expect(r.nextStrRef).toBe(PAZAAK_TUT_SETUP[2]);

    r = tut.onHelpClosed(PAZAAK_TUT_SETUP[2]);
    expect(r.nextStrRef).toBe(0);
  });

  it('game start queues once then stays silent', () => {
    tut.setEnabled(true);
    expect(tut.beginGameIfNeeded()).toBe(PAZAAK_TUT_GAME_START[0]);
    expect(tut.beginGameIfNeeded()).toBe(0);
    const r = tut.onHelpClosed(PAZAAK_TUT_GAME_START[0]);
    expect(r.nextStrRef).toBe(PAZAAK_TUT_GAME_START[1]);
  });

  it('close 0x96e9 enqueues hand help + SET_HAND_HINT', () => {
    tut.setEnabled(true);
    expect(tut.beginDrawnCardHelpIfNeeded()).toBe(PAZAAK_TUT_DRAWN_CARD);
    const r = tut.onHelpClosed(PAZAAK_TUT_DRAWN_CARD);
    expect(r.action).toBe(PazaakTutorialAction.SET_HAND_HINT);
    expect(r.nextStrRef).toBe(PAZAAK_TUT_HAND_HELP[0]);
    expect(tut.queue).toEqual([...PAZAAK_TUT_HAND_HELP.slice(1)]);
  });

  it('close 0x96ec enqueues stand help', () => {
    tut.setEnabled(true);
    tut.queue = [];
    tut.current = 0x96ec;
    const r = tut.onHelpClosed(0x96ec);
    expect(r.action).toBe(PazaakTutorialAction.NONE);
    expect(r.nextStrRef).toBe(PAZAAK_TUT_STAND_HELP[0]);
    expect(tut.queue).toEqual([...PAZAAK_TUT_STAND_HELP.slice(1)]);
  });

  it('close stand/continue warnings return FORCE_STAND', () => {
    tut.setEnabled(true);
    expect(tut.beginStandLowWarn()).toBe(PAZAAK_TUT_STAND_LOW);
    expect(tut.onHelpClosed(PAZAAK_TUT_STAND_LOW).action).toBe(PazaakTutorialAction.FORCE_STAND);
    expect(tut.beginContinueHighWarn()).toBe(PAZAAK_TUT_CONTINUE_HIGH);
    expect(tut.onHelpClosed(PAZAAK_TUT_CONTINUE_HIGH).action).toBe(PazaakTutorialAction.FORCE_STAND);
  });

  it('reset clears session bits', () => {
    tut.setEnabled(true);
    tut.beginGameIfNeeded();
    tut.beginDrawnCardHelpIfNeeded();
    tut.reset();
    expect(tut.gameStartShown).toBe(false);
    expect(tut.drawnCardHelpShown).toBe(false);
    expect(tut.queue).toEqual([]);
  });
});
