/**
 * JournalManager.test.ts
 *
 * Tests for the JournalManager.AddJournalQuestEntry() bugfixes:
 *  1. New entries are pushed to the Entries array.
 *  2. State updates only go higher (unless allowOverrideHigher is true).
 *  3. Returns true when the plot ID exists, false otherwise.
 *  4. New entries stamp date/time from GameState.module.timeManager (K1 blocker fix).
 */

// -------------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------------

// Mutable module time state so individual tests can override it.
const mockTimeManager = { pauseDay: 0, pauseTime: 0 };
const mockGameState: Record<string, any> = {
  UINotificationManager: {
    EnableUINotificationIconType: jest.fn(),
  },
  module: { timeManager: mockTimeManager },
};

jest.mock('../GameState', () => ({
  get GameState() { return mockGameState; },
}));

jest.mock('../managers/TwoDAManager', () => {
  const rows: Record<string, any> = {
    0: { __rowlabel: 0, label: 'tat_escape_kreia' },
    1: { __rowlabel: 1, label: 'tat_gain_clue' },
    2: { __rowlabel: 2, label: 'tar_escape' },      // K1: Taris Escape quest
    3: { __rowlabel: 3, label: 'dan_jedi_ritual' }, // K1: Dantooine Jedi ritual quest
  };
  return {
    TwoDAManager: {
      datatables: {
        get: (name: string) => ({
          getRowByColumnAndValue: (col: string, val: string) => {
            for (const row of Object.values(rows)) {
              if (row[col] === val) return row;
            }
            return null;
          },
        }),
      },
    },
  };
});

// Minimal stub for JournalEntry
jest.mock('../engine/JournalEntry', () => ({
  JournalEntry: class {
    plot_id = '';
    state = 0;
    date = 0;
    time = 0;
    load() {}
  },
}));

// -------------------------------------------------------------------------
// Subject under test (loaded AFTER mocks)
// -------------------------------------------------------------------------
import { JournalManager } from '../managers/JournalManager';
import { JournalEntry } from '../engine/JournalEntry';

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------
function resetManager() {
  JournalManager.Entries = [];
  mockTimeManager.pauseDay = 0;
  mockTimeManager.pauseTime = 0;
}

// -------------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------------
describe('JournalManager.AddJournalQuestEntry', () => {

  beforeEach(() => resetManager());

  it('returns false and does not add an entry for an unknown plot ID', () => {
    const result = JournalManager.AddJournalQuestEntry('unknown_plot', 10);
    expect(result).toBe(false);
    expect(JournalManager.Entries.length).toBe(0);
  });

  it('creates a new entry for a known plot ID and pushes it to Entries', () => {
    const result = JournalManager.AddJournalQuestEntry('tat_escape_kreia', 10);
    expect(result).toBe(true);
    expect(JournalManager.Entries.length).toBe(1);
    expect(JournalManager.Entries[0].plot_id).toBe('tat_escape_kreia');
    expect(JournalManager.Entries[0].state).toBe(10);
  });

  it('creates a second entry without colliding with the first', () => {
    JournalManager.AddJournalQuestEntry('tat_escape_kreia', 10);
    JournalManager.AddJournalQuestEntry('tat_gain_clue', 5);
    expect(JournalManager.Entries.length).toBe(2);
  });

  it('updates an existing entry to a higher state', () => {
    JournalManager.AddJournalQuestEntry('tat_escape_kreia', 10);
    JournalManager.AddJournalQuestEntry('tat_escape_kreia', 20);
    expect(JournalManager.Entries.length).toBe(1);
    expect(JournalManager.Entries[0].state).toBe(20);
  });

  it('does NOT update state to a lower value when allowOverrideHigher is false', () => {
    JournalManager.AddJournalQuestEntry('tat_escape_kreia', 20);
    JournalManager.AddJournalQuestEntry('tat_escape_kreia', 5, false);
    expect(JournalManager.Entries[0].state).toBe(20);
  });

  it('overrides state to a lower value when allowOverrideHigher is true', () => {
    JournalManager.AddJournalQuestEntry('tat_escape_kreia', 20);
    JournalManager.AddJournalQuestEntry('tat_escape_kreia', 5, true);
    expect(JournalManager.Entries[0].state).toBe(5);
  });

});

// ---------------------------------------------------------------------------
// K1 critical-path blocker: journal timestamp stamping (pauseDay / pauseTime)
// ---------------------------------------------------------------------------
// Story impact: Taris Escape, Dantooine missions, Leviathan, Star Forge
// sequences all call AddJournalQuestEntry at key story beats. If entries
// always carry date=0 / time=0 the save file cannot distinguish which quests
// were acquired first, breaking any time-ordered UI display and violating the
// original save-game format expected by the engine loader.
// ---------------------------------------------------------------------------
describe('JournalManager – timestamp stamping (K1 critical-path blocker fix)', () => {

  beforeEach(() => resetManager());

  it('stamps new entry date/time from module timeManager', () => {
    mockTimeManager.pauseDay = 7;
    mockTimeManager.pauseTime = 432000; // milliseconds elapsed in the day
    JournalManager.AddJournalQuestEntry('tar_escape', 1);
    expect(JournalManager.Entries[0].date).toBe(7);
    expect(JournalManager.Entries[0].time).toBe(432000);
  });

  it('stamps day=0, time=0 when module is not yet loaded (no module reference)', () => {
    mockGameState.module = undefined;
    JournalManager.AddJournalQuestEntry('tar_escape', 1);
    expect(JournalManager.Entries[0].date).toBe(0);
    expect(JournalManager.Entries[0].time).toBe(0);
    // Restore
    mockGameState.module = { timeManager: mockTimeManager };
  });

  it('stamps day=0, time=0 when timeManager is absent', () => {
    mockGameState.module = {};
    JournalManager.AddJournalQuestEntry('tar_escape', 1);
    expect(JournalManager.Entries[0].date).toBe(0);
    expect(JournalManager.Entries[0].time).toBe(0);
    // Restore
    mockGameState.module = { timeManager: mockTimeManager };
  });

  it('two quests acquired at different times carry distinct timestamps', () => {
    mockTimeManager.pauseDay = 2;
    mockTimeManager.pauseTime = 100000;
    JournalManager.AddJournalQuestEntry('tar_escape', 1);

    mockTimeManager.pauseDay = 3;
    mockTimeManager.pauseTime = 200000;
    JournalManager.AddJournalQuestEntry('dan_jedi_ritual', 1);

    expect(JournalManager.Entries[0].date).toBe(2);
    expect(JournalManager.Entries[0].time).toBe(100000);
    expect(JournalManager.Entries[1].date).toBe(3);
    expect(JournalManager.Entries[1].time).toBe(200000);
  });

  it('updating an existing entry does NOT re-stamp the date/time', () => {
    mockTimeManager.pauseDay = 1;
    mockTimeManager.pauseTime = 50000;
    JournalManager.AddJournalQuestEntry('tar_escape', 5);

    // Advance time then try to update the same quest to a higher state
    mockTimeManager.pauseDay = 10;
    mockTimeManager.pauseTime = 999999;
    JournalManager.AddJournalQuestEntry('tar_escape', 10);

    // The entry's date/time should still reflect the original acquisition time
    expect(JournalManager.Entries[0].date).toBe(1);
    expect(JournalManager.Entries[0].time).toBe(50000);
    expect(JournalManager.Entries[0].state).toBe(10);
  });

});
