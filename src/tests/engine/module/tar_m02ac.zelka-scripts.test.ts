/**
 * tar_m02ac Zelka script branch markers (alertzelk vs zelkarm1x).
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const moduleScripts = path.join(
  process.cwd(),
  'exports/k1/module/tar_m02ac/scripts',
);

function readAsm(name: string): string {
  return fs.readFileSync(path.join(moduleScripts, `${name}.ncs.asm`), 'utf8');
}

describe('tar_m02ac Zelka lab-door script branches', () => {
  test('k_ptar_alertzelk InitConversation sets Tar_ZelkaRm=1 and JumpToObject when companion leads', () => {
    const asm = readAsm('k_ptar_alertzelk');
    expect(asm).toContain('CONSTS "Tar_ZelkaRm"');
    expect(asm).toContain('CONSTS "Zelka021"');
    // JumpToObject = Action_0181
    expect(asm).toContain('ACTION Action_0181(0181), 02');
    // SetPartyLeader = Action_000D with NPC_PLAYER (-1)
    expect(asm).toContain('CONSTI FFFFFFFF');
    expect(asm).toContain('ACTION Action_000D(000D), 01');
    // ResumeConversation path for Zelka opener
    expect(asm).toContain('ACTION Action_00CE(00CE), 00');
  });

  test('k_ptar_zelkarm1x sets Tar_ZelkaRm=2 before ForceMove/OpenDoor (secret-door cutscene)', () => {
    const asm = readAsm('k_ptar_zelkarm1x');
    expect(asm).toContain('CONSTS "tar02_labdoor"');
    expect(asm).toContain('CONSTS "Tar_ZelkaRm"');
    // SetGlobalNumber(Tar_ZelkaRm, 2) before pause/move/open
    expect(asm).toMatch(/CONSTI 00000002[\s\S]{0,80}CONSTS "Tar_ZelkaRm"[\s\S]{0,40}ACTION Action_0245/);
    expect(asm).toContain('ACTION Action_00CD(00CD), 00'); // ActionPauseConversation
    expect(asm).toContain('ACTION Action_017F(017F), 04'); // ActionForceMoveToObject
    expect(asm).toContain('ACTION Action_002B(002B), 01'); // ActionOpenDoor
    // No JumpToObject in the secret-door script
    expect(asm).not.toContain('ACTION Action_0181');
  });

  test('k_ptar_zelkarm1 condition is Tar_ZelkaRm == 1 (lab-alert StartingList)', () => {
    const asm = readAsm('k_ptar_zelkarm1');
    expect(asm).toContain('CONSTS "Tar_ZelkaRm"');
    expect(asm).toContain('ACTION Action_0244(0244), 01');
    expect(asm).toContain('CONSTI 00000001');
    expect(asm).toContain('EQUAL');
    // GetGlobalNumber then compare to 1
    const getIdx = asm.indexOf('ACTION Action_0244(0244), 01');
    const eqIdx = asm.indexOf('EQUAL', getIdx);
    expect(eqIdx).toBeGreaterThan(getIdx);
    expect(asm.slice(getIdx, eqIdx)).toContain('CONSTI 00000001');
  });

  test('tar02_labdoor OnOpen is bound to k_ptar_alertzelk', () => {
    const utd = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'exports/k1/module/tar_m02ac/doors/tar02_labdoor.utd.json'),
        'utf8',
      ),
    );
    expect(utd.OnOpen.value).toBe('k_ptar_alertzelk');
  });
});
