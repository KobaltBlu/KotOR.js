/**
 * Characterization: Odyssey MDL/MDX ingest and the supported binary save path.
 *
 * Covers FromBuffers, ASCII export/parse round-trip shape, MDX regeneration, and
 * MDL source passthrough. Full MDL rewrite from parsed data is not implemented —
 * see OdysseyModelBinaryWriter (preferSourceMdl + sourceMdl required).
 *
 * Committed fixtures under ./fixtures/ keep CI green without a game install.
 * Optional paths (exports/k1/mdl ASCII dumps, KEY/BIF binary) are guarded with
 * fs.existsSync and skip when absent.
 *
 * @jest-environment node
 */
import * as fs from 'fs';
import * as path from 'path';
import { afterAll, describe, expect, it } from '@jest/globals';
import { ApplicationEnvironment } from '@core/enums/ApplicationEnvironment';
import { ApplicationProfile } from '@core/utility/ApplicationProfile';
import { BIFManager } from '@core/managers/BIFManager';
import { KEYManager } from '@core/managers/KEYManager';
import { ResourceTypes } from '@core/resource/ResourceTypes';
import { OdysseyModel } from '@engine/odyssey/OdysseyModel';
import { OdysseyModelBinaryMdxWriter } from '@engine/odyssey/binary/OdysseyModelBinaryMdxWriter';
import { OdysseyModelBinaryWriter } from '@engine/odyssey/binary/OdysseyModelBinaryWriter';
import { alignTo16 } from '@engine/odyssey/binary/OdysseyModelBinaryLayout';
import { exportOdysseyModelAscii } from '@engine/odyssey/export/odysseyModelAscii';
import { parseOdysseyModelAscii } from '@engine/odyssey/export/odysseyModelAsciiParser';
import type { OdysseyModelNode } from '@engine/odyssey/OdysseyModelNode';
import { OdysseyModelNodeMesh } from '@engine/odyssey/OdysseyModelNodeMesh';
import { OdysseyModelNodeType } from '@core/enums/odyssey/OdysseyModelNodeType';

const FIXTURE_DIR = path.resolve(__dirname, 'fixtures');
const EMPTY_MDL = path.join(FIXTURE_DIR, 'empty.mdl');
const EMPTY_MDX = path.join(FIXTURE_DIR, 'empty.mdx');
const DOR_MDL = path.join(FIXTURE_DIR, 'dor_ukn02.mdl');
const DOR_MDX = path.join(FIXTURE_DIR, 'dor_ukn02.mdx');
const EXPORTS_MDL_ASCII_DIR = path.resolve(__dirname, '../../../../exports/k1/mdl');

const K1_CANDIDATES = [
  process.env.KOTOR_PATH,
  'C:\\Games\\swkotor-steam',
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\swkotor',
  'C:\\Program Files (x86)\\GOG Galaxy\\Games\\Star Wars - Knights of the Old Republic',
  'C:\\GOG Games\\Star Wars - Knights of the Old Republic',
].filter(Boolean) as string[];

type NodeShape = {
  name: string;
  nodeType: number;
  controllerCount: number;
};

function readU8(filePath: string): Uint8Array {
  return new Uint8Array(fs.readFileSync(filePath));
}

function collectNodeShapes(model: OdysseyModel): NodeShape[] {
  const out: NodeShape[] = [];
  const walk = (node: OdysseyModelNode) => {
    out.push({
      name: (node.name || '').toLowerCase(),
      nodeType: node.nodeType,
      controllerCount: node.controllers.size,
    });
    for (const child of node.children) {
      walk(child);
    }
  };
  if (model.rootNode) {
    walk(model.rootNode);
  }
  return out;
}

function firstMeshNode(model: OdysseyModel): OdysseyModelNodeMesh | undefined {
  let found: OdysseyModelNodeMesh | undefined;
  const walk = (node: OdysseyModelNode) => {
    if (found) return;
    if (node instanceof OdysseyModelNodeMesh && (node.nodeType & OdysseyModelNodeType.Mesh)) {
      found = node;
      return;
    }
    for (const child of node.children) {
      walk(child);
    }
  };
  if (model.rootNode) {
    walk(model.rootNode);
  }
  return found;
}

function resolveK1Install(): string | undefined {
  for (const candidate of K1_CANDIDATES) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(path.join(resolved, 'chitin.key'))) {
      return resolved;
    }
  }
  return undefined;
}

function resetKeyManagers(): void {
  BIFManager.Clear();
  KEYManager.Key = undefined as any;
}

