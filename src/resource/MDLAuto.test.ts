/**
 * MDL auto-detection and ASCII roundtrip tests.
 */

import { bytesMDL, detectMDLFormat, readMDL, writeMDL } from './MDLAuto';
import { MDL } from './MDLData';
import { readResourceFromBuffer, resourceToBytes } from './ResourceAuto';
import { ResourceTypes } from './ResourceTypes';

const MINIMAL_ASCII_MDL = `# ASCII MDL
filedependancy test_model NULL.mlk
newmodel test_model

setsupermodel test_model
classification other
classification_unk1 0
ignorefog 1
compress_quaternions 0

setanimationscale 0.971

beginmodelgeom test_model
  bmin -5 -5 -1
  bmax 5 5 10
  radius 7
  node dummy root
  {
    parent NULL
    position  0 0 0
    orientation  0 0 0 1
  }
endmodelgeom test_model

donemodel test_model
`;

describe('MDLAuto', () => {
  describe('detectMDLFormat', () => {
    it('detects binary MDL when first 4 bytes are zero', () => {
      const buf = new Uint8Array(20);
      buf.set([0, 0, 0, 0], 0);
      expect(detectMDLFormat(buf)).toBe('mdl');
    });

    it('detects ASCII MDL when first 4 bytes are not all zero', () => {
      const buf = new TextEncoder().encode('# ASCII MDL\nnewmodel x');
      expect(detectMDLFormat(buf)).toBe('mdl_ascii');
    });

    it('returns invalid when buffer is too short', () => {
      expect(detectMDLFormat(new Uint8Array(2))).toBe('invalid');
    });
  });

  describe('readMDL (ASCII)', () => {
    it('parses minimal ASCII MDL', () => {
      const buf = new TextEncoder().encode(MINIMAL_ASCII_MDL);
      const mdl = readMDL(buf, { format: 'mdl_ascii' });
      expect(mdl).toBeInstanceOf(MDL);
      expect(mdl.name).toBe('test_model');
      expect(mdl.supermodel).toBe('');
      expect(mdl.fog).toBe(false);
      expect(mdl.animationScale).toBeCloseTo(0.971);
      expect(mdl.bmin).toEqual({ x: -5, y: -5, z: -1 });
      expect(mdl.bmax).toEqual({ x: 5, y: 5, z: 10 });
      expect(mdl.radius).toBe(7);
      expect(mdl.root.name).toBe('root');
      expect(mdl.root.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(mdl.root.orientation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    });
  });

  describe('MDL ASCII roundtrip', () => {
    it('read -> write ASCII -> read produces equivalent model', () => {
      const buf = new TextEncoder().encode(MINIMAL_ASCII_MDL);
      const mdl1 = readMDL(buf, { format: 'mdl_ascii' });
      const out = bytesMDL(mdl1, 'mdl_ascii');
      expect(out.length).toBeGreaterThan(0);
      const mdl2 = readMDL(out, { format: 'mdl_ascii' });

      expect(mdl2.name).toBe(mdl1.name);
      expect(mdl2.supermodel).toBe(mdl1.supermodel);
      expect(mdl2.fog).toBe(mdl1.fog);
      expect(mdl2.classification).toBe(mdl1.classification);
      expect(mdl2.classificationUnk1).toBe(mdl1.classificationUnk1);
      expect(mdl2.animationScale).toBeCloseTo(mdl1.animationScale);
      expect(mdl2.bmin).toEqual(mdl1.bmin);
      expect(mdl2.bmax).toEqual(mdl1.bmax);
      expect(mdl2.radius).toBe(mdl1.radius);
      expect(mdl2.root.name).toBe(mdl1.root.name);
      expect(mdl2.root.position).toEqual(mdl1.root.position);
      expect(mdl2.root.orientation).toEqual(mdl1.root.orientation);
    });

    it('writeMDL(mdl, target, { format: "mdl_ascii" }) then read roundtrips', () => {
      const buf = new TextEncoder().encode(MINIMAL_ASCII_MDL);
      const mdl1 = readMDL(buf, { format: 'mdl_ascii' });
      const out = bytesMDL(mdl1, 'mdl_ascii');
      const target = new Uint8Array(out.length + 100);
      writeMDL(mdl1, target, { format: 'mdl_ascii' });
      const mdl2 = readMDL(target.subarray(0, out.length), { format: 'mdl_ascii' });
      expect(mdl2.name).toBe(mdl1.name);
      expect(mdl2.root.name).toBe(mdl1.root.name);
    });
  });

  describe('ResourceAuto MDL', () => {
    it('readResourceFromBuffer with resType mdl returns MDL for ASCII buffer', () => {
      const buf = new TextEncoder().encode(MINIMAL_ASCII_MDL);
      const R = ResourceTypes as Record<string, number>;
      const res = readResourceFromBuffer(buf, R['mdl']);
      expect(res).toBeInstanceOf(MDL);
      expect((res as MDL).name).toBe('test_model');
    });

    it('resourceToBytes with MDL and format mdl_ascii returns bytes', () => {
      const buf = new TextEncoder().encode(MINIMAL_ASCII_MDL);
      const mdl = readMDL(buf, { format: 'mdl_ascii' });
      const out = resourceToBytes(mdl, { format: 'mdl_ascii' });
      expect(out).toBeInstanceOf(Uint8Array);
      expect(out.length).toBeGreaterThan(0);
      const mdl2 = readMDL(out, { format: 'mdl_ascii' });
      expect(mdl2.name).toBe(mdl.name);
    });
  });
});
