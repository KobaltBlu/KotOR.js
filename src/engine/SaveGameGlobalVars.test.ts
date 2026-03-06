/**
 * SaveGameGlobalVars.test.ts
 *
 * Round-trip tests for SaveGame.ExportGlobalVars().
 *
 * Validates that:
 *  1. Boolean bits are packed MSB-first to match the loadGlobalVARS() reader.
 *  2. Boolean buffer is correctly sized for counts not divisible by 8.
 *  3. Location buffer is sized to the actual number of locations.
 *
 * GameFileSystem is exercised through the BROWSER (File System Access API)
 * code-path using the InMemoryDirectoryHandle mock, so no real disk I/O occurs.
 */

import { InMemoryDirectoryHandle } from '../tests/helpers/InMemoryFileSystemAccess';

// ---------------------------------------------------------------------------
// Module mocks – must be declared before any import of the modules under test.
// ---------------------------------------------------------------------------

// Provide a controlled GlobalVariableManager so that SaveGame.ExportGlobalVars
// uses the Globals maps we seed in each test.
jest.mock('../GameState', () => {
  const Boolean: Map<string, { name: string; value: boolean }> = new Map();
  const Number: Map<string, { name: string; value: number }> = new Map();
  const String: Map<string, { name: string; value: string }> = new Map();
  const Location: Map<string, { name: string; value: any }> = new Map();
  return {
    GameState: {
      GlobalVariableManager: {
        Globals: { Boolean, Number, String, Location },
      },
    },
  };
});

// Stub heavy modules imported by SaveGame.ts that are unused by ExportGlobalVars.
jest.mock('../KotOR', () => ({ ResourceTypes: {} }));
jest.mock('../loaders', () => ({}));
jest.mock('../three/odyssey/OdysseyTexture', () => ({}));
jest.mock('./CurrentGame', () => ({}));
jest.mock('../resource/ERFObject', () => ({}));
jest.mock('../utility/Utility', () => ({}));

// ---------------------------------------------------------------------------
// Actual imports (after mocks are registered)
// ---------------------------------------------------------------------------
import { SaveGame } from './SaveGame';
import { GFFObject } from '../resource/GFFObject';
import { ApplicationProfile } from '../utility/ApplicationProfile';
import { ApplicationEnvironment } from '../enums/ApplicationEnvironment';
import { GameFileSystem } from '../utility/GameFileSystem';
import { GameState } from '../GameState';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Decode a ValBoolean Uint8Array using the same MSB-first logic as loadGlobalVARS(). */
function decodeBoolsMSBFirst(boolBytes: Uint8Array, count: number): boolean[] {
  const result: boolean[] = [];
  for (let i = 0; i < Math.ceil(count / 8); i++) {
    for (let j = 0; j < 8; j++) {
      const index = i * 8 + j;
      if (index >= count) break;
      result.push(!!((boolBytes[i] >> (7 - j)) & 1));
    }
  }
  return result;
}

