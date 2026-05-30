import { describe, expect, it } from '@jest/globals';
import { DLGNodeType } from '@/enums/dialog/DLGNodeType';

// DLGNode and DLGObject are used only as type annotations in DLGValidation
// (TypeScript elides the imports), but we mock them defensively to prevent
// transitive pulls into GameState/THREE in case of ts-jest resolution.
jest.mock('@/resource/DLGNode', () => ({ DLGNode: class DLGNode {} }));
jest.mock('@/resource/DLGObject', () => ({ DLGObject: class DLGObject {} }));

import { DLGValidation, ValidationSeverity } from '@/apps/forge/utils/DLGValidation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(
  opts: {
    text?: string;
    speakerTag?: string;
    vo_resref?: string;
    sound?: string;
    replies?: any[];
    index?: number;
    script?: any;
    script2?: any;
    isActive?: any;
    isActive2?: any;
  } = {}
): any {
  return {
    nodeType: DLGNodeType.ENTRY,
    text: opts.text ?? 'Greetings',
    speakerTag: opts.speakerTag ?? 'NPC',
    vo_resref: opts.vo_resref ?? '',
    sound: opts.sound ?? '',
    replies: opts.replies ?? [],
    entries: [],
    index: opts.index ?? 0,
    script: opts.script,
    script2: opts.script2,
    isActive: opts.isActive,
    isActive2: opts.isActive2,
  };
}

function makeReply(
  opts: {
    text?: string;
    entries?: any[];
    index?: number;
    script?: any;
    isActive?: any;
  } = {}
): any {
  return {
    nodeType: DLGNodeType.REPLY,
    text: opts.text ?? 'Player response',
    speakerTag: '',
    vo_resref: '',
    sound: '',
    entries: opts.entries ?? [],
    replies: [],
    index: opts.index ?? 0,
    script: opts.script,
    script2: undefined,
    isActive: opts.isActive,
    isActive2: undefined,
  };
}

function makeStarting(entries: any[]): any {
  return {
    nodeType: DLGNodeType.STARTING,
    text: '',
    speakerTag: '',
    vo_resref: '',
    sound: '',
    entries,
    replies: [],
    index: 0,
    script: undefined,
    script2: undefined,
    isActive: undefined,
    isActive2: undefined,
  };
}

function makeDlg(
  opts: {
    startingList?: any[];
    entryList?: any[];
    replyList?: any[];
    vo_id?: string;
    scripts?: any;
  } = {}
): any {
  return {
    startingList: opts.startingList ?? [],
    entryList: opts.entryList ?? [],
    replyList: opts.replyList ?? [],
    vo_id: opts.vo_id ?? '',
    scripts: opts.scripts ?? {
      onEndConversation: undefined,
      onEndConversationAbort: undefined,
    },
  };
}

