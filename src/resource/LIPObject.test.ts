import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ApplicationEnvironment } from '@/enums/ApplicationEnvironment';
import { LIPObject, LIP_V10_HEADER_SIZE, LIP_V10_KEYFRAME_STRIDE } from '@/resource/LIPObject';
import { ApplicationProfile } from '@/utility/ApplicationProfile';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';

describe('LIPObject', () => {
  function makeLipBuffer(
    keyframes: Array<{ time: number; shape: number }> = [
      { time: 0.0, shape: 0 },
      { time: 0.7777, shape: 5 },
      { time: 1.25, shape: 10 },
    ],
    options: { fileType?: string; fileVersion?: string; duration?: number } = {}
  ): Uint8Array {
    const { fileType = 'LIP ', fileVersion = 'V1.0', duration = 1.5 } = options;

    const writer = new BinaryWriter();
    writer.writeChars(fileType);
    writer.writeChars(fileVersion);
    writer.writeSingle(duration);
    writer.writeUInt32(keyframes.length);
    keyframes.forEach((keyframe) => {
      writer.writeSingle(keyframe.time);
      writer.writeByte(keyframe.shape);
    });
    return writer.buffer;
  }

  function parseLip(buffer: Uint8Array): LIPObject {
    const lip = new LIPObject(new Uint8Array(0));
    lip.readBinary(buffer);
    return lip;
  }

  it('parses vendor-like binary lip data', () => {
    const lip = parseLip(makeLipBuffer());

    expect(lip.duration).toBeCloseTo(1.5, 3);
    expect(lip.keyframes).toHaveLength(3);
    expect(lip.keyframes[0].time).toBeCloseTo(0.0, 4);
    expect(lip.keyframes[0].shape).toBe(0);
    expect(lip.keyframes[1].time).toBeCloseTo(0.7777, 4);
    expect(lip.keyframes[1].shape).toBe(5);
    expect(lip.keyframes[2].time).toBeCloseTo(1.25, 4);
    expect(lip.keyframes[2].shape).toBe(10);
  });

  it('reads vendor-like lip data from disk', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kotor-lip-'));
    const previousEnv = ApplicationProfile.ENV;
    const previousDirectory = ApplicationProfile.directory;
    const fileName = 'test.lip';

    try {
      ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
      ApplicationProfile.directory = tempDir;
      fs.writeFileSync(path.join(tempDir, fileName), makeLipBuffer());

      const lip = await new Promise<LIPObject>((resolve) => {
        new LIPObject(fileName, (loaded: LIPObject) => resolve(loaded));
      });

      expect(lip.duration).toBeCloseTo(1.5, 3);
      expect(lip.keyframes).toHaveLength(3);
      expect(lip.keyframes.map((keyframe) => keyframe.shape)).toEqual([0, 5, 10]);
      expect(lip.keyframes.map((keyframe) => Number(keyframe.time.toFixed(4)))).toEqual([0, 0.7777, 1.25]);
    } finally {
      ApplicationProfile.ENV = previousEnv;
      ApplicationProfile.directory = previousDirectory;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('toExportBuffer round-trips binary lip data', () => {
    const source = parseLip(makeLipBuffer());
    const reloaded = parseLip(source.toExportBuffer());

    expect(reloaded.duration).toBeCloseTo(source.duration, 3);
    expect(reloaded.keyframes).toHaveLength(source.keyframes.length);
    expect(reloaded.keyframes.map((keyframe) => keyframe.shape)).toEqual(
      source.keyframes.map((keyframe) => keyframe.shape)
    );
    expect(reloaded.keyframes.map((keyframe) => Number(keyframe.time.toFixed(4)))).toEqual(
      source.keyframes.map((keyframe) => Number(keyframe.time.toFixed(4)))
    );
  });

  it('sorts keyframes by time when adding frames', () => {
    const lip = parseLip(
      makeLipBuffer([
        { time: 1.25, shape: 10 },
        { time: 0.0, shape: 0 },
      ])
    );
    lip.addKeyFrame(0.7777, 5);

    expect(lip.keyframes.map((keyframe) => Number(keyframe.time.toFixed(4)))).toEqual([0, 0.7777, 1.25]);
    expect(lip.keyframes.map((keyframe) => keyframe.shape)).toEqual([0, 5, 10]);
  });

  it('rejects invalid headers and truncated keyframe payloads', () => {
    const lip = new LIPObject(new Uint8Array(0));

    expect(() => lip.readBinary(makeLipBuffer([], { fileType: 'BAD ' }))).toThrow(
      'Tried to save or load an unsupported or corrupted file.'
    );
    expect(() => lip.readBinary(makeLipBuffer([], { fileVersion: 'V2.0' }))).toThrow(
      'Tried to save or load an unsupported or corrupted file.'
    );

    const truncated = new Uint8Array(makeLipBuffer());
    truncated[12] = 4;
    truncated[13] = 0;
    truncated[14] = 0;
    truncated[15] = 0;
    expect(() => lip.readBinary(truncated)).toThrow('Tried to save or load an unsupported or corrupted file.');
  });

  it('exposes the expected shape label table', () => {
    expect(LIPObject.GetLIPShapeLabels()).toHaveLength(16);
    expect(LIPObject.GetLIPShapeLabels()[0]).toContain('ee');
    expect(LIPObject.GetLIPShapeLabels()[10]).toContain('th');
  });

  it('handles zero-keyframe lip data', () => {
    const lip = parseLip(makeLipBuffer([], { duration: 0.0 }));
    expect(lip.duration).toBeCloseTo(0.0, 3);
    expect(lip.keyframes).toHaveLength(0);
  });

  it('handles zero-duration with keyframes', () => {
    const lip = parseLip(makeLipBuffer([{ time: 0.0, shape: 0 }], { duration: 0.0 }));
    expect(lip.duration).toBeCloseTo(0.0, 3);
    expect(lip.keyframes).toHaveLength(1);
    expect(lip.keyframes[0].shape).toBe(0);
  });

  it('toExportBuffer preserves byte length for vendor-like data', () => {
    const source = makeLipBuffer();
    const lip = parseLip(source);
    const exported = lip.toExportBuffer();
    expect(exported.length).toBe(LIP_V10_HEADER_SIZE + lip.keyframes.length * LIP_V10_KEYFRAME_STRIDE);
  });

  it('round-trips after addKeyFrame mutation', () => {
    const lip = parseLip(makeLipBuffer());
    lip.addKeyFrame(0.5, 3);

    expect(lip.keyframes).toHaveLength(4);
    const exported = lip.toExportBuffer();
    const reloaded = parseLip(exported);
    expect(reloaded.keyframes).toHaveLength(4);
    expect(reloaded.keyframes.map((k) => k.shape)).toEqual(lip.keyframes.map((k) => k.shape));
  });
});
