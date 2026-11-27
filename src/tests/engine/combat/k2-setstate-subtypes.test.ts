/**
 * K2 SetState subtypes 0x0E / 0x10–0x13 wiring smoke tests.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import { srcPath } from '@/tests/helpers/paths';

describe('K2 SetState subtypes 0x0E / 0x10–0x13', () => {
  it('enums define KNOCKDOWN/DROID_CONFUSED/HELD/MIND_TRICK/DROID_SCRAMBLE', () => {
    const setState = fs.readFileSync(
      srcPath('core', 'enums', 'effects', 'GameEffectSetStateType.ts'),
      'utf8'
    );
    const ambient = fs.readFileSync(
      srcPath('core', 'enums', 'module', 'ModuleCreatureAmbientState.ts'),
      'utf8'
    );
    expect(setState).toMatch(/KNOCKDOWN\s*=\s*14/);
    expect(setState).toMatch(/DROID_CONFUSED\s*=\s*16/);
    expect(setState).toMatch(/HELD\s*=\s*17/);
    expect(setState).toMatch(/MIND_TRICK\s*=\s*18/);
    expect(setState).toMatch(/DROID_SCRAMBLE\s*=\s*19/);
    expect(ambient).toMatch(/KNOCKDOWN\s*=\s*15/);
  });

  it('K2 opcodes 809/848/852 build SetState 16/18/19', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'nwscript', 'NWScriptDefK2.ts'),
      'utf8'
    );
    expect(src).toMatch(
      /809:[\s\S]*?name: 'EffectDroidConfused'[\s\S]*?setInt\(0,\s*16\)/
    );
    expect(src).toMatch(
      /848:[\s\S]*?name: 'EffectMindTrick'[\s\S]*?setInt\(0,\s*18\)/
    );
    expect(src).toMatch(
      /852:[\s\S]*?name: 'EffectDroidScramble'[\s\S]*?setInt\(0,\s*19\)/
    );
  });

  it('EffectKnockdown applies companion SetState KNOCKDOWN', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'effects', 'EffectKnockdown.ts'),
      'utf8'
    );
    expect(src).toMatch(/GameEffectSetStateType\.KNOCKDOWN/);
    expect(src).toMatch(/EffectSetState/);
  });

  it('SetStateInternal handles MindTrick/Scramble stun VFX and knockdown ambient', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'effects', 'EffectSetStateInternal.ts'),
      'utf8'
    );
    expect(src).toMatch(/MIND_TRICK/);
    expect(src).toMatch(/DROID_SCRAMBLE/);
    expect(src).toMatch(/KNOCKDOWN/);
    expect(src).toMatch(/ambientForSetState/);
    expect(src).toMatch(/VFX_STUN/);
    expect(src).toMatch(/DROID_SCRAMBLE[\s\S]*?DROID_SCRAMBLE|firesOnUserDefined/);
  });

  it('immunities cover knockdown / droid confused / mind trick', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'effects', 'set-state.ts'),
      'utf8'
    );
    expect(src).toMatch(/IMMUNITY_KNOCKDOWN/);
    expect(src).toMatch(/IMMUNITY_DROID_CONFUSED/);
    expect(src).toMatch(/IMMUNITY_MIND/);
    expect(src).toMatch(/GameEffectSetStateType\.MIND_TRICK/);
    expect(src).toMatch(/GameEffectSetStateType\.DROID_CONFUSED/);
  });

  it('Creature helpers and isDebilitated exclude DroidConfused', () => {
    const facade = fs.readFileSync(
      srcPath('engine', 'module', 'Creature.ts'),
      'utf8'
    );
    expect(facade).toMatch(/isDroidConfused\(\)[\s\S]*?hasSetState\(16\)/);
    expect(facade).toMatch(/isMindTricked\(\)[\s\S]*?hasSetState\(18\)/);
    expect(facade).toMatch(/isDroidScrambled\(\)[\s\S]*?hasSetState\(19\)/);
    expect(facade).toMatch(/isHeld\(\)[\s\S]*?hasSetState\(17\)/);

    const combat = fs.readFileSync(
      srcPath('engine', 'module', 'creature', 'CreatureCombatService.ts'),
      'utf8'
    );
    const debil = combat.match(/isDebilitated\(\)\{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(debil).toMatch(/isMindTricked/);
    expect(debil).toMatch(/isDroidScrambled/);
    expect(debil).toMatch(/isHeld/);
    expect(debil).not.toMatch(/isDroidConfused/);
  });

  it('debilitated anim switch covers cases 14–19', () => {
    const src = fs.readFileSync(
      srcPath('engine', 'module', 'animation', 'resolveDebilitatedCreatureAnimation.ts'),
      'utf8'
    );
    expect(src).toMatch(/case 14:/);
    expect(src).toMatch(/case 16:/);
    expect(src).toMatch(/case 17:/);
    expect(src).toMatch(/case 18:/);
    expect(src).toMatch(/case 19:/);
  });
});
