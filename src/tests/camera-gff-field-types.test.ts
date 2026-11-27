import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { GFFField } from '@/resource/GFFField';
import { GFFDataType } from '@/enums/resource/GFFDataType';

/**
 * `ModuleCamera.save()` wrote three float properties as integer types:
 * FieldOfView as DWORD, Height as BYTE, Pitch as BYTE. None can hold what a
 * camera actually carries — a fractional FOV, a negative height, a negative
 * pitch — and `GFFField.setValue` reports the violation and stores the value
 * anyway, so the bad value reaches serialization and wraps.
 *
 * Loading every TSL module logged it as
 * "Field.setValue BYTE OutOfBounds label='Height' value=-1.5" in 503OND. Every
 * camera in a saved module was affected, so cutscene framing did not survive a
 * save/load.
 *
 * ForgeCamera reads and writes all three as FLOAT in both directions, which is
 * what settles the authored types.
 */
describe('ModuleCamera GFF field types', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'module', 'ModuleCamera.ts'), 'utf8',
  );

  test.each(['FieldOfView', 'Height', 'Pitch', 'MicRange'])('%s is written as FLOAT', (label) => {
    expect(source).toContain(`new GFFField(GFFDataType.FLOAT, '${label}')`);
  });

  test.each(['Height', 'Pitch'])('%s is no longer written as BYTE', (label) => {
    expect(source).not.toContain(`new GFFField(GFFDataType.BYTE, '${label}')`);
  });

  test('FieldOfView is no longer written as DWORD', () => {
    expect(source).not.toContain("new GFFField(GFFDataType.DWORD, 'FieldOfView')");
  });

  test('agrees with the Forge writer, which is the authored shape', () => {
    const forge = fs.readFileSync(
      path.join(__dirname, '..', 'apps', 'forge', 'module-editor', 'ForgeCamera.ts'), 'utf8',
    );
    for (const label of ['FieldOfView', 'Height', 'Pitch']) {
      expect(forge).toContain(`KotOR.GFFDataType.FLOAT, '${label}'`);
    }
  });

  /**
   * The values that were being lost: a FLOAT round-trips them, a BYTE does not.
   */
  test.each([
    ['a camera below eye level', -1.5],
    ['a downward pitch', -22.5],
    ['a fractional field of view', 55.5],
  ])('FLOAT round-trips %s', (_name, value) => {
    const field = new GFFField(GFFDataType.FLOAT, 'Height');
    field.setValue(value);
    expect(field.getValue()).toBeCloseTo(value, 5);
  });
});
