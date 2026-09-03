/**
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import {
  areRequiredDialogParticipantsReady,
  DIALOG_PARTICIPANT_RETRY_MS,
  isRequiredDialogParticipantReady,
} from '@/managers/dialog-participant-ready';

describe('dialog-participant-ready', () => {
  test('retail retry window is 1500ms', () => {
    expect(DIALOG_PARTICIPANT_RETRY_MS).toBe(1500);
  });

  test('NonDependant missing participant is ready', () => {
    expect(isRequiredDialogParticipantReady(
      { participant: 'extra', animation: 1200 },
      {
        isNonDependant: () => true,
        stuntActor: undefined,
        liveObject: undefined,
      }
    )).toBe(true);
  });

  test('required stunt actor needs object, model, and animations', () => {
    expect(isRequiredDialogParticipantReady(
      { participant: 'bastila', animation: 1200 },
      {
        isNonDependant: () => false,
        stuntActor: { participant: 'bastila' },
        liveObject: undefined,
      }
    )).toBe(false);

    expect(isRequiredDialogParticipantReady(
      { participant: 'bastila', animation: 1200 },
      {
        isNonDependant: () => false,
        stuntActor: {
          participant: 'bastila',
          moduleObject: { model: {} },
          animations: [{ name: 'cut001w' }],
        },
        liveObject: undefined,
      }
    )).toBe(true);
  });

  test('areRequiredDialogParticipantsReady fails if any required missing', () => {
    const stunts = new Map([
      ['player', {
        participant: 'PLAYER',
        moduleObject: { model: {} },
        animations: [{ name: 'cut001w' }],
      }],
      ['bastila', {
        participant: 'Bastila',
        moduleObject: undefined,
        animations: undefined,
      }],
    ]);
    expect(areRequiredDialogParticipantsReady(
      [
        { participant: 'player', animation: 1200 },
        { participant: 'bastila', animation: 1200 },
      ],
      {
        isNonDependant: () => false,
        getStuntActor: (n) => stunts.get(n),
        getLiveObject: () => undefined,
      }
    )).toBe(false);
  });
});
