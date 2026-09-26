import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Every module object save path dropped `TemplateResRef`.
 *
 * In TSL's 001EBO, 25 placeables, all 11 doors and 3 creatures came back with no
 * templateResRef after a save, while the module itself loaded correctly.
 *
 * Loading 001EBO cold gives all 57 objects a templateResRef. Reaching it after a
 * save, by transitioning out of the saved module, gives 0 of 57, and
 * the template struct they hold reports `no-field`: the field is not empty, it
 * is absent. The engine loads a visited module's GIT from the saved `.sav`
 * rather than the pristine RIM (`Module.GetModuleArchives`), and `save()` never
 * wrote the field, on any of the eight object types. So the blueprint reference
 * survived only until the first save of that module.
 *
 * Pinned at source level because these
 * classes import GameState, which pulls a module chain Jest cannot parse. This
 * asserts the write is present, not that a round trip restores it — proving that
 * needs a game install.
 */
const SAVE_PATHS = [
  'ModulePlaceable', 'ModuleDoor', 'ModuleCreature', 'ModuleTrigger',
  'ModuleWaypoint', 'ModuleSound', 'ModuleStore', 'ModuleEncounter',
];

const stripComments = (source: string): string => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');

const saveBody = (name: string): string => {
  const source = stripComments(
    fs.readFileSync(path.join(__dirname, '..', 'module', `${name}.ts`), 'utf8'));
  const start = source.search(/\n\s*save\s*\(\s*\)\s*\{/);
  expect(start).toBeGreaterThan(-1);
  // The method body, by brace matching, so the check cannot borrow text from
  // whatever method follows.
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unbalanced braces in ${name}.save()`);
};

describe('module object saves preserve the blueprint reference', () => {

  test.each(SAVE_PATHS)('%s.save() writes TemplateResRef', (name) => {
    const body = saveBody(name);
    expect(body).toMatch(/GFFDataType\.RESREF, 'TemplateResRef'\s*\)\s*\)\.setValue\(/);
  });

  test.each(SAVE_PATHS)('%s.save() writes it from the object, not a literal', (name) => {
    const body = saveBody(name);
    const write = body.match(
      /GFFDataType\.RESREF, 'TemplateResRef'\s*\)\s*\)\.setValue\(([^;]*)\);/);
    expect(write).not.toBeNull();
    // An empty-string default is fine for an object that never had one; a save
    // that hard-codes '' for everything would satisfy the test above while
    // preserving nothing.
    expect(write![1]).toContain('this.templateResRef');
  });

});
