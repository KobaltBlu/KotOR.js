/**
 * @jest-environment node
 *
 * Run: npx jest --config jest.audio-priority.config.js --coverage=false
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { SWPriorityGroup } from '@/engine/rules/SWPriorityGroup';
import { AudioPriorityManager } from '@/audio/AudioPriorityManager';
import { AudioPriorityGroup } from '@/enums/audio/AudioPriorityGroup';

const groups: Record<number, SWPriorityGroup> = {};

jest.mock('@/GameState', () => ({
  GameState: {
    SWRuleSet: {
      getPriorityGroupById: (id: number) => groups[id],
    },
  },
}));

describe('SWPriorityGroup.From2DA', () => {
  test('K1 row loads volume and capped maxplaying', () => {
    const group = SWPriorityGroup.From2DA({
      __index: 15,
      label: 'Combat',
      priority: 15,
      volume: 127,
      maxplaying: 30,
      interrupt: 0,
      fadetime: 0,
      maxvolumedist: 10,
      minvolumedist: 30,
      playbackvariance: 0.3,
    });
    expect(group.id).toBe(15);
    expect(group.volume).toBe(127);
    expect(group.maxplaying).toBe(30);
    expect(group.isUnlimited()).toBe(false);
    expect(group.canPreemptSameGroup()).toBe(false);
    expect(group.playbackvariance).toBeCloseTo(0.3);
  });

  test('**** maxplaying and interrupt use engine ctor defaults', () => {
    const group = SWPriorityGroup.From2DA({
      __index: 2,
      label: 'Streams_Music',
      priority: 2,
      volume: 64,
      maxplaying: '****',
      interrupt: '****',
      fadetime: 1000,
    });
    expect(group.maxplaying).toBe(255);
    expect(group.isUnlimited()).toBe(true);
    expect(group.interrupt).toBe(1);
    expect(group.canPreemptSameGroup()).toBe(true);
    expect(group.getFadeTimeSeconds()).toBe(1);
  });

  test('K2 volume_pc and distance_pc columns', () => {
    const group = SWPriorityGroup.From2DA({
      __index: 19,
      label: 'Player_Footsteps',
      priority: 19,
      volume_pc: 55,
      volume_xbox: 55,
      maxplaying: 10,
      interrupt: 1,
      fadetime: 0,
      maxvolumedist_pc: 4,
      minvolumedist_pc: 10,
      maxvolumedist_xbox: 4,
      minvolumedist_xbox: 10,
      playbackvariance: 0.3,
    });
    expect(group.volume).toBe(55);
    expect(group.maxvolumedist).toBe(4);
    expect(group.minvolumedist).toBe(10);
    expect(group.canPreemptSameGroup()).toBe(true);
  });
});

describe('AudioPriorityManager', () => {
  beforeEach(() => {
    for(const key of Object.keys(groups)){
      delete groups[Number(key)];
    }
    // Combat: interrupt=0 → deny at max (Play)
    groups[AudioPriorityGroup.COMBAT] = SWPriorityGroup.From2DA({
      __index: AudioPriorityGroup.COMBAT,
      label: 'Combat',
      priority: 15,
      volume: 127,
      maxplaying: 2,
      interrupt: 0,
      fadetime: 0,
    });
    // Footsteps: interrupt=1 → preempt newest at max
    groups[AudioPriorityGroup.PLAYER_FOOTSTEPS] = SWPriorityGroup.From2DA({
      __index: AudioPriorityGroup.PLAYER_FOOTSTEPS,
      label: 'Player_Footsteps',
      priority: 19,
      volume: 65,
      maxplaying: 2,
      interrupt: 1,
      fadetime: 0,
    });
    groups[AudioPriorityGroup.PLAYER_CHAT] = SWPriorityGroup.From2DA({
      __index: AudioPriorityGroup.PLAYER_CHAT,
      label: 'Player_Chat',
      priority: 8,
      volume: 90,
      maxplaying: 1,
      interrupt: 1,
      fadetime: 0,
    });
    groups[AudioPriorityGroup.MUSIC_STREAMS] = SWPriorityGroup.From2DA({
      __index: AudioPriorityGroup.MUSIC_STREAMS,
      label: 'Streams_Music',
      priority: 2,
      volume: 64,
      maxplaying: '****',
      interrupt: '****',
      fadetime: 1000,
    });
  });

  test('interrupt 0 denies when at maxplaying', () => {
    const manager = new AudioPriorityManager();
    const stolen: number[] = [];
    const a = manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.COMBAT,
      onStolen: () => stolen.push(0),
    });
    const b = manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.COMBAT,
      onStolen: () => stolen.push(1),
    });
    const c = manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.COMBAT,
      onStolen: () => stolen.push(2),
    });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
    expect(c.allowed).toBe(false);
    expect(stolen).toEqual([]);
    expect(manager.getVoiceCount(AudioPriorityGroup.COMBAT)).toBe(2);
  });

  test('interrupt 1 preempts newest same-group voice at maxplaying', () => {
    const manager = new AudioPriorityManager();
    const stolen: number[] = [];
    const owners = [{}, {}, {}];

    const a = manager.tryAcquire({
      owner: owners[0],
      groupId: AudioPriorityGroup.PLAYER_FOOTSTEPS,
      onStolen: () => stolen.push(0),
    });
    const b = manager.tryAcquire({
      owner: owners[1],
      groupId: AudioPriorityGroup.PLAYER_FOOTSTEPS,
      onStolen: () => stolen.push(1),
    });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);

    const c = manager.tryAcquire({
      owner: owners[2],
      groupId: AudioPriorityGroup.PLAYER_FOOTSTEPS,
      onStolen: () => stolen.push(2),
    });
    expect(c.allowed).toBe(true);
    // InterruptPlayingSound takes head of AddHead list = newest → voice b
    expect(stolen).toEqual([1]);
    expect(manager.getVoiceCount(AudioPriorityGroup.PLAYER_FOOTSTEPS)).toBe(2);
  });

  test('player chat maxplaying 1 preempts previous bark', () => {
    const manager = new AudioPriorityManager();
    const stolen: number[] = [];
    const first = manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.PLAYER_CHAT,
      onStolen: () => stolen.push(0),
    });
    const second = manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.PLAYER_CHAT,
      onStolen: () => stolen.push(1),
    });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(stolen).toEqual([0]);
    expect(manager.getVoiceCount(AudioPriorityGroup.PLAYER_CHAT)).toBe(1);
  });

  test('**** maxplaying never denies under soft 2D budget', () => {
    const manager = new AudioPriorityManager();
    manager.max2DVoices = 64;
    for(let i = 0; i < 40; i++){
      const result = manager.tryAcquire({
        owner: {},
        groupId: AudioPriorityGroup.MUSIC_STREAMS,
        onStolen: () => {},
      });
      expect(result.allowed).toBe(true);
    }
    expect(manager.getVoiceCount(AudioPriorityGroup.MUSIC_STREAMS)).toBe(40);
  });

  test('soft 2D budget steals worse priority across groups', () => {
    const manager = new AudioPriorityManager();
    manager.max2DVoices = 2;
    manager.max3DVoices = 2;
    const stolen: string[] = [];

    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.PLAYER_FOOTSTEPS,
      onStolen: () => stolen.push('foot'),
    }).allowed).toBe(true);
    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.COMBAT,
      onStolen: () => stolen.push('combat'),
    }).allowed).toBe(true);

    // Chat priority 8 beats combat 15 and footsteps 19 → steal worst (footsteps)
    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.PLAYER_CHAT,
      onStolen: () => stolen.push('chat'),
    }).allowed).toBe(true);
    expect(stolen).toEqual(['foot']);
    expect(manager.getActiveVoiceCount()).toBe(2);
    expect(manager.getVoiceCount(AudioPriorityGroup.PLAYER_FOOTSTEPS)).toBe(0);
    expect(manager.getVoiceCount(AudioPriorityGroup.COMBAT)).toBe(1);
    expect(manager.getVoiceCount(AudioPriorityGroup.PLAYER_CHAT)).toBe(1);
  });

  test('soft 2D budget denies when no worse-priority victim', () => {
    const manager = new AudioPriorityManager();
    manager.max2DVoices = 2;
    manager.max3DVoices = 2;

    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.PLAYER_CHAT,
      onStolen: () => {},
    }).allowed).toBe(true);
    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.MUSIC_STREAMS,
      onStolen: () => {},
    }).allowed).toBe(true);

    // Footsteps (19) cannot steal chat (8) or music (2)
    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.PLAYER_FOOTSTEPS,
      onStolen: () => {},
    }).allowed).toBe(false);
    expect(manager.getActiveVoiceCount()).toBe(2);
  });

  test('full 2D pool does not steal from 3D pool', () => {
    const manager = new AudioPriorityManager();
    manager.max2DVoices = 1;
    manager.max3DVoices = 1;
    const stolen: string[] = [];

    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.PLAYER_FOOTSTEPS,
      is3D: true,
      onStolen: () => stolen.push('3d-foot'),
    }).allowed).toBe(true);

    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.COMBAT,
      is3D: false,
      onStolen: () => stolen.push('2d-combat'),
    }).allowed).toBe(true);

    // 2D pool full of combat(15); chat(8) steals combat, not the 3D foot voice
    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.PLAYER_CHAT,
      is3D: false,
      onStolen: () => stolen.push('2d-chat'),
    }).allowed).toBe(true);
    expect(stolen).toEqual(['2d-combat']);
    expect(manager.getPoolVoiceCount(true)).toBe(1);
    expect(manager.getPoolVoiceCount(false)).toBe(1);
    expect(manager.getVoiceCount(AudioPriorityGroup.PLAYER_FOOTSTEPS)).toBe(1);
  });

  test('full 3D pool does not steal from 2D pool', () => {
    const manager = new AudioPriorityManager();
    manager.max2DVoices = 1;
    manager.max3DVoices = 1;

    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.PLAYER_CHAT,
      is3D: false,
      onStolen: () => {},
    }).allowed).toBe(true);

    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.COMBAT,
      is3D: true,
      onStolen: () => {},
    }).allowed).toBe(true);

    // 3D full of combat(15); footsteps(19) cannot steal chat (wrong pool) or combat (worse requester)
    expect(manager.tryAcquire({
      owner: {},
      groupId: AudioPriorityGroup.PLAYER_FOOTSTEPS,
      is3D: true,
      onStolen: () => {},
    }).allowed).toBe(false);
    expect(manager.getPoolVoiceCount(false)).toBe(1);
    expect(manager.getPoolVoiceCount(true)).toBe(1);
  });
});
