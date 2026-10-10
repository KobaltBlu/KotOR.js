/**
 * Hydration lifecycle coverage that does not require a bootstrapped GameState.
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, jest } from '@jest/globals';
import { GameObjectInitFinalizer } from '@engine/module/serialization/GameObjectInitFinalizer';

const MODULE_DIR = path.resolve(__dirname, '../../../engine/module');
const SERIALIZATION_DIR = path.join(MODULE_DIR, 'serialization');

describe('GameObject hydration lifecycle', () => {
  it('registers when requested and then marks the object initialized', () => {
    const target = { initialized: false };
    const register = jest.fn(() => expect(target.initialized).toBe(false));

    GameObjectInitFinalizer.finalize(target, { needsRegister: true, register });

    expect(register).toHaveBeenCalledTimes(1);
    expect(target.initialized).toBe(true);
  });

  it('supports idempotent facade registration decisions', () => {
    const target = { initialized: false };
    const register = jest.fn();

    let needsRegister = !target.initialized;
    GameObjectInitFinalizer.finalize(target, { needsRegister, register });
    needsRegister = !target.initialized;
    GameObjectInitFinalizer.finalize(target, { needsRegister, register });

    expect(register).toHaveBeenCalledTimes(1);
  });

  it('keeps Item.loaded at the successful realization boundary', () => {
    const itemSource = fs.readFileSync(path.join(MODULE_DIR, 'Item.ts'), 'utf8');
    expect(itemSource).toMatch(/this\.initProperties\(\);\s*this\.loaded = true;/);
    const serializerSource = fs.readFileSync(
      path.join(SERIALIZATION_DIR, 'ItemSerializer.ts'),
      'utf8',
    );
    expect(serializerSource).not.toMatch(/target\.loaded\s*=/);
  });

  it('serializers never mark targets initialized', () => {
    const violations = fs.readdirSync(SERIALIZATION_DIR)
      .filter((file) => file.endsWith('.ts') && file !== 'GameObjectInitFinalizer.ts')
      .filter((file) => /target\.initialized\s*=\s*true/.test(
        fs.readFileSync(path.join(SERIALIZATION_DIR, file), 'utf8'),
      ));
    expect(violations).toEqual([]);
  });
});
