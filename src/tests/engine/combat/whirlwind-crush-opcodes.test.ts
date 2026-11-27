/**
 * Whirlwind / Crush / Wave wiring smoke tests (avoids importing GameState / NWScriptDef*).
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

describe('Whirlwind / Crush / Wave port wiring', () => {
  it('K2 opcode 703 EffectWhirlWind builds SetState int 10', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'nwscript', 'NWScriptDefK2.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /703:[\s\S]*?name: 'EffectWhirlWind'[\s\S]*?action: function[\s\S]*?setInt\(0,\s*10\)/
    );
    expect(src).not.toMatch(
      /name: 'EffectWhirlWind',\s*type: NWScriptDataType\.EFFECT,\s*args: \[\],\s*action: undefined/
    );
  });

  it('K2 opcode 781 EffectCrush builds SetState int 15', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'nwscript', 'NWScriptDefK2.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /781:[\s\S]*?name: 'EffectCrush'[\s\S]*?action: function[\s\S]*?setInt\(0,\s*15\)/
    );
  });

  it('K1 EffectWhirlWind remains wired', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'nwscript', 'NWScriptDefK1.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /name: "EffectWhirlWind"[\s\S]*?action: function[\s\S]*?setInt\(0,\s*10\)/
    );
  });

  it('SetState enums include CRUSH=15 and ambient CRUSH=16', () => {
    const setState = fs.readFileSync(
      srcPath('core', 'enums', 'effects', 'GameEffectSetStateType.ts'),
      'utf8'
    );
    const ambient = fs.readFileSync(
      srcPath('core', 'enums', 'module', 'ModuleCreatureAmbientState.ts'),
      'utf8'
    );
    expect(setState).toMatch(/CRUSH\s*=\s*15/);
    expect(ambient).toMatch(/CRUSH\s*=\s*16/);
  });

  it('SetStateInternal sets WW/Crush ambient and applies -3 AI mask', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'effects', 'EffectSetStateInternal.ts'),
      'utf8'
    );
    expect(src).toMatch(/ambientForSetState/);
    expect(src).toMatch(/aiStateMaskForSetState/);
  });

  it('OnRemove OnUserDefined includes CRUSH', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'effects', 'EffectSetStateInternal.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /state >= GameEffectSetStateType\.KNOCKDOWN && state <= GameEffectSetStateType\.DROID_SCRAMBLE/
    );
  });

  it('animForSetState maps CRUSH to CHOKE', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'effects', 'set-state.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /GameEffectSetStateType\.CRUSH:[\s\S]*?ModuleCreatureAnimState\.CHOKE/
    );
  });

  it('debilitated anim switch has case 15 Crush', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'module', 'animation', 'resolveDebilitatedCreatureAnimation.ts'),
      'utf8'
    );
    expect(src).toMatch(/case 15:[\s\S]*?Crush/);
  });

  it('Creature isCrushed and isDebilitated include Crush', () => {
    const facade = fs.readFileSync(
      srcPath('engine', 'module', 'Creature.ts'),
      'utf8'
    );
    expect(facade).toMatch(/isCrushed\(\)[\s\S]*?hasSetState\(15\)/);

    const combat = fs.readFileSync(
      srcPath('engine', 'module', 'creature', 'CreatureCombatService.ts'),
      'utf8'
    );
    expect(combat).toMatch(/isDebilitated\(\)[\s\S]*?isCrushed\(\)/);
  });

  it('Force Wave has no dedicated effect; K2 Force Push opcodes remain wired', () => {
    const k2 = fs.readFileSync(
      srcPath('engine', 'nwscript', 'NWScriptDefK2.ts'),
      'utf8'
    );
    expect(k2).not.toMatch(/EffectForceWave/);
    expect(k2).toMatch(
      /269:[\s\S]*?name: 'EffectForcePushTargeted'[\s\S]*?action: function/
    );
    expect(k2).toMatch(
      /392:[\s\S]*?name: 'EffectForcePushed'[\s\S]*?action: function/
    );
  });
});
