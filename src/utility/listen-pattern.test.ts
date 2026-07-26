/**
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import { testStringAgainstPattern } from '@/utility/listen-pattern';

describe('testStringAgainstPattern (Aurora listen patterns)', () => {
  test('** matches any string and captures it', () => {
    const r = testStringAgainstPattern('**', 'hello world');
    expect(r.matched).toBe(true);
    expect(r.substrings[0]).toBe('hello world');
  });

  test('**TOKEN** matches tags containing TOKEN', () => {
    expect(testStringAgainstPattern('**TOKEN**', 'TOKEN').matched).toBe(true);
    expect(testStringAgainstPattern('**TOKEN**', 'THETOKENIZER').matched).toBe(true);
    expect(testStringAgainstPattern('**TOKEN**', 'nope').matched).toBe(false);
  });

  test('FOO** on foobar yields foo + bar substrings', () => {
    const r = testStringAgainstPattern('FOO**', 'foobar');
    expect(r.matched).toBe(true);
    expect(r.substrings.map((s) => s.toLowerCase())).toEqual(['foo', 'bar']);
  });

  test('case insensitive', () => {
    expect(testStringAgainstPattern('**funk**', 'The FUNK Band').matched).toBe(true);
  });

  test('(bash|open)**(chest|door)** style alternation', () => {
    expect(
      testStringAgainstPattern('**(bash|open|unlock)**(chest|door)**', 'open the door please').matched
    ).toBe(true);
    expect(
      testStringAgainstPattern('**(bash|open|unlock)**(chest|door)**', 'he just bashed that chest!').matched
    ).toBe(true);
    expect(
      testStringAgainstPattern('**(bash|open|unlock)**(chest|door)**', 'walk away').matched
    ).toBe(false);
  });

  test('*n / *a / *w typed wildcards', () => {
    expect(testStringAgainstPattern('*n', '42').matched).toBe(true);
    expect(testStringAgainstPattern('*n', 'ab').matched).toBe(false);
    expect(testStringAgainstPattern('*a', 'Hello').matched).toBe(true);
    expect(testStringAgainstPattern('hello*wworld', 'hello   world').matched).toBe(true);
  });
});
