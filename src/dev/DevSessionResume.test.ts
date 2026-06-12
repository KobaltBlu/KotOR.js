/**
 * Unit tests for the dev session resume snapshot/restore path.
 *
 * Jest runs in a node environment, so window/localStorage/performance are
 * stubbed. The KotOR namespace and bridge helpers are mocked — runtime
 * behavior is covered by scripts/hmr-session.e2e.cjs (F5 + engine-edit
 * reload-resume phases).
 */

const quickPlayMock = jest.fn<Promise<void>, [string]>();
const skipIntroMoviesMock = jest.fn();
const getPlayerCreatureMock = jest.fn();

jest.mock('@/apps/game/KotOR', () => ({
  GameState: {
    Ready: false,
    loadingModule: false,
    Mode: 0,
    module: undefined as any,
    TwoDAManager: { datatables: new Map<string, any>() },
    MenuManager: {} as any,
  },
  EngineMode: { GUI: 0, INGAME: 1, DIALOG: 3, MOVIE: 4, FREELOOK: 5 },
}), { virtual: false });

jest.mock('@/dev/HmrTestBridge', () => ({
  startQuickPlayToModule: (moduleName: string) => quickPlayMock(moduleName),
  skipIntroMovies: () => skipIntroMoviesMock(),
  getPlayerCreature: () => getPlayerCreatureMock(),
}));

import * as KotOR from '@/apps/game/KotOR';
import {
  captureDevResumeSnapshot,
  clearDevResumeSnapshot,
  installDevSessionResume,
  tryResumeDevSession,
} from '@/dev/DevSessionResume';

const STORAGE_KEY = 'kotor.devResumeSnapshot';

function createLocalStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
  };
}

type MutableGameState = {
  Ready: boolean;
  loadingModule: boolean;
  Mode: number;
  module: any;
  TwoDAManager: { datatables: Map<string, any> };
  MenuManager: any;
};

const gameState = (KotOR as any).GameState as MutableGameState;

function setInModuleState(): void {
  gameState.Ready = true;
  gameState.loadingModule = false;
  gameState.Mode = (KotOR as any).EngineMode.INGAME;
  gameState.module = { filename: 'end_m01aa', readyToProcessEvents: true };
}

function setQuickPlayReadyState(): void {
  gameState.Ready = true;
  gameState.TwoDAManager.datatables.set('heads', { RowCount: 107 });
  gameState.MenuManager = { LoadScreen: {}, MenuToolTip: {} };
}

function makePlayer() {
  return {
    position: {
      x: 0, y: 0, z: 0,
      set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; },
    },
    container: { position: { set: jest.fn() } },
    rotation: { z: 1.25 },
    setFacing: jest.fn(),
  };
}

