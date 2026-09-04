/**
 * @jest-environment node
 *
 * Retail CSWSExpression semantics (ParseString / TestString).
 */
import { describe, expect, test } from '@jest/globals';
import { parsePattern, testStringAgainstPattern } from '@/utility/listen-pattern';

describe('parsePattern', () => {
  test('rejects invalid escapes and unbalanced groups', () => {
    expect(parsePattern('*x')).toBeNull();
    expect(parsePattern('*')).toBeNull();
    expect(parsePattern('(')).toBeNull();
    expect(parsePattern(')')).toBeNull();
    expect(parsePattern('|foo')).toBeNull();
  });

  test('accepts valid wildcards', () => {
    expect(parsePattern('**')).not.toBeNull();
    expect(parsePattern('*w')).not.toBeNull();
    expect(parsePattern('*n')).not.toBeNull();
    expect(parsePattern('*a')).not.toBeNull();
    expect(parsePattern('*p')).not.toBeNull();
  });
});

describe('testStringAgainstPattern (Odyssey CSWSExpression)', () => {
  test('** matches any string and captures it', () => {
    const r = testStringAgainstPattern('**', 'hello world');
    expect(r.matched).toBe(true);
    expect(r.substrings).toEqual(['hello world']);
  });

  test('**TOKEN** matches tags containing TOKEN', () => {
    expect(testStringAgainstPattern('**TOKEN**', 'TOKEN').matched).toBe(true);
    expect(testStringAgainstPattern('**TOKEN**', 'THETOKENIZER').matched).toBe(true);
    expect(testStringAgainstPattern('**TOKEN**', 'nope').matched).toBe(false);
  });

  test('FOO** on foobar yields foo + bar node captures', () => {
    const r = testStringAgainstPattern('FOO**', 'foobar');
    expect(r.matched).toBe(true);
    expect(r.substrings.map((s) => s.toLowerCase())).toEqual(['foo', 'bar']);
  });

  test('preserves original case in captures', () => {
    const r = testStringAgainstPattern('FOO**', 'FooBar');
    expect(r.matched).toBe(true);
    expect(r.substrings).toEqual(['Foo', 'Bar']);
  });

  test('case insensitive matching', () => {
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

  test('*n matches one-or-more digits via backtrack re-entry', () => {
    expect(testStringAgainstPattern('*n', '4').matched).toBe(true);
    expect(testStringAgainstPattern('*n', '42').matched).toBe(true);
    expect(testStringAgainstPattern('*n', 'ab').matched).toBe(false);
    expect(testStringAgainstPattern('*n', '4a').matched).toBe(false);
  });

  test('*a matches letters', () => {
    expect(testStringAgainstPattern('*a', 'Hello').matched).toBe(true);
    expect(testStringAgainstPattern('*a', '42').matched).toBe(false);
  });

  test('*w matches one-or-more spaces (not other whitespace)', () => {
    expect(testStringAgainstPattern('hello*wworld', 'hello world').matched).toBe(true);
    expect(testStringAgainstPattern('hello*wworld', 'hello   world').matched).toBe(true);
    expect(testStringAgainstPattern('hello*wworld', 'helloworld').matched).toBe(false);
    expect(testStringAgainstPattern('hello*wworld', 'hello\tworld').matched).toBe(false);
  });

  test('*p matches only . ? !', () => {
    expect(testStringAgainstPattern('hi*p', 'hi!').matched).toBe(true);
    expect(testStringAgainstPattern('hi*p', 'hi.').matched).toBe(true);
    expect(testStringAgainstPattern('hi*p', 'hi?').matched).toBe(true);
    expect(testStringAgainstPattern('hi*p', 'hi,').matched).toBe(false);
  });

  test('invalid pattern never matches', () => {
    expect(testStringAgainstPattern('*x', 'x').matched).toBe(false);
    expect(testStringAgainstPattern('*', 'a').matched).toBe(false);
  });

  test('full-input anchoring: leftover characters fail', () => {
    expect(testStringAgainstPattern('foo', 'foobar').matched).toBe(false);
    expect(testStringAgainstPattern('foo', 'foo').matched).toBe(true);
  });
});
