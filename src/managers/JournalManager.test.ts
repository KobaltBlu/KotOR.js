/**
 * JournalManager.test.ts
 *
 * Tests for the JournalManager.AddJournalQuestEntry() bugfixes:
 *  1. New entries are pushed to the Entries array.
 *  2. State updates only go higher (unless allowOverrideHigher is true).
 *  3. Returns true when the plot ID exists, false otherwise.
 */

// -------------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------------
jest.mock('../GameState', () => ({
  GameState: {
    UINotificationManager: {
      EnableUINotificationIconType: jest.fn(),
    },
  },
}));

jest.mock('../managers/TwoDAManager', () => {
  const rows: Record<string, any> = {
    0: { __rowlabel: 0, label: 'tat_escape_kreia' },
    1: { __rowlabel: 1, label: 'tat_gain_clue' },
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
