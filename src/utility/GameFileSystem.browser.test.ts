import { InMemoryDirectoryHandle } from "../tests/helpers/InMemoryFileSystemAccess";
import { ApplicationProfile } from "./ApplicationProfile";
import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { GameFileSystem } from "./GameFileSystem";

describe("GameFileSystem browser reliability", () => {
  beforeEach(() => {
    ApplicationProfile.ENV = ApplicationEnvironment.BROWSER;
    GameFileSystem.clearDirectoryCache();
  });

  afterEach(() => {
    ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
    (ApplicationProfile as any).directoryHandle = undefined;
    GameFileSystem.clearDirectoryCache();
  });

  it("normalizes slash variants for mkdir paths", async () => {
    const root = new InMemoryDirectoryHandle("root");
    (ApplicationProfile as any).directoryHandle = root;

    const created = await GameFileSystem.mkdir("\\Saves\\Slot01\\", { recursive: true });
    expect(created).toBe(true);
    await expect(GameFileSystem.exists("Saves/Slot01")).resolves.toBe(true);
  });

  it("resolves mkdir from cache on repeated calls", async () => {
    const root = new InMemoryDirectoryHandle("root");
    (ApplicationProfile as any).directoryHandle = root;

    const withTimeout = (promise: Promise<boolean>) =>
      Promise.race<boolean>([
        promise,
        new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error("mkdir timed out")), 250);
        }),
      ]);

    await expect(withTimeout(GameFileSystem.mkdir("Saves/CacheHit", { recursive: true }))).resolves.toBe(true);
    await expect(withTimeout(GameFileSystem.mkdir("Saves/CacheHit", { recursive: true }))).resolves.toBe(true);
  });

  it("clearDirectoryCache invalidates stale directory handles", async () => {
    const rootA = new InMemoryDirectoryHandle("rootA");
    const chitinHandle = await rootA.getFileHandle("chitin.key", { create: true });
    const stream = await chitinHandle.createWritable();
    await stream.write(new Uint8Array([1, 2, 3]));
    await stream.close();

    const rootB = new InMemoryDirectoryHandle("rootB");

    (ApplicationProfile as any).directoryHandle = rootA;
    await expect(GameFileSystem.exists("chitin.key")).resolves.toBe(true);

    (ApplicationProfile as any).directoryHandle = rootB;
    await expect(GameFileSystem.exists("chitin.key")).resolves.toBe(true); // stale cache still points to rootA

    GameFileSystem.clearDirectoryCache();
    await expect(GameFileSystem.exists("chitin.key")).resolves.toBe(false);
  });
});