/** Build a minimal fully-linked, valid dialog for positive-path tests. */
function buildValidDlg() {
  const entry = makeEntry({ index: 0, text: 'Hello', speakerTag: 'NPC' });
  const reply = makeReply({ index: 0, text: 'Goodbye', entries: [] });
  // Mark reply as end node via text
  reply.text = 'farewell';
  entry.replies = [reply];
  const starting = makeStarting([entry]);
  return makeDlg({
    startingList: [starting],
    entryList: [entry],
    replyList: [reply],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DLGValidation', () => {
  describe('starting nodes', () => {
    it('reports NO_STARTING_NODES error when startingList is empty', () => {
      const v = new DLGValidation(makeDlg());
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'NO_STARTING_NODES')).toBe(true);
      expect(issues.find((i) => i.code === 'NO_STARTING_NODES')!.severity).toBe(ValidationSeverity.Error);
    });

    it('reports STARTING_NO_ENTRIES error when a starting node has no entries', () => {
      const empty = makeStarting([]); // no entries
      const v = new DLGValidation(makeDlg({ startingList: [empty] }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'STARTING_NO_ENTRIES')).toBe(true);
    });

    it('does not report STARTING_NO_ENTRIES when the starting node has entries', () => {
      const entry = makeEntry({ index: 0 });
      const starting = makeStarting([entry]);
      entry.replies = [makeReply({ entries: [] })];
      entry.replies[0].text = 'farewell';
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry] }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'STARTING_NO_ENTRIES')).toBe(false);
    });
  });

  describe('entry node validation', () => {
    it('reports EMPTY_TEXT warning for an entry with no text', () => {
      const entry = makeEntry({ text: '', index: 0 });
      entry.replies = [makeReply({ entries: [] })];
      entry.replies[0].text = 'farewell';
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry] }));
      const issues = v.validate();

      const emptyTextIssue = issues.filter((i) => i.code === 'EMPTY_TEXT' && i.nodeType === DLGNodeType.ENTRY);
      expect(emptyTextIssue.length).toBeGreaterThan(0);
      expect(emptyTextIssue[0].severity).toBe(ValidationSeverity.Warning);
    });

    it('reports NO_SPEAKER warning for an entry with no speakerTag', () => {
      const entry = makeEntry({ speakerTag: '', index: 0 });
      entry.replies = [makeReply({ entries: [] })];
      entry.replies[0].text = 'farewell';
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry] }));
      const issues = v.validate();

      const noSpeaker = issues.filter((i) => i.code === 'NO_SPEAKER');
      expect(noSpeaker.length).toBeGreaterThan(0);
    });

    it('reports NO_VO info when entry has text and dlg.vo_id is set but vo_resref is empty', () => {
      const entry = makeEntry({ text: 'Hello', speakerTag: 'NPC', vo_resref: '', index: 0 });
      entry.replies = [makeReply({ entries: [] })];
      entry.replies[0].text = 'farewell';
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry], vo_id: 'tar03' }));
      const issues = v.validate();

      const noVO = issues.filter((i) => i.code === 'NO_VO');
      expect(noVO.length).toBeGreaterThan(0);
      expect(noVO[0].severity).toBe(ValidationSeverity.Info);
    });

    it('does NOT report NO_VO when dlg.vo_id is empty', () => {
      const entry = makeEntry({ text: 'Hello', speakerTag: 'NPC', vo_resref: '', index: 0 });
      entry.replies = [makeReply({ entries: [] })];
      entry.replies[0].text = 'farewell';
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry], vo_id: '' }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'NO_VO')).toBe(false);
    });

    it('reports NO_REPLIES warning for an entry with no replies not marked as end', () => {
      const entry = makeEntry({ text: 'Hello', speakerTag: 'NPC', index: 0 });
      // No replies and text is not 'farewell'/'goodbye'/'[end]' → not an end node
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry] }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'NO_REPLIES')).toBe(true);
    });

    it('does NOT report NO_REPLIES for an entry whose text marks it as an end node', () => {
      const entry = makeEntry({ text: 'farewell', speakerTag: 'NPC', index: 0 });
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry] }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'NO_REPLIES')).toBe(false);
    });
  });

  describe('reply node validation', () => {
    it('reports EMPTY_TEXT warning for a reply with no text', () => {
      const reply = makeReply({ text: '', index: 0, entries: [] });
      reply.text = ''; // explicitly empty
      const entry = makeEntry({ index: 0, replies: [reply] });
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry], replyList: [reply] }));
      const issues = v.validate();

      const emptyReply = issues.filter((i) => i.code === 'EMPTY_TEXT' && i.nodeType === DLGNodeType.REPLY);
      expect(emptyReply.length).toBeGreaterThan(0);
    });

    it('reports NO_ENTRIES warning for a reply with no entries not marked as end', () => {
      const reply = makeReply({ text: 'OK', index: 0, entries: [] });
      const entry = makeEntry({ index: 0, replies: [reply] });
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry], replyList: [reply] }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'NO_ENTRIES')).toBe(true);
    });
  });

  describe('orphan detection', () => {
    it('reports ORPHAN_NODE warning for entries not referenced from any starting or reply path', () => {
      const entry0 = makeEntry({ index: 0, text: 'Hello', replies: [makeReply({ entries: [] })] });
      entry0.replies[0].text = 'farewell';
      const orphanEntry = makeEntry({ index: 1, text: 'Orphan line' }); // never linked
      const starting = makeStarting([entry0]);

      const v = new DLGValidation(
        makeDlg({
          startingList: [starting],
          entryList: [entry0, orphanEntry],
          replyList: [entry0.replies[0]],
        })
      );
      const issues = v.validate();

      const orphanIssues = issues.filter((i) => i.code === 'ORPHAN_NODE' && i.nodeType === DLGNodeType.ENTRY);
      expect(orphanIssues.length).toBeGreaterThan(0);
      expect(orphanIssues[0].nodeIndex).toBe(1);
    });

    it('reports ORPHAN_NODE warning for replies not referenced from any entry', () => {
      const orphanReply = makeReply({ index: 0, text: 'Unreachable' });
      const entry0 = makeEntry({ index: 0, text: 'Hello', replies: [] }); // no link to orphanReply
      entry0.text = 'farewell'; // mark as end so we don't get NO_REPLIES
      const starting = makeStarting([entry0]);

      const v = new DLGValidation(
        makeDlg({
          startingList: [starting],
          entryList: [entry0],
          replyList: [orphanReply],
        })
      );
      const issues = v.validate();

      const orphanReplies = issues.filter((i) => i.code === 'ORPHAN_NODE' && i.nodeType === DLGNodeType.REPLY);
      expect(orphanReplies.length).toBeGreaterThan(0);
    });

    it('does NOT flag referenced nodes as orphans', () => {
      const v = new DLGValidation(buildValidDlg());
      const issues = v.validate();

      const orphans = issues.filter((i) => i.code === 'ORPHAN_NODE');
      expect(orphans).toHaveLength(0);
    });
  });

  describe('script name validation', () => {
    it('reports INVALID_SCRIPT_NAME warning for script names with disallowed characters', () => {
      const badScript = { name: 'invalid script!' };
      const entry = makeEntry({ index: 0, script: badScript });
      entry.replies = [makeReply({ entries: [] })];
      entry.replies[0].text = 'farewell';
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry] }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'INVALID_SCRIPT_NAME')).toBe(true);
    });

    it('does NOT report INVALID_SCRIPT_NAME for valid script names', () => {
      const goodScript = { name: 'k_dlg_myaction01' };
      const entry = makeEntry({ index: 0, script: goodScript });
      entry.replies = [makeReply({ entries: [] })];
      entry.replies[0].text = 'farewell';
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry] }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'INVALID_SCRIPT_NAME')).toBe(false);
    });

    it('validates dialog-level end conversation script name', () => {
      const dlg = buildValidDlg();
      dlg.scripts = {
        onEndConversation: { name: 'bad name!' },
        onEndConversationAbort: undefined,
      };
      const issues = new DLGValidation(dlg).validate();

      expect(issues.some((i) => i.code === 'INVALID_SCRIPT_NAME')).toBe(true);
    });
  });

  describe('audio reference validation', () => {
    it('reports INVALID_VO_FORMAT for VO resrefs with spaces or special characters', () => {
      const entry = makeEntry({ vo_resref: 'bad vo name!', index: 0 });
      entry.replies = [makeReply({ entries: [] })];
      entry.replies[0].text = 'farewell';
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry] }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'INVALID_VO_FORMAT')).toBe(true);
    });

    it('does NOT report INVALID_VO_FORMAT for valid alphanumeric VO resrefs', () => {
      const entry = makeEntry({ vo_resref: 'tar03_00001', index: 0 });
      entry.replies = [makeReply({ entries: [] })];
      entry.replies[0].text = 'farewell';
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry] }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'INVALID_VO_FORMAT')).toBe(false);
    });

    it('reports INVALID_SOUND_FORMAT for sound names with illegal characters', () => {
      const entry = makeEntry({ sound: 'bad sound!', index: 0 });
      entry.replies = [makeReply({ entries: [] })];
      entry.replies[0].text = 'farewell';
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry] }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'INVALID_SOUND_FORMAT')).toBe(true);
    });
  });

  describe('circular reference detection', () => {
    it('reports CIRCULAR_REFERENCE error for a direct entry→reply→entry loop', () => {
      // entry0 (index=0, ENTRY) → reply0 (REPLY) → entry0 (back to entry0)
      const entry0 = makeEntry({ index: 0, text: 'Hi' });
      const reply0 = makeReply({ index: 0, entries: [entry0] });
      entry0.replies = [reply0];

      const starting = makeStarting([entry0]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry0], replyList: [reply0] }));
      const issues = v.validate();

      expect(issues.some((i) => i.code === 'CIRCULAR_REFERENCE')).toBe(true);
    });
  });

  describe('isValid and severity helpers', () => {
    it('isValid returns false when there are Error-severity issues', () => {
      const v = new DLGValidation(makeDlg()); // empty → NO_STARTING_NODES error
      v.validate();
      expect(v.isValid()).toBe(false);
    });

    it('isValid returns true for a fully valid dialog', () => {
      const v = new DLGValidation(buildValidDlg());
      v.validate();
      expect(v.isValid()).toBe(true);
    });

    it('getIssuesBySeverity correctly partitions issues', () => {
      const entry = makeEntry({ text: '', speakerTag: '', index: 0 }); // two warnings
      entry.text = 'farewell'; // no text warning after this, but no speaker tag
      // Actually keep empty text to generate warning:
      entry.text = '';
      const starting = makeStarting([entry]);
      const v = new DLGValidation(makeDlg({ startingList: [starting], entryList: [entry] }));
      v.validate();

      const errors = v.getIssuesBySeverity(ValidationSeverity.Error);
      const warnings = v.getIssuesBySeverity(ValidationSeverity.Warning);

      // starting node has entries, so no STARTING_NO_ENTRIES; entry has no text, no speaker
      errors.forEach((i) => expect(i.severity).toBe(ValidationSeverity.Error));
      warnings.forEach((i) => expect(i.severity).toBe(ValidationSeverity.Warning));
    });

    it('getIssueCount returns correct counts', () => {
      const v = new DLGValidation(makeDlg()); // only NO_STARTING_NODES error
      v.validate();

      const counts = v.getIssueCount();
      expect(counts.errors).toBeGreaterThanOrEqual(1);
      expect(typeof counts.warnings).toBe('number');
      expect(typeof counts.info).toBe('number');
    });
  });

  describe('autoFix', () => {
    it('removes orphan entry nodes and returns the fix count', () => {
      const entry0 = makeEntry({ index: 0, text: 'Hi', replies: [] });
      entry0.text = 'farewell'; // end node, no replies needed
      const orphanEntry = makeEntry({ index: 1, text: 'Orphan' });
      const starting = makeStarting([entry0]);
      const dlg = makeDlg({
        startingList: [starting],
        entryList: [entry0, orphanEntry],
      });

      const v = new DLGValidation(dlg);
      v.validate();
      const fixed = v.autoFix();

      expect(fixed).toBeGreaterThan(0);
      expect(dlg.entryList).toHaveLength(1);
    });

    it('returns 0 and re-validates if nothing is auto-fixable', () => {
      const v = new DLGValidation(makeDlg()); // only NO_STARTING_NODES — not autoFix
      v.validate();
      const fixed = v.autoFix();

      expect(fixed).toBe(0);
    });
  });
});
