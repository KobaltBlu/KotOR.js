import { InMemoryDirectoryHandle } from '../tests/helpers/InMemoryFileSystemAccess';

jest.mock('../GameState', () => {
  const inventory: any[] = [];
  const clearInventory = jest.fn(() => {
    inventory.length = 0;
  });
  const addItem = jest.fn((item: any) => {
    inventory.push(item);
  });

  return {
    GameState: {
      InventoryManager: {
        inventory,
        ClearInventory: clearInventory,
        addItem,
      },
    },
  };
});

jest.mock('../KotOR', () => ({ ResourceTypes: {} }));
jest.mock('../loaders', () => ({}));
jest.mock('../three/odyssey/OdysseyTexture', () => ({}));
jest.mock('./CurrentGame', () => ({
  CurrentGame: {
    gameinprogress_dir: 'gameinprogress',
  },
}));
jest.mock('../resource/ERFObject', () => ({}));
jest.mock('../utility/Utility', () => ({}));

import { SaveGame } from './SaveGame';
import { GFFObject } from '../resource/GFFObject';
import { GFFDataType } from '../enums/resource/GFFDataType';
import { GFFField } from '../resource/GFFField';
import { GFFStruct } from '../resource/GFFStruct';
import { ApplicationProfile } from '../utility/ApplicationProfile';
import { ApplicationEnvironment } from '../enums/ApplicationEnvironment';
import { GameFileSystem } from '../utility/GameFileSystem';
import { GameState } from '../GameState';

describe('SaveGame.loadInventory idempotency', () => {
  let rootHandle: InMemoryDirectoryHandle;

  const mockedInventoryManager = (GameState as any).InventoryManager as {
    inventory: any[];
    ClearInventory: jest.Mock;
    addItem: jest.Mock;
  };

  beforeEach(async () => {
    rootHandle = new InMemoryDirectoryHandle('root');
    ApplicationProfile.ENV = ApplicationEnvironment.BROWSER;
    (ApplicationProfile as any).directoryHandle = rootHandle;
    GameFileSystem.clearDirectoryCache();

    mockedInventoryManager.inventory.length = 0;
    mockedInventoryManager.ClearInventory.mockClear();
    mockedInventoryManager.addItem.mockClear();

    await GameFileSystem.mkdir('gameinprogress', { recursive: true });

    const inventoryGff = new GFFObject();
    inventoryGff.FileType = 'INV ';
    const itemList = inventoryGff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ItemList'));
    itemList.addChildStruct(new GFFStruct());
    await inventoryGff.export('gameinprogress/INVENTORY.res');
  });

  afterEach(() => {
    ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
    (ApplicationProfile as any).directoryHandle = undefined;
    GameFileSystem.clearDirectoryCache();
  });

  it('clears inventory before each inventory.res replay', async () => {
    const saveGame = Object.create(SaveGame.prototype) as SaveGame;

    await saveGame.loadInventory();
    expect(mockedInventoryManager.inventory.length).toBe(1);

    await saveGame.loadInventory();
    expect(mockedInventoryManager.inventory.length).toBe(1);
    expect(mockedInventoryManager.ClearInventory).toHaveBeenCalledTimes(2);
    expect(mockedInventoryManager.addItem).toHaveBeenCalledTimes(2);
  });
});

