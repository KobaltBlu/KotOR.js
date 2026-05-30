import { describe, expect, it } from '@jest/globals';
import { SAVEGAME_FOLDER_NAME_REGEX, SAVEGAME_FOLDER_REGEX_VALIDATOR } from '@/engine/saveGameFolderPatterns';

describe('saveGameFolderPatterns', () => {
  it('SAVEGAME_FOLDER_NAME_REGEX accepts QUICKSAVE, AUTOSAVE, and numbered Game slots', () => {
    expect(SAVEGAME_FOLDER_NAME_REGEX.test('000000 - QUICKSAVE')).toBe(true);
    expect(SAVEGAME_FOLDER_NAME_REGEX.test('000001 - AUTOSAVE')).toBe(true);
    expect(SAVEGAME_FOLDER_NAME_REGEX.test('000002 - Game1')).toBe(true);
    expect(SAVEGAME_FOLDER_NAME_REGEX.test('bad name')).toBe(false);
  });

  it('SAVEGAME_FOLDER_REGEX_VALIDATOR matches legacy alternate patterns', () => {
    expect(SAVEGAME_FOLDER_REGEX_VALIDATOR.test('000001 - AUTOSAVE')).toBe(true);
    expect(SAVEGAME_FOLDER_REGEX_VALIDATOR.test('000002 - Game2')).toBe(true);
  });
});