describe('OdysseyModel ingest characterization', () => {
  afterAll(() => {
    resetKeyManagers();
  });

  it('rejects non-binary MDL wrappers (constructed minimal buffer)', () => {
    // First uint32 is the binary/ascii flag; non-zero means this is not a binary MDL.
    const buf = new Uint8Array(16);
    new DataView(buf.buffer).setUint32(0, 1, true);
    expect(() => OdysseyModel.FromBuffers(buf, new Uint8Array(0))).toThrow(
      /binary model not presented/i,
    );
  });

  it('documents that full MDL rewrite throws without sourceMdl / when preferSourceMdl is false', () => {
    // Supported binary save path: MDL passthrough from preserveSourceBinary + MDX regen.
    // Re-serializing MDL from the parsed graph is intentionally unimplemented.
    const ascii = [
      'newmodel probe',
      'setsupermodel probe null',
      'classification character',
      'beginmodelgeom probe',
      'node dummy probe',
      '  parent NULL',
      'endnode',
      'endmodelgeom probe',
      'donemodel probe',
    ].join('\n');
    const fromAscii = parseOdysseyModelAscii(ascii);
    expect(fromAscii.sourceMdl).toBeUndefined();
    expect(() => OdysseyModelBinaryWriter.write(fromAscii)).toThrow(/not implemented/i);
    expect(() => OdysseyModelBinaryWriter.write(fromAscii, { preferSourceMdl: false })).toThrow(
      /not implemented/i,
    );

    if (!fs.existsSync(EMPTY_MDL)) {
      return;
    }
    const mdl = readU8(EMPTY_MDL);
    const mdx = fs.existsSync(EMPTY_MDX) ? readU8(EMPTY_MDX) : new Uint8Array(0);
    const withSource = OdysseyModel.FromBuffers(mdl, mdx, { preserveSourceBinary: true });
    expect(withSource.sourceMdl?.length).toBeGreaterThan(0);
    expect(() =>
      OdysseyModelBinaryWriter.write(withSource, { preferSourceMdl: false }),
    ).toThrow(/not implemented/i);

    const withoutSource = OdysseyModel.FromBuffers(mdl, mdx, { preserveSourceBinary: false });
    expect(withoutSource.sourceMdl).toBeUndefined();
    expect(() => OdysseyModelBinaryWriter.write(withoutSource)).toThrow(/not implemented/i);
  });

  it('FromBuffers loads committed empty.mdl fixture when present', () => {
    if (!fs.existsSync(EMPTY_MDL)) {
      console.warn('skip: fixtures/empty.mdl missing');
      return;
    }
    const mdl = readU8(EMPTY_MDL);
    const mdx = fs.existsSync(EMPTY_MDX) ? readU8(EMPTY_MDX) : new Uint8Array(0);
    const model = OdysseyModel.FromBuffers(mdl, mdx);
    expect(model.geometryHeader.modelName).toBe('empty');
    expect(model.rootNode).toBeTruthy();
    expect(model.rootNode.name).toBe('empty');
    expect(model.animations.length).toBe(0);
    expect(model.sourceMdl?.length).toBe(mdl.length);
  });

  it('binary → ASCII → parse preserves node names, types, and animation count (dor_ukn02 fixture)', () => {
    if (!fs.existsSync(DOR_MDL)) {
      console.warn('skip: fixtures/dor_ukn02.mdl missing');
      return;
    }
    const mdl = readU8(DOR_MDL);
    const mdx = fs.existsSync(DOR_MDX) ? readU8(DOR_MDX) : new Uint8Array(0);
    const binaryModel = OdysseyModel.FromBuffers(mdl, mdx);
    const ascii = exportOdysseyModelAscii(binaryModel);
    const parsed = parseOdysseyModelAscii(ascii);

    const binShapes = collectNodeShapes(binaryModel);
    const parsedShapes = collectNodeShapes(parsed);

    expect(parsedShapes.map((n) => n.name)).toEqual(binShapes.map((n) => n.name));
    expect(parsedShapes.map((n) => n.nodeType)).toEqual(binShapes.map((n) => n.nodeType));
    expect(parsed.animations.length).toBe(binaryModel.animations.length);

    // Observed: binary ingest keeps position/orientation (and related) as controllers on the
    // trimesh; ASCII export emits those as node fields, so re-parse controller counts shrink.
    expect(binShapes.map((n) => n.controllerCount)).toEqual([0, 5]);
    expect(parsedShapes.map((n) => n.controllerCount)).toEqual([0, 3]);

    // ASCII re-parse must land on the same typed-array face / vertex domain as binary.
    // Vertex floats may differ slightly after ASCII prepareFloat round-trip.
    const binMesh = firstMeshNode(binaryModel);
    const parsedMesh = firstMeshNode(parsed);
    expect(binMesh).toBeTruthy();
    expect(parsedMesh).toBeTruthy();
    expect(parsedMesh!.vertices).toBeInstanceOf(Float32Array);
    expect(parsedMesh!.faceIndices).toBeInstanceOf(Uint16Array);
    expect(parsedMesh!.faceMaterialIndices).toBeInstanceOf(Uint32Array);
    expect(parsedMesh!.faceCount).toBe(binMesh!.faceCount);
    expect(Array.from(parsedMesh!.faceIndices)).toEqual(Array.from(binMesh!.faceIndices));
    expect(Array.from(parsedMesh!.faceMaterialIndices)).toEqual(
      Array.from(binMesh!.faceMaterialIndices),
    );
    expect(parsedMesh!.verticesCount).toBe(binMesh!.verticesCount);
    expect(parsedMesh!.vertices.length).toBe(binMesh!.vertices.length);
    const binVerts = binMesh!.vertices as Float32Array;
    const parsedVerts = parsedMesh!.vertices as Float32Array;
    for (let i = 0; i < binVerts.length; i++) {
      expect(Math.abs(parsedVerts[i] - binVerts[i])).toBeLessThan(1e-5);
    }
  });

  it('OdysseyModelBinaryMdxWriter regenerates aligned MDX; toBinaryBuffers uses MDL passthrough', () => {
    if (!fs.existsSync(DOR_MDL) || !fs.existsSync(DOR_MDX)) {
      console.warn('skip: dor_ukn02 mdl/mdx fixtures missing');
      return;
    }
    const mdl = readU8(DOR_MDL);
    const mdx = readU8(DOR_MDX);
    expect(mdx.length).toBeGreaterThan(0);

    const model = OdysseyModel.FromBuffers(mdl, mdx, { preserveSourceBinary: true });
    expect(model.sourceMdx?.length).toBe(mdx.length);

    const regenerated = OdysseyModelBinaryMdxWriter.write(model);
    expect(regenerated.length).toBeGreaterThan(0);
    expect(regenerated.length).toBe(alignTo16(regenerated.length));
    expect(regenerated.length).toBe(mdx.length);

    const { mdl: outMdl, mdx: outMdx } = model.toBinaryBuffers();
    // Default path: MDL from source bytes (wrapper mdx size may be patched), MDX regenerated.
    expect(outMdl.length).toBe(model.sourceMdl!.length);
    expect(outMdx.length).toBe(regenerated.length);
    expect(Buffer.from(outMdx)).toEqual(Buffer.from(regenerated));
  });

  it('optionally round-trips a small exports/k1/mdl ASCII dump when present', () => {
    if (!fs.existsSync(EXPORTS_MDL_ASCII_DIR)) {
      console.warn('skip: exports/k1/mdl missing (no retail ASCII dump)');
      return;
    }
    const asciiPath = path.join(EXPORTS_MDL_ASCII_DIR, 'empty.mdl.ascii');
    if (!fs.existsSync(asciiPath)) {
      console.warn('skip: exports/k1/mdl/empty.mdl.ascii missing');
      return;
    }
    const source = fs.readFileSync(asciiPath, 'utf8');
    const model = parseOdysseyModelAscii(source);
    expect(model.geometryHeader.modelName).toBe('empty');
    expect(collectNodeShapes(model).map((n) => n.name)).toEqual(['empty']);
    expect(model.animations.length).toBe(0);

    // When the committed binary fixture exists, compare ASCII-export shape to FromBuffers.
    if (fs.existsSync(EMPTY_MDL)) {
      const fromBin = OdysseyModel.FromBuffers(
        readU8(EMPTY_MDL),
        fs.existsSync(EMPTY_MDX) ? readU8(EMPTY_MDX) : new Uint8Array(0),
      );
      const reExported = exportOdysseyModelAscii(fromBin);
      const reParsed = parseOdysseyModelAscii(reExported);
      expect(collectNodeShapes(reParsed).map((n) => n.name)).toEqual(
        collectNodeShapes(fromBin).map((n) => n.name),
      );
      expect(reParsed.animations.length).toBe(fromBin.animations.length);
    }
  });

  it('optionally loads dor_ukn02 binary via KEY when a KotOR I install is present', async () => {
    const gameDir = resolveK1Install();
    if (!gameDir) {
      console.warn('skip: no KotOR I install with chitin.key');
      return;
    }

    const prevEnv = ApplicationProfile.ENV;
    const prevDir = ApplicationProfile.directory;
    try {
      ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
      ApplicationProfile.directory = gameDir;
      resetKeyManagers();
      const ok = await KEYManager.Load('chitin.key');
      if (!ok || !KEYManager.Key) {
        console.warn('skip: KEYManager.Load failed');
        return;
      }

      const mdlKey = KEYManager.Key.getFileKey('dor_ukn02', ResourceTypes.mdl);
      const mdxKey = KEYManager.Key.getFileKey('dor_ukn02', ResourceTypes.mdx);
      if (!mdlKey) {
        console.warn('skip: dor_ukn02 mdl not in KEY');
        return;
      }

      const mdlBuf = await KEYManager.Key.getFileBuffer(mdlKey);
      const mdxBuf =
        (mdxKey && (await KEYManager.Key.getFileBuffer(mdxKey))) || new Uint8Array(0);
      expect(mdlBuf.length).toBeGreaterThan(0);

      const model = OdysseyModel.FromBuffers(mdlBuf, mdxBuf);
      expect(model.geometryHeader.modelName).toBe('dor_ukn02');
      expect(collectNodeShapes(model).map((n) => n.name)).toEqual(['dor_ukn02', 'splane06']);

      if (fs.existsSync(DOR_MDL)) {
        expect(mdlBuf.length).toBe(fs.statSync(DOR_MDL).size);
      }
    } finally {
      ApplicationProfile.ENV = prevEnv;
      ApplicationProfile.directory = prevDir;
      resetKeyManagers();
    }
  });
});
