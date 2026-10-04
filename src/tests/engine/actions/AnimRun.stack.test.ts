/**
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import { AuroraAnimationFlag } from '@core/enums/animation/AuroraAnimationFlag';
import {
  ANIM_RUN_STACK_CAP,
  createAnimRun,
  isOverlayRun,
} from '@engine/odyssey/AnimRun';
import { OdysseyModelAnimationManager } from '@engine/odyssey/OdysseyModelAnimationManager';
import type { OdysseyModelAnimation } from '@engine/odyssey/OdysseyModelAnimation';

function fakeAnim(name: string, length = 1, transition = 0.25): OdysseyModelAnimation {
  return {
    type: 'OdysseyModelAnimation',
    name,
    length,
    transition,
    nodes: [],
    events: [],
    _position: { x: 0, y: 0, z: 0 } as any,
    _quaternion: { x: 0, y: 0, z: 0, w: 1 } as any,
  } as OdysseyModelAnimation;
}

function makeManager(): OdysseyModelAnimationManager {
  const model: any = {
    bonesInitialized: true,
    animateFrame: false, // skip bone pose in unit tests
    animLoops: [],
    playEvent() {},
    nodes: new Map(),
  };
  return new OdysseyModelAnimationManager(model);
}

describe('AnimRun stack', () => {
  test('createAnimRun starts at weight 0 when transition > 0', () => {
    const run = createAnimRun(fakeAnim('walk', 1, 0.25), AuroraAnimationFlag.LOOPING);
    expect(run.weight).toBe(0);
    expect(run.transition).toBe(0.25);
    expect(isOverlayRun(run)).toBe(false);
  });

  test('sole base insert snaps weight to 1 even with transition', () => {
    const mgr = makeManager();
    const run = mgr.playAnimation(
      fakeAnim('walk', 1, 0.25),
      AuroraAnimationFlag.LOOPING,
      { loop: true }
    )!;
    expect(run.weight).toBe(1);
    expect(mgr.runs.length).toBe(1);
  });

  test('second base keeps weight 0 for crossfade when partner exists', () => {
    const mgr = makeManager();
    const a = mgr.playAnimation(
      fakeAnim('walk', 1, 0.25),
      AuroraAnimationFlag.LOOPING,
      { loop: true }
    )!;
    expect(a.weight).toBe(1);
    const b = mgr.playAnimation(
      fakeAnim('run', 1, 0.25),
      AuroraAnimationFlag.LOOPING,
      { loop: true }
    )!;
    expect(b.weight).toBe(0);
    expect(mgr.runs.length).toBe(2);
  });

  test('createAnimRun starts at weight 1 when transition is 0', () => {
    const run = createAnimRun(fakeAnim('pause', 1, 0), AuroraAnimationFlag.LOOPING);
    expect(run.weight).toBe(1);
  });

  test('base play inserts; overlay does not clear base', () => {
    const mgr = makeManager();
    mgr.playAnimation(fakeAnim('run'), AuroraAnimationFlag.LOOPING, { loop: true });
    expect(mgr.runs.length).toBe(1);
    expect(mgr.currentAnimation?.name).toBe('run');

    mgr.playOverlayAnimation(
      fakeAnim('listen'),
      AuroraAnimationFlag.OVERLAY_SLOT | AuroraAnimationFlag.FIRE_FORGET
    );
    expect(mgr.runs.length).toBe(2);
    expect(mgr.currentAnimation?.name).toBe('run');
    expect(mgr.overlayAnimation?.name).toBe('listen');
  });

  test('base weight reaching 1 purges older non-overlay runs', () => {
    const mgr = makeManager();
    const a = fakeAnim('walk', 1, 0.2);
    const b = fakeAnim('run', 1, 0.2);
    mgr.playAnimation(a, AuroraAnimationFlag.LOOPING, { loop: true });
    // Force first base to full weight
    mgr.runs[0].weight = 1;
    mgr.playAnimation(b, AuroraAnimationFlag.LOOPING, { loop: true });
    expect(mgr.runs.length).toBe(2);

    // Ramp new base to full weight
    const neu = mgr.runs[mgr.runs.length - 1];
    neu.weight = 1;
    mgr.update(0); // purge pass
    const bases = mgr.runs.filter((r) => !isOverlayRun(r));
    expect(bases.length).toBe(1);
    expect(bases[0].animation.name).toBe('run');
  });

  test('additive reuse refreshes same-name run', () => {
    const mgr = makeManager();
    const flags =
      AuroraAnimationFlag.OVERLAY_SLOT |
      AuroraAnimationFlag.ADDITIVE_GESTURE |
      AuroraAnimationFlag.FIRE_FORGET;
    const clip = fakeAnim('gesture', 0.5, 0.1);
    const r1 = mgr.playAnimation(clip, flags);
    r1!.weight = 0.5;
    r1!.state.elapsed = 0.2;
    const r2 = mgr.playAnimation(clip, flags);
    expect(r2).toBe(r1);
    expect(mgr.runs.length).toBe(1);
    expect(r1!.state.elapsed).toBe(0);
    expect(r1!.fadingOut).toBe(false);
  });

  test('stopOverlay 0x80 removes non-additive overlays', () => {
    const mgr = makeManager();
    mgr.playAnimation(fakeAnim('walk'), AuroraAnimationFlag.LOOPING, { loop: true });
    mgr.playOverlayAnimation(
      fakeAnim('listen'),
      AuroraAnimationFlag.OVERLAY_SLOT | AuroraAnimationFlag.FIRE_FORGET
    );
    mgr.playOverlayAnimation(
      fakeAnim('g1'),
      AuroraAnimationFlag.OVERLAY_SLOT |
        AuroraAnimationFlag.ADDITIVE_GESTURE |
        AuroraAnimationFlag.FIRE_FORGET
    );
    expect(mgr.runs.length).toBe(3);

    mgr.stopOverlayAnimation(AuroraAnimationFlag.OVERLAY_STOP);
    // non-additive overlay removed; additive fading; base remains
    expect(mgr.runs.some((r) => r.animation.name === 'listen')).toBe(false);
    expect(mgr.runs.some((r) => r.animation.name === 'walk')).toBe(true);
    const add = mgr.runs.find((r) => r.animation.name === 'g1');
    expect(add).toBeTruthy();
    expect(add!.fadingOut).toBe(true);
  });

  test('stopOverlay 0x400 fades additive runs', () => {
    const mgr = makeManager();
    mgr.playOverlayAnimation(
      fakeAnim('g1'),
      AuroraAnimationFlag.ADDITIVE_GESTURE | AuroraAnimationFlag.FIRE_FORGET
    );
    mgr.stopOverlayAnimation(AuroraAnimationFlag.ADDITIVE_GESTURE);
    expect(mgr.runs[0].fadingOut).toBe(true);
  });

  test('weight ramps over transition', () => {
    const mgr = makeManager();
    // Partner base required — sole insert snaps weight to 1
    mgr.playAnimation(fakeAnim('pause', 2, 0), AuroraAnimationFlag.LOOPING, { loop: true });
    const run = mgr.playAnimation(
      fakeAnim('walk', 2, 0.5),
      AuroraAnimationFlag.LOOPING,
      { loop: true }
    )!;
    expect(run.weight).toBe(0);
    mgr.update(0.25);
    expect(run.weight).toBeCloseTo(0.5, 5);
    mgr.update(0.25);
    expect(run.weight).toBeCloseTo(1, 5);
  });

  test('stack cap evicts when full', () => {
    const mgr = makeManager();
    for(let i = 0; i < ANIM_RUN_STACK_CAP + 2; i++){
      mgr.playOverlayAnimation(
        fakeAnim(`ov${i}`, 1, 0),
        AuroraAnimationFlag.OVERLAY_SLOT | AuroraAnimationFlag.FIRE_FORGET
      );
    }
    expect(mgr.runs.length).toBeLessThanOrEqual(ANIM_RUN_STACK_CAP);
  });

  test('currentAnimation is newest base during crossfade', () => {
    const mgr = makeManager();
    const pause = fakeAnim('pause', 1, 0.25);
    const walk = fakeAnim('walk', 1, 0.25);
    mgr.playAnimation(pause, AuroraAnimationFlag.LOOPING, { loop: true });
    mgr.runs[0].weight = 1;
    mgr.playAnimation(walk, AuroraAnimationFlag.LOOPING, { loop: true });
    expect(mgr.runs.length).toBe(2);
    expect(mgr.currentAnimation?.name).toBe('walk');
    expect(mgr.hasActiveBaseNamed('walk')).toBe(true);
    expect(mgr.hasActiveBaseNamed('pause')).toBe(true);
  });

  test('same-name base play reuses without stacking', () => {
    const mgr = makeManager();
    const walk = fakeAnim('walk', 1, 0.25);
    const r1 = mgr.playAnimation(walk, AuroraAnimationFlag.LOOPING, { loop: true })!;
    r1.weight = 1;
    r1.state.elapsed = 0.4;
    const r2 = mgr.playAnimation(walk, AuroraAnimationFlag.LOOPING, {
      loop: true,
      speed: 1.2,
    });
    expect(r2).toBe(r1);
    expect(mgr.runs.length).toBe(1);
    expect(r1.state.elapsed).toBe(0.4);
    expect(r1.state.speed).toBe(1.2);
    expect(r1.weight).toBe(1);
  });

  test('same-name base promote from deeper stack entry', () => {
    const mgr = makeManager();
    const run = fakeAnim('run', 1, 0.25);
    const walk = fakeAnim('walk', 1, 0.25);
    const rRun = mgr.playAnimation(run, AuroraAnimationFlag.LOOPING, { loop: true })!;
    rRun.weight = 1;
    rRun.state.elapsed = 0.55;
    mgr.playAnimation(walk, AuroraAnimationFlag.LOOPING, { loop: true });
    expect(mgr.runs.length).toBe(2);
    // Re-play run: promote deeper entry to newest and purge older base
    const r2 = mgr.playAnimation(run, AuroraAnimationFlag.LOOPING, { loop: true })!;
    expect(r2).toBe(rRun);
    expect(mgr.runs.length).toBe(1);
    expect(mgr.currentAnimation?.name).toBe('run');
  });

  test('QUEUE defers start until predecessor FAF finishes', () => {
    const mgr = makeManager();
    const zoomin = fakeAnim('zoomin', 0.5, 0);
    const rotate = fakeAnim('rotate', 2, 0);
    const a = mgr.playAnimation(zoomin, AuroraAnimationFlag.FIRE_FORGET, { loop: false })!;
    const b = mgr.playAnimation(
      rotate,
      AuroraAnimationFlag.QUEUE | AuroraAnimationFlag.LOOPING,
      { loop: true }
    )!;
    expect(mgr.runs.length).toBe(2);
    expect(a.queued).toBe(false);
    expect(b.queued).toBe(true);
    expect(b.weight).toBe(0);
    expect(mgr.currentAnimation?.name).toBe('zoomin');

    mgr.update(0.1);
    expect(b.queued).toBe(true);
    expect(b.state.elapsed).toBe(0);

    mgr.update(0.5); // finish zoomin → promote rotate
    expect(b.queued).toBe(false);
    expect(mgr.currentAnimation?.name).toBe('rotate');
    expect(b.weight).toBe(1);
  });

  test('QUEUE alone promotes immediately on update', () => {
    const mgr = makeManager();
    const rotate = fakeAnim('rotate', 2, 0);
    const b = mgr.playAnimation(
      rotate,
      AuroraAnimationFlag.QUEUE | AuroraAnimationFlag.LOOPING,
      { loop: true }
    )!;
    expect(b.queued).toBe(true);
    mgr.update(0);
    expect(b.queued).toBe(false);
    expect(b.weight).toBe(1);
  });

  test('REUSE flag skips same-name replace and inserts new run', () => {
    const mgr = makeManager();
    const walk = fakeAnim('walk', 1, 0);
    const r1 = mgr.playAnimation(walk, AuroraAnimationFlag.LOOPING, { loop: true })!;
    const r2 = mgr.playAnimation(
      walk,
      AuroraAnimationFlag.LOOPING | AuroraAnimationFlag.REUSE,
      { loop: true }
    )!;
    expect(r2).not.toBe(r1);
    expect(mgr.runs.length).toBe(2);
  });

  test('cap eviction preserves queued handoff behind active FAF', () => {
    const mgr = makeManager();
    const faf = fakeAnim('zoomin', 1, 0);
    mgr.playAnimation(faf, AuroraAnimationFlag.FIRE_FORGET, { loop: false });
    mgr.playAnimation(
      fakeAnim('rotate', 2, 0),
      AuroraAnimationFlag.QUEUE | AuroraAnimationFlag.LOOPING,
      { loop: true }
    );
    // Fill remaining slots with overlays
    for(let i = 0; i < ANIM_RUN_STACK_CAP; i++){
      mgr.playOverlayAnimation(
        fakeAnim(`ov${i}`, 1, 0),
        AuroraAnimationFlag.OVERLAY_SLOT | AuroraAnimationFlag.FIRE_FORGET
      );
    }
    expect(mgr.runs.length).toBeLessThanOrEqual(ANIM_RUN_STACK_CAP);
    expect(mgr.runs.some((r) => r.animation.name === 'rotate' && r.queued)).toBe(true);
    expect(mgr.runs.some((r) => r.animation.name === 'zoomin')).toBe(true);
  });
});
