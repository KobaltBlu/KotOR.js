import { describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as ts from 'typescript';

// Compile the actual lifecycle methods, rather than importing the browser/WebGL
// bootstrap graph. The collaborators are fakes; the code under test is unchanged.
function lifecycleHarness() {
  const source = ts.createSourceFile(
    'GameState.ts',
    readFileSync(path.resolve(__dirname, '../../GameState.ts'), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = source.statements.find(
    (node): node is ts.ClassDeclaration => ts.isClassDeclaration(node) && node.name?.text === 'GameState',
  )!;
  const selected = new Set(['LoadModule', 'LoadModuleFromArchives', 'isModuleLoading']);
  const methods = declaration.members.filter((member) => member.name && selected.has(member.name.getText(source)));
  expect(methods).toHaveLength(4);
  const compiled = ts.transpileModule(
    `class GameState { static loadingModule = false; ${methods.map((member) => member.getText(source)).join('\n')} }\nGameState;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText;

  const EventManager = { FireEvent: jest.fn() };
  const TextureLoader = { LoadQueue: jest.fn(async () => undefined) };
  const AudioEngine = { Unmute: jest.fn() };
  const GameState: any = vm.runInNewContext(compiled, {
    EventManager, TextureLoader, AudioEngine,
    EngineMode: { LOADING: 0, INGAME: 1, MINIGAME: 2 },
    THREE: { Color: class { constructor(_value: unknown) {} } },
    console: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const area = {
    sun: { fogColor: 0 },
    miniGame: false,
    initAreaObjects: jest.fn(async (_runSpawnScripts: boolean) => undefined),
    musicBackgroundPlay: jest.fn(),
  };
  const module = {
    area,
    loadScene: jest.fn(async () => undefined),
    initEventQueue: jest.fn(),
    initScripts: jest.fn(async () => undefined),
    readyToProcessEvents: false,
  };
  let queueComplete: (() => void) | undefined;
  let signalQueueStarted!: () => void;
  const queueStarted = new Promise<void>((resolve) => { signalQueueStarted = resolve; });
  Object.assign(GameState, {
    MenuManager: {
      LoadScreen: {
        setLoadBackground: jest.fn(async () => undefined), setProgress: jest.fn(),
        showRandomHint: jest.fn(), open: jest.fn(), close: jest.fn(),
      },
      ClearMenus: jest.fn(), LoadInGameMenus: jest.fn(async () => undefined),
      InGameOverlay: { recalculatePosition: jest.fn(), open: jest.fn() },
    },
    FadeOverlayManager: { FadeOut: jest.fn(), FadeIn: jest.fn() },
    VideoEffectManager: { SetVideoEffect: jest.fn() },
    ModuleObjectManager: { playerSelectableObjects: [] },
    VideoManager: {
      queueMovie: jest.fn(),
      playMovieQueue: jest.fn(async (complete: () => void) => {
        queueComplete = complete;
        signalQueueStarted();
      }),
    },
    SetEngineMode: (mode: number) => { GameState.Mode = mode; },
    UnloadModule: jest.fn(), ResetModuleAudio: jest.fn(),
    NWScript: { Reload: jest.fn() }, controls: { initKeys: jest.fn() },
    FactionManager: { Load: jest.fn(async () => undefined) },
    Module: {
      Load: jest.fn(async () => module),
      LoadFromArchives: jest.fn(async () => module),
    },
    scene: { visible: true },
    renderer: { initTexture: jest.fn(), compile: jest.fn(), setClearColor: jest.fn() },
    PartyManager: { party: [{ canLevelUp: () => true }], PlayerTemplate: {} },
    guiAudioEmitter: { playSoundFireAndForget: jest.fn() },
  });
  return { GameState, EventManager, area, module, queueStarted, completeQueue: () => queueComplete!() };
}

for (const method of ['LoadModule', 'LoadModuleFromArchives']) {
  describe(method, () => {
    test('does not release a load lock owned by an earlier call', async () => {
      const { GameState, EventManager } = lifecycleHarness();
      GameState.loadingModule = true;
      await GameState[method](method === 'LoadModule' ? 'end_m01aa' : []);
      expect(GameState.loadingModule).toBe(true);
      expect(EventManager.FireEvent).not.toHaveBeenCalled();
    });

    test('acquires the lock before synchronous events and releases it on failure', async () => {
      const { GameState, EventManager } = lifecycleHarness();
      EventManager.FireEvent.mockImplementation(() => {
        expect(GameState.loadingModule).toBe(true);
        throw new Error('listener failed');
      });
      await expect(GameState[method](method === 'LoadModule' ? 'end_m01aa' : [])).rejects.toThrow('listener failed');
      expect(GameState.loadingModule).toBe(false);
    });
  });
}

describe('GameState integrated module lifecycle', () => {
  test('both loading names address the same lock', () => {
    const { GameState } = lifecycleHarness();
    GameState.isModuleLoading = true;
    expect(GameState.loadingModule).toBe(true);
    GameState.loadingModule = false;
    expect(GameState.isModuleLoading).toBe(false);
  });

  test('holds the lock through movies and asynchronous spawn initialization', async () => {
    const { GameState, area, module, queueStarted, completeQueue } = lifecycleHarness();
    let finishSpawn!: () => void;
    let signalSpawnStarted!: () => void;
    const spawnStarted = new Promise<void>((resolve) => { signalSpawnStarted = resolve; });
    area.initAreaObjects.mockImplementation(() => new Promise<void>((resolve) => {
      finishSpawn = resolve;
      signalSpawnStarted();
    }));
    const loading = GameState.LoadModule('end_m01aa');
    await queueStarted;
    expect(GameState.loadingModule).toBe(true);
    expect(area.initAreaObjects).not.toHaveBeenCalled();
    completeQueue();
    await spawnStarted;
    expect(GameState.loadingModule).toBe(true);
    finishSpawn();
    await loading;
    expect(GameState.loadingModule).toBe(false);
    expect(module.readyToProcessEvents).toBe(true);
    expect(GameState.guiAudioEmitter.playSoundFireAndForget).toHaveBeenCalledWith('gui_level');
  });

  test('propagates callback failure and allows the next load', async () => {
    const { GameState, area, queueStarted, completeQueue } = lifecycleHarness();
    area.initAreaObjects.mockRejectedValue(new Error('spawn failed'));
    const loading = GameState.LoadModule('end_m01aa');
    await queueStarted;
    const failed = expect(loading).rejects.toThrow('spawn failed');
    completeQueue();
    await failed;
    expect(GameState.loadingModule).toBe(false);
  });

  test('preserves Forge archive loading without waiting for the movie queue', async () => {
    const { GameState, module } = lifecycleHarness();
    await GameState.LoadModuleFromArchives([], null, 'preview');
    expect(GameState.Module.LoadFromArchives).toHaveBeenCalledWith([], null, 'preview');
    expect(GameState.VideoManager.playMovieQueue).not.toHaveBeenCalled();
    expect(module.readyToProcessEvents).toBe(true);
    expect(GameState.loadingModule).toBe(false);
  });
});
