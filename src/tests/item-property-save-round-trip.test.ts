import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Every label `ItemProperty.save()` writes has to be a label
 * `initProperties()` reads back, or the field is silently lost on load.
 *
 * Two were not. The writer emitted 'SubType' and 'Usable' where the reader --
 * and the retail data -- use 'Subtype' and 'Useable'. Items loaded from a
 * module were therefore fine and items loaded from a save were not: subType
 * came back undefined, `subTypeDef.rows[undefined]` missed, and a Peragus save
 * load emitted `Invalid Item Property Sub Type: undefined` 36 times. `useable`
 * was lost the same way, without announcing itself at all.
 *
 * This reads the source rather than round-tripping a real property because
 * ItemProperty's constructor reaches GameState.SWRuleSet, TwoDAManager and
 * TLKManager -- the whole engine graph. The defect is a mismatched string
 * literal, and a mismatched string literal is what this detects.
 *
 * Written generically on purpose: it guards the class of bug, not the two
 * instances that were found.
 */
const SOURCE = 'src/engine/ItemProperty.ts';

/**
 * The retail spelling of each property-struct field, from the item blueprints
 * shipped in the install rather than from memory. Verified by dumping the
 * PropertiesList field labels out of 101PER's own .uti resources.
 */
const RETAIL_LABELS = [
  'PropertyName',
  'Subtype',
  'CostTable',
  'CostValue',
  'Param1',
  'Param1Value',
  'ChanceAppear',
  'UsesPerDay',
  'Useable',
  'UpgradeType',
];

function section(contents: string, start: RegExp): string {
  const from = contents.search(start);
  expect(from).toBeGreaterThan(-1);
  const rest = contents.slice(from);
  // Each method ends at the first line that closes it at method indentation.
  const end = rest.search(/\n  \}/);
  return end === -1 ? rest : rest.slice(0, end);
}

const contents = fs.readFileSync(path.join(process.cwd(), SOURCE), 'utf8');
const reader = section(contents, /\n  initProperties\(\)\s*\{/);
const writer = section(contents, /\n  save\(\)\s*\{/);

function labelsIn(source: string, pattern: RegExp): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(pattern)) found.add(match[1]);
  return [...found];
}

const written = labelsIn(writer, /new GFFField\(\s*GFFDataType\.\w+\s*,\s*'([^']+)'/g);
const read = labelsIn(reader, /hasField\('([^']+)'\)/g);

describe('item property fields survive a save round trip', () => {
  test('the writer emits something', () => {
    expect(written.length).toBeGreaterThan(0);
  });

  for (const label of RETAIL_LABELS) {
    test(`${label} is written with its retail spelling`, () => {
      expect(written).toContain(label);
    });

    test(`${label} is read back`, () => {
      expect(read).toContain(label);
    });
  }

  test('every written label is one the reader looks for', () => {
    expect(written.filter((label) => !read.includes(label))).toEqual([]);
  });
});

describe('a missing definition is not fabricated', () => {
  test('From2DA is not called on a row the lookup missed', () => {
    // The miss was logged and then used anyway. From2DA's `row: any = {}`
    // default turns undefined into a subtype with id -1 and an empty label,
    // which downstream cannot tell from a real one.
    expect(contents).toMatch(/if\(!row\)\{[\s\S]*?\}else\{[\s\S]*?From2DA\(row\)/);
  });

  test('the cost table lookup does not dereference a miss', () => {
    // `!lookup && costTable > -1` guarded the error but let `!lookup` with
    // costTable <= -1 fall into the else, which read .name off undefined.
    const constructor = section(contents, /\n  constructor\(/);
    expect(constructor).not.toMatch(/if\(!this\.costTableLookupDefinition && this\.costTable > -1\)/);
    expect(constructor).toMatch(/if\(!this\.costTableLookupDefinition\)\{/);
  });
});
