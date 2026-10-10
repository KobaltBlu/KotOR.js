/**
 * Force Push wiring smoke tests (avoids importing GameState / NWScriptDef*).
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

describe('Force Push port wiring', () => {
  it('GameEffectFactory FromType constructs EffectForcePushed', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'effects', 'GameEffectFactory.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /case GameEffectType\.EffectForcePushed:[\s\S]*?effect = new EffectForcePushed\(\)/
    );
  });

  it('K2 opcodes 269 and 392 have action functions', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'nwscript', 'NWScriptDefK2.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /269:[\s\S]*?name: 'EffectForcePushTargeted'[\s\S]*?action: function/
    );
    expect(src).toMatch(
      /392:[\s\S]*?name: 'EffectForcePushed'[\s\S]*?action: function/
    );
    expect(src).not.toMatch(
      /name: 'EffectForcePushed',\s*type: NWScriptDataType\.EFFECT,\s*args: \[\],\s*action: undefined/
    );
  });

  it('K1 opcodes remain wired', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'nwscript', 'NWScriptDefK1.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /name: "EffectForcePushTargeted"[\s\S]*?action: function/
    );
    expect(src).toMatch(
      /name: "EffectForcePushed"[\s\S]*?action: function/
    );
  });

  it('SetStateInternal FORCEPUSH sets ambient PRONE_FORCE_PUSHED', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'effects', 'EffectSetStateInternal.ts'),
      'utf8'
    );
    expect(src).toMatch(/PRONE_FORCE_PUSHED/);
    expect(src).toMatch(/applyForcePushAIActivityMask/);
    expect(src).toMatch(/stampForcePushAttackSummary/);
  });

  it('EffectForcePushed forces TEMPORARY SetState duration type', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'effects', 'EffectForcePushed.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /setDurationType\(GameEffectDurationType\.TEMPORARY\)/
    );
  });

  it('outer EffectSetState applies SETAISTATE -0x101 activity mask', () => {
    const setState = fs.readFileSync(
      srcPath('engine', 'effects', 'EffectSetState.ts'),
      'utf8'
    );
    const helpers = fs.readFileSync(
      srcPath('engine', 'effects', 'set-state.ts'),
      'utf8'
    );
    expect(helpers).toMatch(/SET_STATE_OUTER_AI_ACTIVITY_MASK = 0xfeff/);
    expect(setState).toMatch(/SET_STATE_OUTER_AI_ACTIVITY_MASK/);
  });

  it('setFacingVector writes xOrientation/yOrientation, not props', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'module', 'Creature.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /setFacingVector\([\s\S]*?this\.xOrientation\s*=\s*facing\.x[\s\S]*?this\.yOrientation\s*=\s*facing\.y/
    );
    expect(src).not.toMatch(/this\.props\['XOrientation'\]/);
    expect(src).not.toMatch(/this\.props\['YOrientation'\]/);
  });

  it('player cam control is gated while force-pushed', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'module', 'Creature.ts'),
      'utf8'
    );
    expect(src).toMatch(/forcePushLocked/);
    expect(src).toMatch(/!forcePushLocked/);
  });

  it('anim selection uses getActiveSetStateType / ambient PRONE_FORCE_PUSHED', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'module', 'Creature.ts'),
      'utf8'
    );
    expect(src).toMatch(/getActiveSetStateType/);
    expect(src).toMatch(/PRONE_FORCE_PUSHED/);
  });
});
