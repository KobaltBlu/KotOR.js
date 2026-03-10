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
  function makeRiffWave(options: {
    channels?: number;
    sampleRate?: number;
    bitsPerSample?: number;
    encoding?: number;
    data?: Uint8Array;
  } = {}): Uint8Array {
    const {
      channels = 1,
      sampleRate = 22050,
      bitsPerSample = 16,
      encoding = 0x01,
      data = new Uint8Array(4),
    } = options;
    const blockAlign = channels * Math.max(bitsPerSample >> 3, 1);
    const byteRate = sampleRate * blockAlign;
    const riff = new Uint8Array(44 + data.length);
    const view = new DataView(riff.buffer);
    const enc = new TextEncoder();
    enc.encodeInto('RIFF', riff);
    view.setUint32(4, 36 + data.length, true);
    enc.encodeInto('WAVE', riff.subarray(8));
    enc.encodeInto('fmt ', riff.subarray(12));
    view.setUint32(16, 16, true);
    view.setUint16(20, encoding, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    enc.encodeInto('data', riff.subarray(36));
    view.setUint32(40, data.length, true);
    riff.set(data, 44);
    return riff;
  }

  it('constructs without buffer', () => {
    const wav = new WAVObject();
    expect(wav.wavType).toBe(WAVType.VO);
    expect(wav.audioFormat).toBe(AudioFileAudioType.WAVE);
    expect(wav.data.length).toBe(0);
  });

  it('detects PCM WAV from minimal RIFF header', () => {
    const riff = makeRiffWave({ sampleRate: 22050, channels: 1, bitsPerSample: 16 });
    const wav = new WAVObject(riff);
    expect(wav.audioFormat).toBe(AudioFileAudioType.WAVE);
    expect(wav.isPcm()).toBe(true);
    expect(wav.sampleRate).toBe(22050);
    expect(wav.channels).toBe(1);
  });

  it('parses stereo and 8-bit WAV metadata', () => {
    const stereo = new WAVObject(makeRiffWave({ channels: 2, sampleRate: 44100, bitsPerSample: 16, data: new Uint8Array(8) }));
    expect(stereo.channels).toBe(2);
    expect(stereo.sampleRate).toBe(44100);
    expect(stereo.bitsPerSample).toBe(16);

    const mono8Bit = new WAVObject(makeRiffWave({ channels: 1, sampleRate: 48000, bitsPerSample: 8, data: new Uint8Array(5) }));
    expect(mono8Bit.channels).toBe(1);
    expect(mono8Bit.sampleRate).toBe(48000);
    expect(mono8Bit.bitsPerSample).toBe(8);
  });

  it('detects SFX obfuscation header', () => {
    const riff = makeRiffWave();
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
    // Use 0-byte data payload so RIFF is exactly 44 bytes: 20+44=64.
    const riff = makeRiffWave({ data: new Uint8Array(0) });
    const enc = new TextEncoder();
    const withVO = new Uint8Array(20 + riff.length);
    enc.encodeInto('RIFF', withVO);
    withVO.set(riff, 20);
    const wav = new WAVObject(withVO);
    expect(wav.wavType).toBe(WAVType.VO);
    expect(wav.audioFormat).toBe(AudioFileAudioType.WAVE);
    const out = wav.toBuffer();
    expect(out.length).toBe(20 + 8 + 36); // VO header(20) + RIFF+size(8) + WAVE+fmt chunk(36)
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

  it('detectAudioFormat returns MP3_IN_WAV for MP3-wrapped RIFF headers', () => {
    const buf = new Uint8Array(64);
    buf[0] = 0x52;
    buf[1] = 0x49;
    buf[2] = 0x46;
    buf[3] = 0x46;
    new DataView(buf.buffer).setUint32(4, 50, true);

    const [result, skip] = detectAudioFormat(buf);
    expect(result).toBe(DeobfuscationResult.MP3_IN_WAV);
    expect(skip).toBe(58);
  });

  it('deobfuscateAudio strips SFX header', () => {
    const payload = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4]);
    const withSfx = obfuscateAudio(payload, 'SFX');
    expect(withSfx.length).toBe(470 + payload.length);
    const stripped = deobfuscateAudio(withSfx);
    expect(stripped.length).toBe(payload.length);
    expect(stripped[0]).toBe(0x52);
  });

  it('deobfuscateAudio strips VO header and leaves standard data intact', () => {
    const payload = makeRiffWave();
    const withVo = obfuscateAudio(payload, 'VO');
    expect(deobfuscateAudio(withVo)).toEqual(payload);
    expect(deobfuscateAudio(payload)).toEqual(payload);
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

  it('getPlayableBytes returns raw MP3 bytes for mp3 audio', () => {
    const wav = new WAVObject();
    wav.audioFormat = AudioFileAudioType.MP3;
    wav.data = new Uint8Array([1, 2, 3, 4]);
    expect(wav.getPlayableBytes()).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('getExportExtension returns wav for WAVE and mp3 for MP3', () => {
    const wav = new WAVObject();
    expect(wav.getExportExtension()).toBe('wav');
    wav.audioFormat = AudioFileAudioType.MP3;
    expect(wav.getExportExtension()).toBe('mp3');
  });

  it('toBuffer preserves SFX and VO wrappers', () => {
    const sfx = new WAVObject(makeRiffWave({ sampleRate: 44100, channels: 1, bitsPerSample: 16 }));
    sfx.wavType = WAVType.SFX;
    const sfxBuffer = sfx.toBuffer();
    expect(sfxBuffer.length).toBeGreaterThan(sfx.data.length);
    expect(sfxBuffer[0]).toBe(0xff);

    const vo = new WAVObject(makeRiffWave());
    vo.wavType = WAVType.VO;
    const voBuffer = vo.toBuffer();
    expect(voBuffer[0]).toBe(0x52);
    expect(voBuffer[20]).toBe(0x52);
  });

  it('getEncodingEnum and codec helpers reflect PCM and ADPCM', () => {
    const wav = new WAVObject(makeRiffWave({ encoding: 0x01 }));
    expect(wav.getEncodingEnum()).toBe(0x01);
    expect(wav.isPcm()).toBe(true);
    expect(wav.isAdpcm()).toBe(false);

    wav.encoding = 0x11;
    expect(wav.getEncodingEnum()).toBe(0x11);
    expect(wav.isPcm()).toBe(false);
    expect(wav.isAdpcm()).toBe(true);
  });

  it('toJSON and fromJSON round-trip audio metadata', () => {
    const wav = new WAVObject(makeRiffWave({ channels: 2, sampleRate: 44100, bitsPerSample: 16, data: new Uint8Array([1, 2, 3, 4]) }));
    wav.wavType = WAVType.SFX;
    const reloaded = new WAVObject();
    reloaded.fromJSON(wav.toJSON());

    expect(reloaded.wavType).toBe(WAVType.SFX);
    expect(reloaded.sampleRate).toBe(44100);
    expect(reloaded.channels).toBe(2);
    expect(reloaded.bitsPerSample).toBe(16);
    expect(reloaded.data).toEqual(new Uint8Array([1, 2, 3, 4]));
  });
});
