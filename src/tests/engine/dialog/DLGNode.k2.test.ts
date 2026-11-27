/**
 * K2 dialog node parity — alien VO race selection, Logic AND/OR, spoken delay.
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

const emotionRows: Record<number, any> = {
  0: { __rowlabel: 0, label: 'Neutral' },
  1: { __rowlabel: 1, label: 'Happy' },
  4: { __rowlabel: 4, label: 'Neutral' },
};

const alienVORows: Record<number, any> = {
  1: { __rowlabel: 1, Neutral: 'avo_r1_n', Happy: 'avo_r1_h', neutral: 'avo_r1_n' },
  3: { __rowlabel: 3, Neutral: 'avo_r3_n', Happy: 'avo_r3_h' },
};

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    TwoDAManager: {
      datatables: new Map([
        ['emotion', {
          getByID: (id: number) => emotionRows[id],
          rows: emotionRows,
        }],
        ['alienvo', {
          getByID: (id: number) => alienVORows[id],
          rows: alienVORows,
        }],
        ['plot', {
          getByID: () => undefined,
          rows: {},
        }],
      ]),
    },
    NWScript: { Load: jest.fn() },
    JournalManager: { AddJournalQuestEntry: jest.fn() },
    DialogMessageManager: { AddEntry: jest.fn() },
    PartyManager: {
      getCurrentPlayer: jest.fn(),
      GiveXP: jest.fn(),
    },
  },
}));

jest.mock('@engine/audio', () => ({ AudioEmitter: class {} }));
jest.mock('@core/resource/LIPObject', () => ({ LIPObject: class {} }));
jest.mock('@engine/world/DialogMessageEntry', () => ({ DialogMessageEntry: class {} }));
jest.mock('@engine/nwscript/NWScriptInstance', () => ({
  NWScriptInstance: class {
    name = '';
    setScriptParam() {}
    setScriptStringParam() {}
    run() { return 0; }
  },
}));

import { DLGNode } from '@engine/dialog/DLGNode';
import { ModuleCreatureAnimState } from '@core/enums/module/ModuleCreatureAnimState';

describe('DLGNode.resolveAlienVO (LoadDialogBase)', () => {
  let node: DLGNode;

  beforeEach(() => {
    node = new DLGNode({ alienRaceOwner: 3 } as any);
    node.vo_resref = '';
    node.sound = '';
    node.emotion = 4;
    node.alienRaceNode = 0;
    node.speakerTag = '';
    node.soundExists = 0x80;
  });

  test('skips when VO_ResRef already set', () => {
    node.vo_resref = 'existing_vo';
    node.alienRaceNode = 1;
    node.resolveAlienVO(node.dialog);
    expect(node.vo_resref).toBe('existing_vo');
  });

  test('owner path (empty Speaker): AlienRaceNode > 0 wins', () => {
    node.speakerTag = '';
    node.alienRaceNode = 1;
    node.resolveAlienVO(node.dialog);
    expect(node.vo_resref).toBe('avo_r1_n');
    expect(node.soundExists & 3).toBe(3);
  });

  test('owner path: falls back to AlienRaceOwner when AlienRaceNode is 0', () => {
    node.speakerTag = '';
    node.alienRaceNode = 0;
    node.resolveAlienVO(node.dialog);
    expect(node.vo_resref).toBe('avo_r3_n');
  });

  test('tagged Speaker: no AlienRaceOwner fallback', () => {
    node.speakerTag = 'hk47';
    node.alienRaceNode = 0;
    node.resolveAlienVO(node.dialog);
    expect(node.vo_resref).toBe('');
  });

  test('tagged Speaker: uses AlienRaceNode when > 0', () => {
    node.speakerTag = 'hk47';
    node.alienRaceNode = 1;
    node.emotion = 1;
    node.resolveAlienVO(node.dialog);
    expect(node.vo_resref).toBe('avo_r1_h');
  });

  test('resolves when Sound is set but VO_ResRef is empty', () => {
    node.sound = 'sfx_extra';
    node.alienRaceNode = 1;
    node.resolveAlienVO(node.dialog);
    expect(node.vo_resref).toBe('avo_r1_n');
    expect(node.soundExists & 3).toBe(3);
  });
});

describe('DLGNode.applyAlienVOTake (SendDialogEntry)', () => {
  test('appends take and sets SoundExists bit4 once', () => {
    const node = new DLGNode();
    node.vo_resref = 'avo_r1_n';
    node.soundExists = 0x80 | 3;
    node.applyAlienVOTake(2);
    expect(node.vo_resref).toBe('avo_r1_n2');
    expect(node.soundExists & 4).toBe(4);
    node.applyAlienVOTake(3);
    expect(node.vo_resref).toBe('avo_r1_n2');
  });

  test('no-op when SoundExists bit2 clear', () => {
    const node = new DLGNode();
    node.vo_resref = 'avo_r1_n';
    node.soundExists = 0x80;
    node.applyAlienVOTake(1);
    expect(node.vo_resref).toBe('avo_r1_n');
  });

  test('no-op when vo_resref empty', () => {
    const node = new DLGNode();
    node.vo_resref = '';
    node.soundExists = 0x80 | 3;
    node.applyAlienVOTake(1);
    expect(node.vo_resref).toBe('');
    expect(node.soundExists & 4).toBe(0);
  });
});

describe('DLGNode.runActiveScripts Logic (SendDialogReplies)', () => {
  const makeActive = (result: boolean) => ({
    setScriptParam() {},
    setScriptStringParam() {},
    run: () => (result ? 1 : 0),
  });

  test('AND (Logic=0): both must pass', () => {
    const node = new DLGNode();
    node.Logic = false;
    node.isActive = makeActive(true) as any;
    node.isActive2 = makeActive(false) as any;
    expect(node.runActiveScripts()).toBe(false);
    node.isActive2 = makeActive(true) as any;
    expect(node.runActiveScripts()).toBe(true);
  });

  test('OR (Logic=1): either may pass', () => {
    const node = new DLGNode();
    node.Logic = true;
    node.isActive = makeActive(false) as any;
    node.isActive2 = makeActive(true) as any;
    expect(node.runActiveScripts()).toBe(true);
    node.isActive2 = makeActive(false) as any;
    expect(node.runActiveScripts()).toBe(false);
  });

  test('single Active is used alone', () => {
    const node = new DLGNode();
    node.Logic = false;
    node.isActive = makeActive(true) as any;
    node.isActive2 = undefined;
    expect(node.runActiveScripts()).toBe(true);
    node.isActive = undefined;
    node.isActive2 = makeActive(false) as any;
    expect(node.runActiveScripts()).toBe(false);
  });
});

describe('DLGNode ActionParam ungate (LoadDialogBase)', () => {
  test('Script1 params can be set without Script2 present', () => {
    const node = new DLGNode();
    node.scriptParams.Param1 = 7;
    node.scriptParams.String = 'tag';
    expect(node.scriptParams.Param1).toBe(7);
    expect(node.script2).toBeUndefined();
    expect(node.script2Params.Param1).toBeUndefined();
  });
});

describe('DLGNode.estimateSpokenTimeSeconds', () => {
  test('empty text → 0', () => {
    expect(DLGNode.estimateSpokenTimeSeconds('')).toBe(0);
    expect(DLGNode.estimateSpokenTimeSeconds('   ')).toBe(0);
  });

  test('engine length * 0.11 + 1.0', () => {
    expect(DLGNode.estimateSpokenTimeSeconds('abcd')).toBeCloseTo(4 * 0.11 + 1.0, 5);
  });
});

describe('ModuleCreatureAnimState TSL dialog ids', () => {
  test('COLLAPSE_LP / POINT_UP / POINT_UP_LOWER / DIVE_ROLL', () => {
    expect(ModuleCreatureAnimState.COLLAPSE_LP).toBe(10502);
    expect(ModuleCreatureAnimState.POINT_UP).toBe(10505);
    expect(ModuleCreatureAnimState.POINT_UP_LOWER).toBe(10506);
    expect(ModuleCreatureAnimState.DIVE_ROLL).toBe(10509);
  });

  test('TURN_LEFT does not collide with DIVE_ROLL', () => {
    expect(ModuleCreatureAnimState.TURN_LEFT).not.toBe(ModuleCreatureAnimState.DIVE_ROLL);
    expect(ModuleCreatureAnimState.TURN_RIGHT).not.toBe(ModuleCreatureAnimState.DIVE_ROLL);
  });
});