function storedSnapshot(): any {
  const raw = (window as any).localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function writeSnapshotToStorage(overrides: Record<string, unknown> = {}): void {
  (window as any).localStorage.setItem(STORAGE_KEY, JSON.stringify({
    v: 1,
    ts: Date.now(),
    module: 'end_m01aa',
    position: { x: 18.42, y: 22.12, z: -1.27 },
    facing: 0.44,
    attempts: 0,
    ...overrides,
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).window = {
    localStorage: createLocalStorageStub(),
    location: { search: '' },
    addEventListener: jest.fn(),
    setInterval: jest.fn(() => 1),
    clearInterval: jest.fn(),
  };
  if (!(globalThis as any).performance) {
    (globalThis as any).performance = { now: () => Date.now() };
  }
  gameState.Ready = false;
  gameState.loadingModule = false;
  gameState.Mode = 0;
  gameState.module = undefined;
  gameState.TwoDAManager.datatables.clear();
  gameState.MenuManager = {};
});

afterEach(() => {
  delete (globalThis as any).window;
});

describe('captureDevResumeSnapshot', () => {
  it('does not capture when no in-module session is active', () => {
    getPlayerCreatureMock.mockReturnValue(makePlayer());
    expect(captureDevResumeSnapshot()).toBe(false);
    expect(storedSnapshot()).toBeNull();
  });

  it('does not capture while a module is still loading', () => {
    setInModuleState();
    gameState.loadingModule = true;
    getPlayerCreatureMock.mockReturnValue(makePlayer());
    expect(captureDevResumeSnapshot()).toBe(false);
  });

  it('captures module, position, and facing for a live session', () => {
    setInModuleState();
    const player = makePlayer();
    player.position.x = 18.42;
    player.position.y = 22.12;
    player.position.z = -1.27;
    getPlayerCreatureMock.mockReturnValue(player);

    expect(captureDevResumeSnapshot()).toBe(true);

    const stored = storedSnapshot();
    expect(stored).toMatchObject({
      v: 1,
      module: 'end_m01aa',
      position: { x: 18.42, y: 22.12, z: -1.27 },
      facing: 1.25,
      attempts: 0,
    });
  });

  it('does not capture when the player has no position yet', () => {
    setInModuleState();
    getPlayerCreatureMock.mockReturnValue(null);
    expect(captureDevResumeSnapshot()).toBe(false);
  });
});

describe('tryResumeDevSession', () => {
  it('returns false and stays idle without a snapshot', async () => {
    await expect(tryResumeDevSession()).resolves.toBe(false);
    expect((window as any).__KOTOR_DEV_RESUME_STATE__).toBe('idle');
    expect(quickPlayMock).not.toHaveBeenCalled();
  });

  it('is disabled by ?devresume=0', async () => {
    writeSnapshotToStorage();
    (window as any).location.search = '?devresume=0';
    await expect(tryResumeDevSession()).resolves.toBe(false);
    expect((window as any).__KOTOR_DEV_RESUME_STATE__).toBe('disabled');
    expect(quickPlayMock).not.toHaveBeenCalled();
    // Snapshot is kept so re-enabling resume still works.
    expect(storedSnapshot()).not.toBeNull();
  });

  it('clears the snapshot and gives up after too many failed attempts', async () => {
    writeSnapshotToStorage({ attempts: 3 });
    await expect(tryResumeDevSession()).resolves.toBe(false);
    expect((window as any).__KOTOR_DEV_RESUME_STATE__).toBe('failed');
    expect(storedSnapshot()).toBeNull();
    expect(quickPlayMock).not.toHaveBeenCalled();
  });

  it('quick-plays into the saved module, restores the transform, and resets attempts', async () => {
    writeSnapshotToStorage({ attempts: 1 });
    setQuickPlayReadyState();
    const player = makePlayer();
    getPlayerCreatureMock.mockReturnValue(player);
    quickPlayMock.mockResolvedValue(undefined);

    await expect(tryResumeDevSession()).resolves.toBe(true);

    expect(quickPlayMock).toHaveBeenCalledWith('end_m01aa');
    expect(player.position).toMatchObject({ x: 18.42, y: 22.12, z: -1.27 });
    expect(player.container.position.set).toHaveBeenCalledWith(18.42, 22.12, -1.27);
    expect(player.setFacing).toHaveBeenCalledWith(0.44, true);
    expect((window as any).__KOTOR_DEV_RESUME_STATE__).toBe('resumed');
    expect(storedSnapshot()?.attempts).toBe(0);
  });

  it('persists the attempt before quick-play so a crash loop self-heals', async () => {
    writeSnapshotToStorage({ attempts: 0 });
    setQuickPlayReadyState();
    getPlayerCreatureMock.mockReturnValue(makePlayer());
    let storedDuringQuickPlay: any = null;
    quickPlayMock.mockImplementation(async () => {
      storedDuringQuickPlay = storedSnapshot();
      throw new Error('module load exploded');
    });

    await expect(tryResumeDevSession()).resolves.toBe(false);

    expect(storedDuringQuickPlay?.attempts).toBe(1);
    expect((window as any).__KOTOR_DEV_RESUME_STATE__).toBe('failed');
    // Attempt counter stays burned so the breaker can trip eventually.
    expect(storedSnapshot()?.attempts).toBe(1);
  });

  it('returns false immediately when resume is already in progress', async () => {
    writeSnapshotToStorage();
    (window as any).__KOTOR_DEV_RESUME_STATE__ = 'resuming';
    await expect(tryResumeDevSession()).resolves.toBe(false);
    expect(quickPlayMock).not.toHaveBeenCalled();
  });

  it('ignores snapshots with invalid schema', async () => {
    (window as any).localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 2, module: 'x', position: { x: 0, y: 0, z: 0 }, attempts: 0 }));
    await expect(tryResumeDevSession()).resolves.toBe(false);
    expect((window as any).__KOTOR_DEV_RESUME_STATE__).toBe('idle');

    (window as any).localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, module: 'x', attempts: 0 }));
    await expect(tryResumeDevSession()).resolves.toBe(false);
    expect(quickPlayMock).not.toHaveBeenCalled();
  });

  it('fails when localStorage cannot persist the attempt counter', async () => {
    writeSnapshotToStorage({ attempts: 0 });
    const ls = (window as any).localStorage;
    const originalSetItem = ls.setItem.bind(ls);
    ls.setItem = () => { throw new Error('QuotaExceededError'); };

    await expect(tryResumeDevSession()).resolves.toBe(false);
    expect((window as any).__KOTOR_DEV_RESUME_STATE__).toBe('failed');
    expect(quickPlayMock).not.toHaveBeenCalled();

    ls.setItem = originalSetItem;
  });
});

describe('installDevSessionResume', () => {
  it('installs beforeunload + interval capture exactly once', () => {
    installDevSessionResume();
    installDevSessionResume();
    expect((window as any).addEventListener).toHaveBeenCalledTimes(1);
    expect((window as any).setInterval).toHaveBeenCalledTimes(1);
    expect((window as any).__KOTOR_DEV_RESUME_INSTALLED__).toBe(true);
  });
});

describe('clearDevResumeSnapshot', () => {
  it('removes the stored snapshot', () => {
    writeSnapshotToStorage();
    clearDevResumeSnapshot();
    expect(storedSnapshot()).toBeNull();
  });
});
