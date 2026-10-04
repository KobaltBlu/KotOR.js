/**
 * tar_m02ac Zelka lab-door OnOpen (k_ptar_alertzelk) diagnostics.
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';

const mockGetGlobalNumber = jest.fn(() => 0);
const mockGetFirstPC = jest.fn();
const mockParty: any[] = [];

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    PartyManager: {
      get party() {
        return mockParty;
      },
      getFirstPC: () => mockGetFirstPC(),
    },
    GlobalVariableManager: {
      GetGlobalNumber: (name: string) => mockGetGlobalNumber(name),
    },
  },
}));

import {
  logAlertzelkOnOpen,
  shouldLogAlertzelkOnOpen,
} from '@engine/module/door-onopen-diagnostics';

describe('door-onopen-diagnostics k_ptar_alertzelk', () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    mockParty.length = 0;
    mockGetGlobalNumber.mockReset();
    mockGetGlobalNumber.mockReturnValue(0);
    mockGetFirstPC.mockReset();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('shouldLogAlertzelkOnOpen matches script name case-insensitively', () => {
    expect(shouldLogAlertzelkOnOpen('k_ptar_alertzelk')).toBe(true);
    expect(shouldLogAlertzelkOnOpen('K_PTAR_ALERTZELK')).toBe(true);
    expect(shouldLogAlertzelkOnOpen('k_something_else')).toBe(false);
    expect(shouldLogAlertzelkOnOpen(undefined)).toBe(false);
  });

  test('logs Tar_ZelkaRm, party[0], and GetFirstPC inequality when Carth leads', () => {
    const pc = {
      getName: () => 'PC',
      getTag: () => '',
      tag: '',
      npcId: -1,
      isPlayer: true,
    };
    const carth = {
      getName: () => 'Carth',
      getTag: () => 'carth',
      tag: 'carth',
      npcId: 2,
      isPlayer: false,
    };
    mockParty.push(carth, pc);
    mockGetFirstPC.mockReturnValue(pc);
    mockGetGlobalNumber.mockReturnValue(0);

    const diagnostic = logAlertzelkOnOpen(
      { tag: 'tar02_labdoor', getTag: () => 'tar02_labdoor' },
      carth as any,
    );

    expect(diagnostic).toEqual(
      expect.objectContaining({
        doorTag: 'tar02_labdoor',
        Tar_ZelkaRm: 0,
        firstPCEqualsParty0: false,
        party0: expect.objectContaining({ name: 'Carth', npcId: 2 }),
        firstPC: expect.objectContaining({ name: 'PC', npcId: -1 }),
        lastOpenedBy: expect.objectContaining({ name: 'Carth', tag: 'carth' }),
      }),
    );
    expect(logSpy).toHaveBeenCalledWith('[k_ptar_alertzelk OnOpen]', diagnostic);
  });

  test('firstPCEqualsParty0 is true when PC is already party leader (no JumpToObject)', () => {
    const pc = {
      getName: () => 'PC',
      getTag: () => '',
      tag: '',
      npcId: -1,
      isPlayer: true,
    };
    mockParty.push(pc);
    mockGetFirstPC.mockReturnValue(pc);
    mockGetGlobalNumber.mockReturnValue(0);

    const diagnostic = logAlertzelkOnOpen(
      { tag: 'tar02_labdoor' },
      pc as any,
    );

    expect(diagnostic.firstPCEqualsParty0).toBe(true);
    expect(diagnostic.party0?.isPlayer).toBe(true);
  });

  test('reports Tar_ZelkaRm=2 for secret-door cutscene OnOpen (ResumeConversation branch)', () => {
    const pc = {
      getName: () => 'PC',
      getTag: () => '',
      tag: '',
      npcId: -1,
      isPlayer: true,
    };
    const zelka = {
      getName: () => 'Zelka',
      getTag: () => 'zelka021',
      tag: 'zelka021',
      npcId: undefined,
      isPlayer: false,
    };
    mockParty.push(pc);
    mockGetFirstPC.mockReturnValue(pc);
    mockGetGlobalNumber.mockReturnValue(2);

    const diagnostic = logAlertzelkOnOpen(
      { tag: 'tar02_labdoor' },
      zelka as any,
    );

    expect(diagnostic.Tar_ZelkaRm).toBe(2);
    expect(diagnostic.firstPCEqualsParty0).toBe(true);
    expect(diagnostic.lastOpenedBy?.tag).toBe('zelka021');
  });
});
