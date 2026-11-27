/**
 * @jest-environment node
 *
 * GameState.scene has matrixWorldAutoUpdate disabled, so anything placed in
 * the world scene must commit its transform or it stays at the origin and is
 * frustum-culled. The hover/selection reticles and floating text sprites move
 * every time they are placed, so they must commit.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

const read = (...p: string[]) => fs.readFileSync(srcPath(...p), 'utf8');

describe('world-scene sprites commit their transforms', () => {
  it('commits both reticles after placing them', () => {
    const src = read('engine', 'managers', 'CursorManager.ts');
    expect(src).toMatch(/applyReticleScale\(CursorManager\.reticle, [\s\S]*?commitWorldTransform\(CursorManager\.reticle\)/);
    expect(src).toMatch(/applyReticleScale\(CursorManager\.reticle2, [\s\S]*?commitWorldTransform\(CursorManager\.reticle2\)/);
  });

  it('commits text sprites when attached and when their mesh is built', () => {
    expect(read('engine', 'module', 'Area.ts')).toMatch(/effects\.add\(sprite\.container\);\s*commitWorldTransform\(sprite\.container\)/);
    expect(read('engine', 'render', 'TextSprite3D.ts')).toMatch(/this\.buildText\(\);[\s\S]{0,200}commitWorldTransform\(this\.container\)/);
  });
});
