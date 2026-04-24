import {
  ModalReferenceSearchOptionsState,
  ReferenceSearchOptionsStateValues,
} from '@/apps/forge/states/modal/ModalReferenceSearchOptionsState';

const DEFAULT_TYPES = new Set(['UTC', 'UTD']);

describe('ModalReferenceSearchOptionsState', () => {
  test('initializes with defaults', () => {
    const modal = new ModalReferenceSearchOptionsState();

    expect(modal.getPartialMatch()).toBe(false);
    expect(modal.getCaseSensitive()).toBe(false);
    expect(modal.getFilePattern()).toBeNull();
  });

  test('partial match toggle', () => {
    const modal = new ModalReferenceSearchOptionsState({
      defaultPartialMatch: true,
    });

    expect(modal.getPartialMatch()).toBe(true);
    modal.setPartialMatch(false);
    expect(modal.getPartialMatch()).toBe(false);
    modal.setPartialMatch(true);
    expect(modal.getPartialMatch()).toBe(true);
  });

  test('case sensitive toggle', () => {
    const modal = new ModalReferenceSearchOptionsState({
      defaultCaseSensitive: true,
    });

    expect(modal.getCaseSensitive()).toBe(true);
    modal.setCaseSensitive(false);
    expect(modal.getCaseSensitive()).toBe(false);
    modal.setCaseSensitive(true);
    expect(modal.getCaseSensitive()).toBe(true);
  });

  test('file pattern updates', () => {
    const modal = new ModalReferenceSearchOptionsState({
      defaultFilePattern: '*.mod',
    });

    expect(modal.getFilePattern()).toBe('*.mod');
    modal.setFilePattern('*.rim');
    expect(modal.getFilePattern()).toBe('*.rim');
    modal.setFilePattern('');
    expect(modal.getFilePattern()).toBeNull();
  });

  test('file type selection', () => {
    const modal = new ModalReferenceSearchOptionsState({
      defaultFileTypes: DEFAULT_TYPES,
    });

    const selected = modal.getFileTypes();
    expect(selected).toBeInstanceOf(Set);
    expect(selected?.has('UTC')).toBe(true);
    expect(selected?.has('UTD')).toBe(true);

    modal.toggleFileType('UTC');
    const afterToggle = modal.getFileTypes();
    expect(afterToggle?.has('UTC')).toBe(false);

    modal.setFileTypes(new Set(modal.fileTypeOptions));
    expect(modal.getFileTypes()).toBeNull();

    modal.setFileTypes(new Set());
    const empty = modal.getFileTypes();
    expect(empty).toBeInstanceOf(Set);
    expect(empty?.size).toBe(0);
  });

  test('apply passes options', () => {
    let applied: ReferenceSearchOptionsStateValues | null = null;
    const modal = new ModalReferenceSearchOptionsState({
      defaultPartialMatch: true,
      defaultCaseSensitive: true,
      defaultFilePattern: '*.rim',
      defaultFileTypes: new Set(['UTC']),
      onApply: (options) => {
        applied = options;
      },
    });

    modal.apply();
    expect(applied).toBeDefined();
    expect(applied?.partialMatch).toBe(true);
    expect(applied?.caseSensitive).toBe(true);
    expect(applied?.filePattern).toBe('*.rim');
    expect(applied?.fileTypes?.has('UTC')).toBe(true);
  });
});
