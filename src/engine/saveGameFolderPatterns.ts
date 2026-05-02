/**
 * PC save-folder naming: numeric prefix, separator, then QUICKSAVE / AUTOSAVE / GameN.
 * Centralized so validators stay testable without loading the full SaveGame stack.
 */

export const SAVEGAME_FOLDER_REGEX_VALIDATOR = /^(\d+) - (Game\d+)$|^(000000) - (QUICKSAVE)$|^(000001) - (AUTOSAVE)$/;

export const SAVEGAME_FOLDER_NAME_REGEX = /^(\d+) - (QUICKSAVE|AUTOSAVE|Game\d+)$/;
