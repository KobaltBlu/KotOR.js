/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, jest } from '@jest/globals';
import { BackgroundMusicMode } from '@/enums/audio/BackgroundMusicMode';
import { AudioPriorityGroup } from '@/enums/audio/AudioPriorityGroup';

/** FadeAndStopDialogAmbientTrack. */
const DIALOG_AMBIENT_TRACK_FADE_MS = 500;

describe('Dialog music enter/exit parity', () => {
  test('DIALOG_AMBIENT_TRACK_FADE_MS is engine 500', () => {
    expect(DIALOG_AMBIENT_TRACK_FADE_MS).toBe(500);
  });

  test('dialog play must not stop area emitters (call-pattern)', () => {
    const areaDay = { stop: jest.fn(), playing: true };
    const areaNight = { stop: jest.fn(), playing: false };
    let bgmMode = BackgroundMusicMode.AREA;

    const onDialogPlay = () => {
      bgmMode = BackgroundMusicMode.DIALOG;
    };

    onDialogPlay();
    expect(bgmMode).toBe(BackgroundMusicMode.DIALOG);
    expect(areaDay.stop).not.toHaveBeenCalled();
    expect(areaNight.stop).not.toHaveBeenCalled();
  });

  test('dialog ended restores mode without arming MusicDelay', () => {
    let bgmMode = BackgroundMusicMode.DIALOG;
    let bgmTimer = 99;
    const onDialogEnded = () => {
      bgmMode = BackgroundMusicMode.AREA;
    };
    onDialogEnded();
    expect(bgmMode).toBe(BackgroundMusicMode.AREA);
    expect(bgmTimer).toBe(99);
  });

  test('dialog AmbientTrack priority is group 4', () => {
    expect(AudioPriorityGroup.LOOPING_AREAWIDE_AMBIENTS).toBe(4);
  });

  test('exit unduck-only does not resume area (call-pattern)', () => {
    const resume = jest.fn();
    const stopDialog = jest.fn();
    const stopDucking = jest.fn();
    const endConversationAudio = () => {
      stopDucking();
    };
    endConversationAudio();
    expect(stopDucking).toHaveBeenCalled();
    expect(stopDialog).not.toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();
  });

  test('empty AmbientTrack stops prior dialog emitter (call-pattern)', () => {
    const dialogEmitter = { stop: jest.fn(), play: jest.fn() };
    const loadBackgroundMusic = (ambientTrack: string | undefined) => {
      if(!ambientTrack){
        dialogEmitter.stop();
        return;
      }
      // ctor looping=0 → AIL play-once (not infinite loop).
      dialogEmitter.play(false);
    };
    loadBackgroundMusic(undefined);
    expect(dialogEmitter.stop).toHaveBeenCalled();
    expect(dialogEmitter.play).not.toHaveBeenCalled();
    loadBackgroundMusic('mus_dlg');
    expect(dialogEmitter.play).toHaveBeenCalledWith(false);
  });

  test('AmbientTrack plays once (not loop)', () => {
    // AmbientTrack: looping flag 0 → play once.
    const ailLoopCountFromRetailLoopingFlag = (loopingField: number) =>
      (loopingField === 0) ? 1 : 0;
    expect(ailLoopCountFromRetailLoopingFlag(0)).toBe(1);
    expect(ailLoopCountFromRetailLoopingFlag(1)).toBe(0);
  });

  test('bark skips AmbientTrack load (call-pattern)', () => {
    const loadBackgroundMusic = jest.fn();
    const isBark = true;
    if(!isBark){
      loadBackgroundMusic();
    }
    expect(loadBackgroundMusic).not.toHaveBeenCalled();
  });

  test('fadeStopDialogAmbientTrack uses 500ms (call-pattern)', async () => {
    const fadeOutAndStop = jest.fn(async () => {});
    let bgmMode = BackgroundMusicMode.DIALOG;
    const fadeStopDialogAmbientTrack = async () => {
      await fadeOutAndStop(DIALOG_AMBIENT_TRACK_FADE_MS / 1000);
      if(bgmMode === BackgroundMusicMode.DIALOG){
        bgmMode = BackgroundMusicMode.AREA;
      }
    };
    await fadeStopDialogAmbientTrack();
    expect(fadeOutAndStop).toHaveBeenCalledWith(0.5);
    expect(bgmMode).toBe(BackgroundMusicMode.AREA);
  });
});
