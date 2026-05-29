jest.mock('@/GameState', () => {
  const GameState = {
    Ready: false,
    hmrLoopGeneration: 0,
    hmrInvalidateLoop: jest.fn(() => {
      GameState.hmrLoopGeneration += 1;
    }),
    hmrIsSessionActive: jest.fn(() => GameState.Ready),
    Update: jest.fn(),
  };
  return { GameState };
});

import { GameState } from '@/GameState';
import { HotReloadManager } from '@/dev/HotReloadManager';

const mockedGameState = GameState as jest.Mocked<typeof GameState>;

describe('HotReloadManager', () => {
  beforeEach(() => {
    HotReloadManager.resetForTests();
    mockedGameState.Ready = false;
    mockedGameState.hmrLoopGeneration = 0;
    jest.clearAllMocks();
  });

  it('shouldSkipBootstrap is false before the engine is ready', () => {
    expect(HotReloadManager.shouldSkipBootstrap()).toBe(false);
  });

  it('shouldSkipBootstrap is true when GameState.Ready is set', () => {
    mockedGameState.Ready = true;
    expect(HotReloadManager.shouldSkipBootstrap()).toBe(true);
  });

  it('onHotAccept increments accept count and restarts loop when session is active', () => {
    mockedGameState.Ready = true;

    HotReloadManager.onHotAccept();

    expect(HotReloadManager.getHotAcceptCount()).toBe(1);
    expect(mockedGameState.hmrInvalidateLoop).toHaveBeenCalled();
    expect(mockedGameState.Update).toHaveBeenCalled();
  });

  it('onHotAccept is idempotent for accept count across multiple calls', () => {
    mockedGameState.Ready = true;

    HotReloadManager.onHotAccept();
    HotReloadManager.onHotAccept();

    expect(HotReloadManager.getHotAcceptCount()).toBe(2);
  });

  it('preserveSession records whether a live session existed', () => {
    mockedGameState.Ready = true;

    HotReloadManager.preserveSession();

    expect(HotReloadManager.wasSessionPreserved()).toBe(true);
    expect(mockedGameState.hmrInvalidateLoop).toHaveBeenCalled();
  });
});
