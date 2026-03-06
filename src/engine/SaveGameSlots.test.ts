jest.mock('../GameState', () => ({
  GameState: {
    module: {},
    MenuManager: {
      LoadScreen: {
        open: jest.fn(),
        showSavingMessage: jest.fn(),
        setProgress: jest.fn(),
        close: jest.fn(),
      },
    },
    PartyManager: {
      Export: jest.fn(),
      party: [],
    },
    GetScreenShot: jest.fn(),
    time: 0,
  },
}));
jest.mock('../KotOR', () => ({ ResourceTypes: { utc: 0 } }));
jest.mock('../loaders', () => ({}));
jest.mock('../three/odyssey/OdysseyTexture', () => ({}));
jest.mock('./CurrentGame', () => ({}));
jest.mock('../resource/ERFObject', () => ({}));
jest.mock('../utility/Utility', () => ({}));

import { SaveGame } from './SaveGame';
import { GameFileSystem } from '../utility/GameFileSystem';

describe('SaveGame slot semantics', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses slot ids starting at 2 for manual saves', async () => {
    SaveGame.NEXT_SAVE_ID = 99;
    jest.spyOn(GameFileSystem, 'readdir').mockResolvedValue([] as any);

    await SaveGame.GetSaveGames();

    expect(SaveGame.NEXT_SAVE_ID).toBe(2);
  });

  it('preserves reserved slot baseline when save scan fails', async () => {
    SaveGame.NEXT_SAVE_ID = 77;
    SaveGame.saves = [new SaveGame('000123 - Game122')];

    jest.spyOn(GameFileSystem, 'readdir').mockRejectedValue(new Error('scan failed'));
    jest.spyOn(GameFileSystem, 'mkdir').mockResolvedValue(true as any);

    await SaveGame.GetSaveGames();

    expect(SaveGame.NEXT_SAVE_ID).toBe(2);
    expect(SaveGame.saves).toEqual([]);
  });

  it('routes replace_id=1 SaveCurrentGame to AutoSave', async () => {
    const autoSaveSpy = jest.spyOn(SaveGame, 'AutoSave').mockResolvedValue();

    await SaveGame.SaveCurrentGame('ignored', 1);

    expect(autoSaveSpy).toHaveBeenCalledTimes(1);
  });
});

