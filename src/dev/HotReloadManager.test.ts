jest.mock('@/GameState', () => {
  const GameState = {
    Ready: false,
    OnReadyCalled: false,
    clock: { getDelta: jest.fn(() => 0) },
    hmrLoopGeneration: 0,
    hmrLoopScheduledGeneration: null as number | null,
    hmrInvalidateLoop: jest.fn(() => {
      GameState.hmrLoopGeneration += 1;
      GameState.hmrLoopScheduledGeneration = null;
    }),
    hmrIsSessionActive: jest.fn(() => GameState.Ready),
    Update: jest.fn(() => {
      GameState.hmrLoopScheduledGeneration = GameState.hmrLoopGeneration;
    }),
    ensureUpdateLoop: jest.fn(function ensureUpdateLoop(this: typeof GameState) {
      if (!this.Ready || !this.OnReadyCalled || !this.clock) {
        return;
      }
      if (this.hmrLoopScheduledGeneration === this.hmrLoopGeneration) {
        return;
      }
      this.Update();
    }),
    ensureDialogAudio: jest.fn(),
    module: undefined as { area?: { invalidateAreaObjectScriptSlots: jest.Mock } } | undefined,
  };
  return { GameState };
});

jest.mock('@/apps/game/states/AppState', () => ({
  AppState: {
    initStarted: false,
  },
}));

import { GameState } from '@/GameState';
import { AppState } from '@/apps/game/states/AppState';
import { HotReloadManager } from '@/dev/HotReloadManager';

const mockedGameState = GameState as jest.Mocked<typeof GameState>;

describe('HotReloadManager', () => {
  beforeEach(() => {
    HotReloadManager.resetForTests();
    AppState.initStarted = false;
    mockedGameState.Ready = false;
    mockedGameState.OnReadyCalled = false;
    mockedGameState.clock = { getDelta: jest.fn(() => 0) };
    mockedGameState.hmrLoopGeneration = 0;
    mockedGameState.hmrLoopScheduledGeneration = null;
    mockedGameState.module = undefined;
    jest.clearAllMocks();
  });

  it('shouldSkipBootstrap is false before the engine is ready', () => {
    expect(HotReloadManager.shouldSkipBootstrap()).toBe(false);
  });

  it('shouldSkipBootstrap is true when GameState.Ready is set', () => {
    mockedGameState.Ready = true;
    expect(HotReloadManager.shouldSkipBootstrap()).toBe(true);
  });

  it('shouldSkipBootstrap is true while AppState.initStarted is set', () => {
    AppState.initStarted = true;
    expect(HotReloadManager.shouldSkipBootstrap()).toBe(true);
  });

  it('onHotAccept increments accept count and restarts loop when session is active', () => {
    mockedGameState.Ready = true;
    mockedGameState.OnReadyCalled = true;

    HotReloadManager.onHotAccept();

    expect(HotReloadManager.getHotAcceptCount()).toBe(1);
    expect(mockedGameState.hmrInvalidateLoop).toHaveBeenCalled();
    expect(mockedGameState.ensureUpdateLoop).toHaveBeenCalled();
    expect(mockedGameState.ensureDialogAudio).toHaveBeenCalled();
  });

  it('onHotAccept is idempotent for accept count across multiple calls', () => {
    mockedGameState.Ready = true;
    mockedGameState.OnReadyCalled = true;

    HotReloadManager.onHotAccept();
    HotReloadManager.onHotAccept();

    expect(HotReloadManager.getHotAcceptCount()).toBe(2);
  });

  it('preserveSession restarts the loop when the session is ready', () => {
    mockedGameState.Ready = true;
    mockedGameState.OnReadyCalled = true;

    HotReloadManager.preserveSession();

    expect(HotReloadManager.wasSessionPreserved()).toBe(true);
    expect(mockedGameState.hmrInvalidateLoop).toHaveBeenCalled();
    expect(mockedGameState.ensureUpdateLoop).toHaveBeenCalled();
    expect(mockedGameState.ensureDialogAudio).toHaveBeenCalled();
  });

  it('preserveSession does not restart loop before the engine is ready', () => {
    HotReloadManager.preserveSession();

    expect(HotReloadManager.wasSessionPreserved()).toBe(false);
    expect(mockedGameState.ensureUpdateLoop).toHaveBeenCalled();
  });
});