/** Read a file from an InMemoryDirectoryHandle by path segments. */
async function readInMemoryFile(
  root: InMemoryDirectoryHandle,
  ...pathSegments: string[]
): Promise<Uint8Array> {
  let dir: InMemoryDirectoryHandle = root;
  for (let i = 0; i < pathSegments.length - 1; i++) {
    dir = await dir.getDirectoryHandle(pathSegments[i]);
  }
  const fileHandle = await dir.getFileHandle(pathSegments[pathSegments.length - 1]);
  const file = await fileHandle.getFile();
  return new Uint8Array(await file.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SaveGame.ExportGlobalVars – boolean serialization (MSB-first)', () => {
  let rootHandle: InMemoryDirectoryHandle;
  const mockGlobals = (GameState as any).GlobalVariableManager.Globals as {
    Boolean: Map<string, { name: string; value: boolean }>;
    Number: Map<string, { name: string; value: number }>;
    String: Map<string, { name: string; value: string }>;
    Location: Map<string, { name: string; value: any }>;
  };

  beforeEach(async () => {
    // Reset in-memory filesystem and ApplicationProfile for each test.
    rootHandle = new InMemoryDirectoryHandle('root');
    ApplicationProfile.ENV = ApplicationEnvironment.BROWSER;
    (ApplicationProfile as any).directoryHandle = rootHandle;
    GameFileSystem.directoryCache.clear();

    // Clear all Globals maps so tests are isolated.
    mockGlobals.Boolean.clear();
    mockGlobals.Number.clear();
    mockGlobals.String.clear();
    mockGlobals.Location.clear();

    // Pre-create the save directory so ExportGlobalVars can write into it.
    await GameFileSystem.mkdir('Saves/roundtrip', { recursive: true });
  });

  afterEach(() => {
    // Restore default ENV so other tests in the suite are not affected.
    ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
    (ApplicationProfile as any).directoryHandle = undefined;
    GameFileSystem.directoryCache.clear();
  });

  // -------------------------------------------------------------------------
  it('encodes a simple boolean sequence MSB-first (8 booleans, 1 byte)', async () => {
    // Define 8 booleans: T F T F T F T F → bit pattern 10101010 = 0xAA
    const names = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'];
    const values = [true, false, true, false, true, false, true, false];
    names.forEach((name, idx) =>
      mockGlobals.Boolean.set(name, { name, value: values[idx] }),
    );

    await SaveGame.ExportGlobalVars('Saves/roundtrip');

    const buffer = await readInMemoryFile(rootHandle, 'Saves', 'roundtrip', 'GLOBALVARS.res');
    const gff = new GFFObject(buffer);
    const boolBytes = gff.RootNode.getFieldByLabel('ValBoolean').getVoid();

    expect(boolBytes.length).toBe(1);
    expect(boolBytes[0]).toBe(0xaa); // 10101010

    const decoded = decodeBoolsMSBFirst(boolBytes, 8);
    expect(decoded).toEqual(values);
  });

  // -------------------------------------------------------------------------
  it('round-trips 9 booleans correctly – partial last byte, no truncation', async () => {
    // 9 booleans require 2 bytes (ceil(9/8) = 2).
    // Values: T T T T T T T T T → first byte all-ones (0xFF), second byte MSB = 1 (0x80)
    const names = Array.from({ length: 9 }, (_, i) => `b${i}`);
    const values = Array.from({ length: 9 }, () => true);
    names.forEach((name, idx) =>
      mockGlobals.Boolean.set(name, { name, value: values[idx] }),
    );

    await SaveGame.ExportGlobalVars('Saves/roundtrip');

    const buffer = await readInMemoryFile(rootHandle, 'Saves', 'roundtrip', 'GLOBALVARS.res');
    const gff = new GFFObject(buffer);
    const boolBytes = gff.RootNode.getFieldByLabel('ValBoolean').getVoid();

    // Buffer must be 2 bytes – not 1 (the truncation bug).
    expect(boolBytes.length).toBe(2);
    expect(boolBytes[0]).toBe(0xff);
    // 9th boolean (index 8) lands in byte[1] at bit position 7-(8%8)=7 → value 0x80.
    expect(boolBytes[1]).toBe(0x80);

    const decoded = decodeBoolsMSBFirst(boolBytes, 9);
    expect(decoded).toEqual(values);
  });

  // -------------------------------------------------------------------------
  it('round-trips mixed true/false values over 16 booleans', async () => {
    // 16 booleans → 2 bytes. Use a recognisable pattern.
    // First byte bits 7-0: 1 1 0 0 1 0 1 0 → 0xCA
    // Second byte bits 7-0: 0 1 0 1 1 1 0 1 → 0x5D
    const values = [
      true,  true,  false, false, true,  false, true,  false, // byte 0: 11001010 = 0xCA
      false, true,  false, true,  true,  true,  false, true,  // byte 1: 01011101 = 0x5D
    ];
    const names = values.map((_, i) => `b${i}`);
    names.forEach((name, idx) =>
      mockGlobals.Boolean.set(name, { name, value: values[idx] }),
    );

    await SaveGame.ExportGlobalVars('Saves/roundtrip');

    const buffer = await readInMemoryFile(rootHandle, 'Saves', 'roundtrip', 'GLOBALVARS.res');
    const gff = new GFFObject(buffer);
    const boolBytes = gff.RootNode.getFieldByLabel('ValBoolean').getVoid();

    expect(boolBytes.length).toBe(2);
    expect(boolBytes[0]).toBe(0xca);
    expect(boolBytes[1]).toBe(0x5d);

    const decoded = decodeBoolsMSBFirst(boolBytes, 16);
    expect(decoded).toEqual(values);
  });

  // -------------------------------------------------------------------------
  it('emits an empty ValBoolean buffer when there are no booleans', async () => {
    // No boolean globals seeded – buffer should be 0 bytes.
    await SaveGame.ExportGlobalVars('Saves/roundtrip');

    const buffer = await readInMemoryFile(rootHandle, 'Saves', 'roundtrip', 'GLOBALVARS.res');
    const gff = new GFFObject(buffer);
    const boolBytes = gff.RootNode.getFieldByLabel('ValBoolean').getVoid();

    expect(boolBytes.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe('SaveGame.ExportGlobalVars – location buffer sizing', () => {
  let rootHandle: InMemoryDirectoryHandle;
  const mockGlobals = (GameState as any).GlobalVariableManager.Globals as {
    Boolean: Map<string, { name: string; value: boolean }>;
    Number: Map<string, { name: string; value: number }>;
    String: Map<string, { name: string; value: string }>;
    Location: Map<string, { name: string; value: any }>;
  };

  beforeEach(async () => {
    rootHandle = new InMemoryDirectoryHandle('root');
    ApplicationProfile.ENV = ApplicationEnvironment.BROWSER;
    (ApplicationProfile as any).directoryHandle = rootHandle;
    GameFileSystem.directoryCache.clear();

    mockGlobals.Boolean.clear();
    mockGlobals.Number.clear();
    mockGlobals.String.clear();
    mockGlobals.Location.clear();

    await GameFileSystem.mkdir('Saves/locs', { recursive: true });
  });

  afterEach(() => {
    ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
    (ApplicationProfile as any).directoryHandle = undefined;
    GameFileSystem.directoryCache.clear();
  });

  it('sizes ValLocation buffer to 24 * actual location count, not 24*100', async () => {
    // Seed 3 locations.
    for (let i = 0; i < 3; i++) {
      const name = `loc${i}`;
      mockGlobals.Location.set(name, {
        name,
        value: {
          position: { x: i * 1.0, y: i * 2.0, z: i * 3.0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      });
    }

    await SaveGame.ExportGlobalVars('Saves/locs');

    const buffer = await readInMemoryFile(rootHandle, 'Saves', 'locs', 'GLOBALVARS.res');
    const gff = new GFFObject(buffer);
    const locBytes = gff.RootNode.getFieldByLabel('ValLocation').getVoid();

    // 3 locations × 24 bytes each = 72 bytes (not 2400 = 24*100).
    expect(locBytes.length).toBe(72);
  });

  it('sizes ValLocation buffer to 0 bytes when no locations exist', async () => {
    await SaveGame.ExportGlobalVars('Saves/locs');

    const buffer = await readInMemoryFile(rootHandle, 'Saves', 'locs', 'GLOBALVARS.res');
    const gff = new GFFObject(buffer);
    const locBytes = gff.RootNode.getFieldByLabel('ValLocation').getVoid();

    expect(locBytes.length).toBe(0);
  });
});
