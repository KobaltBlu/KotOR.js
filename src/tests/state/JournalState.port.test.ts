import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/GameState', () => ({ GameState: {} }));
jest.mock('@/loaders', () => ({ ResourceLoader: {} }));
jest.mock('@/utility/GameFileSystem', () => ({ GameFileSystem: {} }));
jest.mock('@/managers/TwoDAManager', () => ({ TwoDAManager: { datatables: new Map() } }));
jest.mock('@/managers/TLKManager', () => ({ TLKManager: { GetStringById: (): undefined => undefined } }));

import { JournalManager } from '@/managers/JournalManager';
import { JournalEntry } from '@/engine/JournalEntry';
import { JournalCategory } from '@/engine/JournalCategory';
import { JournalCategoryEntry } from '@/engine/JournalCategoryEntry';
import { GameState } from '@/GameState';
import { TwoDAManager } from '@/managers/TwoDAManager';

const state = GameState as any;

beforeEach(() => {
  const category = new JournalCategory();
  category.tag = 'synthetic_quest';
  category.priority = 3;
  category.planet_id = 2;
  category.entries = [1, 2, 3].map((id) => {
    const entry = new JournalCategoryEntry();
    entry.id = id;
    entry.end = id === 3 ? 1 : 0;
    entry.xp_percentage = 0.25;
    return entry;
  });
  JournalManager.Categories = [category];
  JournalManager.ClearEntries();
  JournalManager.SortOrder = 0;
  state.JournalManager = JournalManager;
  state.PartyManager = { GiveXP: jest.fn() };
  state.UINotificationManager = { EnableUINotificationIconType: jest.fn() };
  state.FeedbackMessageManager = {
    Entries: [],
    AddEntry(entry: any) { this.Entries.push(entry); },
  };
  TwoDAManager.datatables.set('plot', { rows: { 0: { label: 'synthetic_quest', xp: '100' } } } as any);
});

describe('journal-state port', () => {
  test('inserts a new quest and treats repeated same-state calls idempotently', () => {
    expect(JournalManager.AddJournalQuestEntry(' SYNTHETIC_QUEST\0padding ', 1)).toBe(true);
    expect(JournalManager.Entries).toHaveLength(1);
    expect(JournalManager.GetJournalEntryState('synthetic_quest')).toBe(1);
    expect(JournalManager.AddJournalQuestEntry('synthetic_quest', 1)).toBe(true);
    expect(JournalManager.Entries).toHaveLength(1);
    expect(state.PartyManager.GiveXP).toHaveBeenCalledTimes(1);
    expect(state.PartyManager.GiveXP).toHaveBeenCalledWith(25);
  });

  test('preserves higher state unless override is explicitly allowed', () => {
    JournalManager.AddJournalQuestEntry('synthetic_quest', 2);
    const received = JournalManager.Entries[0].getReceivedSortValue();
    expect(JournalManager.AddJournalQuestEntry('synthetic_quest', 1)).toBe(false);
    expect(JournalManager.GetJournalEntryState('synthetic_quest')).toBe(2);
    expect(JournalManager.AddJournalQuestEntry('synthetic_quest', 1, true)).toBe(true);
    expect(JournalManager.GetJournalEntryState('synthetic_quest')).toBe(1);
    expect(JournalManager.Entries[0].getReceivedSortValue()).toBeGreaterThan(received);
  });

  test('round-trips completed entries through their GFF structure', () => {
    JournalManager.AddJournalQuestEntry('synthetic_quest', 3);
    const entry = JournalManager.Entries[0];
    const restored = JournalEntry.FromStruct(entry.toStruct());
    expect(restored.plot_id).toBe('synthetic_quest');
    expect(restored.state).toBe(3);
    expect(restored.isCompleted()).toBe(true);
    expect(restored.getPriority()).toBe(3);
    expect(restored.getPlanetId()).toBe(2);
    expect(restored.getReceivedSortValue()).toBe(entry.getReceivedSortValue());
    JournalManager.AddEntry(restored);
    expect(JournalManager.Entries).toEqual([restored]);
  });

  test('world entries replace by index and deletion leaves ordinary feedback intact', () => {
    const ordinary = { type: 3, message: 'ordinary combat feedback' };
    state.FeedbackMessageManager.Entries.push(ordinary);
    JournalManager.AddJournalWorldEntry(4, 'Title', 'First');
    JournalManager.AddJournalWorldEntry(4, 'Title', 'Replacement');
    expect(state.FeedbackMessageManager.Entries).toHaveLength(2);
    expect(state.FeedbackMessageManager.Entries[1].message).toBe('Title: Replacement');
    expect(JournalManager.DeleteJournalWorldAllEntries()).toBe(true);
    expect(state.FeedbackMessageManager.Entries).toEqual([ordinary]);
  });
});
