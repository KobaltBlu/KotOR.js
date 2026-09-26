import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * A GIT's StoreList struct names the store's blueprint `ResRef`. Every other
 * object type in a GIT names it `TemplateResRef`, and `ModuleStore.load()` mixed
 * the two: it guarded on `getResRef()` — the field a GIT store actually carries —
 * and then looked the UTM up with `getTemplateResRef()`, which a GIT store never
 * carries. `loadCachedResource` was therefore always handed null.
 *
 * The failure was total and silent. No store in the game loaded its blueprint,
 * so inventory, markUp/markDown, onOpenStore and locName all kept their
 * constructor defaults, and every merchant was empty. Loading every TSL module
 * reported "Failed to load ModuleStore template" in exactly the 12 of 82 modules
 * that contain a store, and in no module that does not — a 12/12 correlation is
 * what took this from a plausible reading of the source to a settled one.
 *
 * `ForgeStore` is the other half of the evidence: the project's own GIT reader
 * and writer moves this field through `ResRef` in both directions, which is what
 * settles which of the two names is the authored one.
 */
const SOURCE_ROOT = path.join(__dirname, '..');

function read(relative: string): string {
  return fs.readFileSync(path.join(SOURCE_ROOT, relative), 'utf8');
}

function loadBody(source: string): string {
  const start = source.indexOf('  load(){');
  expect(start).toBeGreaterThan(-1);
  // Far enough to cover load() and no further than initProperties().
  const end = source.indexOf('  initProperties(){', start);
  return source.slice(start, end > -1 ? end : start + 4000);
}

describe('ModuleStore blueprint resolution', () => {
  test('looks the UTM up by the field a GIT store actually carries', () => {
    const body = loadBody(read('module/ModuleStore.ts'));
    expect(body).toContain("loadCachedResource(ResourceTypes['utm'], blueprint)");
    // The precise regression: guarding on one accessor and reading another.
    expect(body).not.toContain("ResourceTypes['utm'], this.getTemplateResRef()");
  });

  test('guards on the same value it looks up', () => {
    const body = loadBody(read('module/ModuleStore.ts'));
    expect(body).toContain('const blueprint = this.getResRef();');
    expect(body).toContain('if(blueprint){');
  });

  test('keeps the blueprint reference so save() can round-trip it', () => {
    const source = read('module/ModuleStore.ts');
    // save() writes `templateResRef`, which nothing else on a GIT-loaded store
    // ever populates — without this the blueprint is lost from the savegame too.
    expect(loadBody(source)).toContain('this.templateResRef = blueprint;');
    expect(source).toContain(
      "addField( new GFFField(GFFDataType.RESREF, 'TemplateResRef') ).setValue(this.templateResRef || '')",
    );
  });

  test('ForgeStore still reads and writes the same struct through ResRef', () => {
    // If this ever changes, the premise above is wrong and the fix needs revisiting.
    const forge = read('apps/forge/module-editor/ForgeStore.ts');
    expect(forge).toContain("root.hasField('ResRef')");
    expect(forge).toContain("this.templateResRef = root.getFieldByLabel('ResRef').getValue() || '';");
  });
});
