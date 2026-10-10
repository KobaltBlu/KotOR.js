/**
 * Force Jump wiring smoke tests.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

describe('Force Jump port wiring', () => {
  it('GameEffectFactory FromType constructs ForceJump and Delayed', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'effects', 'GameEffectFactory.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /case GameEffectType\.EffectForceJump:[\s\S]*?effect = new EffectForceJump\(\)/
    );
    expect(src).toMatch(
      /case GameEffectType\.EffectForceJumpDelayed:[\s\S]*?effect = new EffectForceJumpDelayed\(\)/
    );
  });

  it('GameEffectType includes 0x66 and 0x67', () => {
    const src = fs.readFileSync(
      srcPath('core', 'enums', 'effects', 'GameEffectType.ts'),
      'utf8'
    );
    expect(src).toMatch(/EffectForceJump = 0x66/);
    expect(src).toMatch(/EffectForceJumpDelayed = 0x67/);
  });

  it('K1 and K2 opcode 153 have action functions', () => {
    const k1 = fs.readFileSync(srcPath('engine', 'nwscript', 'NWScriptDefK1.ts'), 'utf8');
    const k2 = fs.readFileSync(srcPath('engine', 'nwscript', 'NWScriptDefK2.ts'), 'utf8');
    expect(k1).toMatch(
      /name: "EffectForceJump"[\s\S]*?action: function/
    );
    expect(k2).toMatch(
      /153:[\s\S]*?name: 'EffectForceJump'[\s\S]*?action: function[\s\S]*?EffectForceJump\(\)/
    );
  });

  it('SetStateInternal FORCEJUMP sets ambient PRONE_FORCE_JUMP', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'effects', 'EffectSetStateInternal.ts'),
      'utf8'
    );
    expect(src).toMatch(/GameEffectSetStateType\.FORCEJUMP/);
    expect(src).toMatch(/PRONE_FORCE_JUMP/);
  });
});
