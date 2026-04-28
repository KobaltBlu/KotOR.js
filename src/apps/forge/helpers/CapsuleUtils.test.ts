import { describe, expect, it } from '@jest/globals';

import {
  getModuleRoot,
  isAnyErfTypeFile,
  isCapsuleFile,
  isErfFile,
  isModFile,
  isRimFile,
  isSavFile,
} from '@/apps/forge/helpers/CapsuleUtils';
import {
  isCapsuleFile as isCapsuleFileCompat,
  isErfFile as isErfFileCompat,
  isModFile as isModFileCompat,
  isRimFile as isRimFileCompat,
} from '@/apps/forge/helpers/CapsuleFileUtils';

describe('CapsuleUtils', () => {
  it('recognizes capsule extensions case-insensitively, including savegames', () => {
    expect(isModFile('module.MOD')).toBe(true);
    expect(isErfFile('module.ERF')).toBe(true);
    expect(isSavFile('000001 - quicksave.sav')).toBe(true);
    expect(isRimFile('module.RIM')).toBe(true);
    expect(isAnyErfTypeFile('savegame.SAV')).toBe(true);
    expect(isCapsuleFile('savegame.SAV')).toBe(true);
    expect(isCapsuleFile('notes.txt')).toBe(false);
  });

  it('derives canonical module roots and strips module suffix variants', () => {
    expect(getModuleRoot('m12aa.mod')).toBe('m12aa');
    expect(getModuleRoot('tar_m03aa_s.rim')).toBe('tar_m03aa');
    expect(getModuleRoot('tar_m03aa_dlg.erf')).toBe('tar_m03aa');
    expect(getModuleRoot('  262TEL_s  ')).toBe('262TEL');
    expect(getModuleRoot('')).toBe('');
  });

  it('keeps the CapsuleFileUtils compatibility shim aligned with CapsuleUtils', () => {
    expect(isModFileCompat('test.mod')).toBe(true);
    expect(isErfFileCompat('test.erf')).toBe(true);
    expect(isRimFileCompat('test.rim')).toBe(true);
    expect(isCapsuleFileCompat('test.sav')).toBe(true);
    expect(isCapsuleFileCompat('test.txt')).toBe(false);
  });
});
