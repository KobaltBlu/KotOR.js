import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * NotBlastable is a static template flag, and every static flag a save writes
 * back has to be written back, or a load quietly substitutes the class default.
 *
 * It was loaded from the template and never exported. Plot and Min1HP were
 * both, which is what made the omission invisible: doors came back from a save
 * correctly Plot-flagged and incorrectly blastable. In Peragus that turned
 * every "Emergency Blast Door" (NotBlastable=1) into a blastable one.
 *
 * This reads the source rather than exercising the exporter because
 * ModuleDoor/ModulePlaceable pull in the whole engine graph; the failure being
 * guarded against is a missing line, and a missing line is what this detects.
 */
const SOURCES = [
  'src/module/ModuleDoor.ts',
  'src/module/ModulePlaceable.ts',
];

/** Flags that must survive a save round trip, with the field name in the GFF. */
const ROUND_TRIP_FLAGS = ['Plot', 'Min1HP', 'NotBlastable'];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('static object flags survive a save round trip', () => {
  for (const source of SOURCES) {
    describe(source, () => {
      const contents = read(source);

      for (const flag of ROUND_TRIP_FLAGS) {
        test(`${flag} is read from the template`, () => {
          expect(contents).toContain(`hasField('${flag}')`);
        });

        test(`${flag} is written back by toStruct`, () => {
          expect(contents).toMatch(
            new RegExp(`gff\\.RootNode\\.addField\\([^)]*'${flag}'\\s*\\)\\s*\\)\\.setValue\\(`),
          );
        });

        test(`${flag} is present on the blank template`, () => {
          expect(contents).toMatch(
            new RegExp(`template\\.RootNode\\.addField\\([^)]*'${flag}'`),
          );
        });
      }
    });
  }
});
