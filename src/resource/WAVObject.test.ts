import { AudioFileAudioType } from '@/enums/audio/AudioFileAudioType';
import {
  DeobfuscationResult,
  detectAudioFormat,
  deobfuscateAudio,
  obfuscateAudio,
  WAVObject,
  WAVType,
} from '@/resource/WAVObject';

describe('WAVObject', () => {
  it('constructs without buffer', () => {
    const wav = new WAVObject();
    expect(wav.wavType).toBe(WAVType.VO);
    expect(wav.audioFormat).toBe(AudioFileAudioType.WAVE);
    expect(wav.data.length).toBe(0);
  });

  it('detects PCM WAV from minimal RIFF header', () => {
    const riff = new Uint8Array(64);
    const view = new DataView(riff.buffer);
    const enc = new TextEncoder();
    enc.encodeInto('RIFF', riff);
    view.setUint32(4, 56, true);
    enc.encodeInto('WAVE', riff.subarray(8));
    enc.encodeInto('fmt ', riff.subarray(12));
    view.setUint32(16, 16, true);
    view.setUint16(20, 0x01, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 22050, true);
    view.setUint32(28, 44100, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    enc.encodeInto('data', riff.subarray(36));
    view.setUint32(40, 0, true);
    const wav = new WAVObject(riff);
    expect(wav.audioFormat).toBe(AudioFileAudioType.WAVE);
    expect(wav.isPcm()).toBe(true);
    expect(wav.sampleRate).toBe(22050);
    expect(wav.channels).toBe(1);
  });

  it('detects SFX obfuscation header', () => {
    const riff = new Uint8Array(64);
    const enc = new TextEncoder();
    enc.encodeInto('RIFF', riff);
    new DataView(riff.buffer, riff.byteOffset, riff.byteLength).setUint32(4, 56, true);
    enc.encodeInto('WAVE', riff.subarray(8));
    enc.encodeInto('fmt ', riff.subarray(12));
    new DataView(riff.buffer, riff.byteOffset, riff.byteLength).setUint32(16, 16, true);
    new DataView(riff.buffer, riff.byteOffset, riff.byteLength).setUint16(20, 0x01, true);
    const withHeader = new Uint8Array(470 + riff.length);
    withHeader[0] = 0xff;
    withHeader[1] = 0xf3;
    withHeader[2] = 0x60;
    withHeader[3] = 0xc4;
    withHeader.set(riff, 470);
    const wav = new WAVObject(withHeader);
    expect(wav.wavType).toBe(WAVType.SFX);
  });

  it('toBuffer returns Uint8Array', () => {
    const wav = new WAVObject();
    wav.data = new Uint8Array(100);
    const out = wav.toBuffer();
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.length).toBeGreaterThan(0);
  });

  it('detects VO 20-byte header and round-trip', () => {
    const riff = new Uint8Array(64);
    const enc = new TextEncoder();
    enc.encodeInto('RIFF', riff);
    new DataView(riff.buffer).setUint32(4, 56, true);
    enc.encodeInto('WAVE', riff.subarray(8));
    enc.encodeInto('fmt ', riff.subarray(12));
    new DataView(riff.buffer).setUint32(16, 16, true);
    new DataView(riff.buffer).setUint16(20, 0x01, true);
    enc.encodeInto('data', riff.subarray(36));
    new DataView(riff.buffer).setUint32(40, 0, true);
    const withVO = new Uint8Array(20 + riff.length);
    enc.encodeInto('RIFF', withVO);
    withVO.set(riff, 20);
    const wav = new WAVObject(withVO);
    expect(wav.wavType).toBe(WAVType.VO);
    expect(wav.audioFormat).toBe(AudioFileAudioType.WAVE);
    const out = wav.toBuffer();
    expect(out.length).toBe(20 + 8 + 36); // VO header + RIFF header + chunk
    expect(out[0]).toBe(0x52);
    expect(out[20]).toBe(0x52);
  });

  it('detectAudioFormat returns SFX_HEADER and 470 for SFX magic', () => {
    const buf = new Uint8Array(500);
    buf[0] = 0xff;
    buf[1] = 0xf3;
    buf[2] = 0x60;
    buf[3] = 0xc4;
    const [result, skip] = detectAudioFormat(buf);
    expect(result).toBe(DeobfuscationResult.SFX_HEADER);
    expect(skip).toBe(470);
  });

  it('detectAudioFormat returns STANDARD for plain RIFF', () => {
    const buf = new Uint8Array(20);
    buf[0] = 0x52;
    buf[1] = 0x49;
    buf[2] = 0x46;
    buf[3] = 0x46;
    const [result, skip] = detectAudioFormat(buf);
    expect(result).toBe(DeobfuscationResult.STANDARD);
    expect(skip).toBe(0);
  });

  it('deobfuscateAudio strips SFX header', () => {
    const payload = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4]);
    const withSfx = obfuscateAudio(payload, 'SFX');
    expect(withSfx.length).toBe(470 + payload.length);
    const stripped = deobfuscateAudio(withSfx);
    expect(stripped.length).toBe(payload.length);
    expect(stripped[0]).toBe(0x52);
  });

  it('obfuscateAudio SFX prepends 470-byte header', () => {
    const data = new Uint8Array(10);
    const out = obfuscateAudio(data, 'SFX');
    expect(out.length).toBe(470 + 10);
    expect(out[0]).toBe(0xff);
    expect(out[1]).toBe(0xf3);
    expect(out[2]).toBe(0x60);
    expect(out[3]).toBe(0xc4);
  });

  it('obfuscateAudio VO prepends 20-byte header', () => {
    const data = new Uint8Array(10);
    const out = obfuscateAudio(data, 'VO');
    expect(out.length).toBe(20 + 10);
    expect(out[0]).toBe(0x52);
    expect(out[1]).toBe(0x49);
    expect(out[2]).toBe(0x46);
    expect(out[3]).toBe(0x46);
  });

  it('getPlayableBytes returns clean RIFF/WAVE without game headers', () => {
    const wav = new WAVObject();
    wav.data = new Uint8Array(8);
    const playable = wav.getPlayableBytes();
    expect(playable).toBeInstanceOf(Uint8Array);
    expect(playable.length).toBeGreaterThan(8);
    expect(playable[0]).toBe(0x52);
    expect(playable[1]).toBe(0x49);
    expect(playable[2]).toBe(0x46);
    expect(playable[3]).toBe(0x46);
  });

  it('getExportExtension returns wav for WAVE and mp3 for MP3', () => {
    const wav = new WAVObject();
    expect(wav.getExportExtension()).toBe('wav');
    wav.audioFormat = AudioFileAudioType.MP3;
    expect(wav.getExportExtension()).toBe('mp3');
  });
});
