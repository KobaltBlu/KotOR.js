import {
  countOccurrencesInBuffer,
  countOccurrencesInText,
  getWordAtIndex,
} from '@/apps/forge/helpers/ReferenceFinderCore';

describe('ReferenceFinder', () => {
  test('countOccurrencesInBuffer counts non-overlapping matches', () => {
    const buf = new TextEncoder().encode('ababab');
    const needle = new TextEncoder().encode('ab');
    expect(countOccurrencesInBuffer(buf, needle)).toBe(3);
  });

  test('countOccurrencesInBuffer returns 0 when needle missing', () => {
    const buf = new TextEncoder().encode('hello');
    const needle = new TextEncoder().encode('z');
    expect(countOccurrencesInBuffer(buf, needle)).toBe(0);
  });

  test('countOccurrencesInText supports case-insensitive matches', () => {
    expect(countOccurrencesInText('Tar03 tar03 TAR03', 'tar03', false)).toBe(3);
  });

  test('countOccurrencesInText respects case-sensitive matches', () => {
    expect(countOccurrencesInText('Tar03 tar03 TAR03', 'tar03', true)).toBe(1);
  });

  test('getWordAtIndex returns the identifier around the cursor', () => {
    expect(getWordAtIndex('void main() { k_ai_master(); }', 18)).toBe('k_ai_master');
  });

  test('getWordAtIndex returns empty string for out-of-range indices', () => {
    expect(getWordAtIndex('abc', -1)).toBe('');
    expect(getWordAtIndex('abc', 99)).toBe('');
  });
});
