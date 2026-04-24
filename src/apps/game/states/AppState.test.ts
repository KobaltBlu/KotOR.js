/** @jest-environment jsdom */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/apps/game/KotOR', () => ({
  GameEngineType: {
    KOTOR: 1,
    TSL: 2,
  },
  ConfigClient: {
    Init: jest.fn(async () => undefined),
    get: jest.fn(() => undefined),
    set: jest.fn(() => undefined),
  },
  ApplicationProfile: {
    SetProfile: jest.fn(() => undefined),
    InitEnvironment: jest.fn(() => undefined),
    directory: '',
    directoryHandle: undefined as FileSystemDirectoryHandle | undefined,
    ENV: 0,
  },
  GameInitializer: {
    AddEventListener: jest.fn(() => undefined),
    SetLoadingMessage: jest.fn(() => undefined),
    Init: jest.fn(async () => undefined),
  },
  GameState: {
    GameKey: 1,
    setDOMElement: jest.fn(() => undefined),
    Init: jest.fn(async () => undefined),
    stats: { domElement: document.createElement('div') },
    Debugger: { open: jest.fn(() => undefined) },
    CheatConsoleManager: { processCommand: jest.fn(() => undefined) },
  },
  TextureLoader: {
    GameKey: 1,
  },
  GUIListBox: {
    InitTextures: jest.fn(() => undefined),
  },
  OdysseyWalkMesh: {
    Init: jest.fn(() => undefined),
  },
  AudioEngine: {
    OnWindowFocusChange: jest.fn(() => undefined),
  },
  SaveGame: {
    saves: [] as Array<{ load: () => void }>,
  },
  GameFileSystem: {
    exists: jest.fn(async () => false),
  },
}));

import * as KotOR from '@/apps/game/KotOR';
import { AppState } from '@/apps/game/states/AppState';
import { ApplicationEnvironment } from '@/enums/ApplicationEnvironment';

class MockDirectoryHandle {
  kind = 'directory';
  name = 'root';
}

describe('AppState browser directory-handle flow', () => {
  beforeEach(() => {
    AppState.appProfile = {
      key: 'kotor',
      background: '',
      logo: '',
    };
    AppState.env = ApplicationEnvironment.BROWSER;
    (KotOR.ApplicationProfile as any).directoryHandle = undefined;
  });

  test('attachDirectoryHandle stores handle in appProfile and global profile', async () => {
    const handle = new MockDirectoryHandle() as unknown as FileSystemDirectoryHandle;
    const loadSpy = jest.spyOn(AppState, 'loadGameDirectory').mockImplementation(async () => undefined);

    await AppState.attachDirectoryHandle(handle);

    expect((KotOR.ApplicationProfile as any).directoryHandle).toBe(handle);
    expect(AppState.appProfile.directory_handle).toBe(handle);
    expect((KotOR.ConfigClient as any).set).toHaveBeenCalledWith('Profiles.kotor.directory_handle', handle);
    expect(loadSpy).toHaveBeenCalled();

    loadSpy.mockRestore();
  });

  test('beginGame does not overwrite an existing browser directoryHandle with undefined profile value', async () => {
    const existingHandle = new MockDirectoryHandle() as unknown as FileSystemDirectoryHandle;
    (KotOR.ApplicationProfile as any).directoryHandle = existingHandle;
    AppState.appProfile = {
      key: 'kotor',
      background: '',
      logo: '',
      directory_handle: undefined,
    };

    document.body.innerHTML = '<div id="renderer-container"></div>';

    await AppState.beginGame();

    expect((KotOR.ApplicationProfile as any).directoryHandle).toBe(existingHandle);
    expect((KotOR.GameInitializer as any).Init).toHaveBeenCalled();
  });
});
