import { AudioFileAudioType } from '@/enums/audio/AudioFileAudioType';
import { AudioFileWaveEncoding } from '@/enums/audio/AudioFileWaveEncoding';
import { BinaryReader } from '@/utility/binary/BinaryReader';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';
import {
  objectToTOML,
  objectToXML,
  objectToYAML,
  tomlToObject,
  xmlToObject,
  yamlToObject,
} from '@/utility/FormatSerialization';

/**
 * KotOR WAV type: VO = voice (streamwaves), SFX = sound effects (streammusic with 470-byte header).
 * Wraps standard RIFF/WAVE payloads after stripping KotOR-specific prefixes (resource kind 4 .wav in data files).
 */
export enum WAVType {
  VO = 1,
  SFX = 2,
}

/** Result of audio format detection. */
export enum DeobfuscationResult {
  /** Standard RIFF/WAVE, no header to skip. */
  STANDARD = 0,
  /** SFX 470-byte header removed; payload is WAVE. */
  SFX_HEADER = 1,
  /** MP3-in-WAV 58-byte header removed; payload is MP3. */
  MP3_IN_WAV = 2,
}

/** SFX obfuscation magic bytes. */
export const SFX_MAGIC = new Uint8Array([0xff, 0xf3, 0x60, 0xc4]);
/** RIFF magic "RIFF". */
export const RIFF_MAGIC = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
/** SFX header size (skip this many bytes to get to WAVE). */
export const SFX_HEADER_LEN = 470;
/** VO duplicate-RIFF header size. */
export const VO_HEADER_LEN = 20;
/** MP3-in-WAV riff size; when riffSize === 50, skip 58 bytes to get MP3. */
export const MP3_RIFF_SIZE = 50;
export const MP3_HEADER_SKIP = 58;

const SFX_HEADER = SFX_MAGIC;
const RIFF_HEADER = RIFF_MAGIC;

function bytesMatchAt(haystack: Uint8Array, offset: number, needle: Uint8Array): boolean {
  if (haystack.length < offset + needle.length) {
    return false;
  }
  for (let i = 0; i < needle.length; i++) {
    if (haystack[offset + i] !== needle[i]) {
      return false;
    }
  }
  return true;
}

/**
 * WAV resource data.
 * For playback use AudioFile; use WAVObject for read/edit/save of WAV resources.
 */
export class WAVObject {
  wavType: WAVType = WAVType.VO;
  audioFormat: AudioFileAudioType = AudioFileAudioType.WAVE;
  encoding: number = AudioFileWaveEncoding.PCM;
  channels: number = 1;
  sampleRate: number = 44100;
  bitsPerSample: number = 16;
  bytesPerSec: number = 0;
  blockAlign: number = 0;
  data: Uint8Array = new Uint8Array(0);

  /** Raw buffer as read from file (before deobfuscation). Set by read(). */
  rawBuffer: Uint8Array | null = null;

  constructor(buffer?: Uint8Array) {
    if (buffer) this.read(buffer);
  }

  /** Load from binary. Detects SFX obfuscation and MP3-in-WAV. */
  read(buffer: Uint8Array): void {
    this.rawBuffer = buffer;
    if (buffer.length < 8) return;

    const br = new BinaryReader(buffer);
    const flag = br.readBytes(4);
    const riffSize = br.readUInt32();
    br.seek(0);

    const match = (a: Uint8Array, b: Uint8Array) => a.length >= b.length && b.every((v, i) => a[i] === v);

    if (match(flag, SFX_HEADER)) {
      this.wavType = WAVType.SFX;
      const after = buffer.slice(SFX_HEADER_LEN);
      this.parseRiffWave(after);
      this.data = this.extractDataChunk(after);
      return;
    }

    if (match(flag, RIFF_HEADER)) {
      if (buffer.length >= VO_HEADER_LEN + 4 && bytesMatchAt(buffer, VO_HEADER_LEN, RIFF_MAGIC)) {
        this.wavType = WAVType.VO;
        const after = buffer.slice(VO_HEADER_LEN);
        this.parseRiffWave(after);
        this.data = this.extractDataChunk(after);
        return;
      }
      if (riffSize === MP3_RIFF_SIZE) {
        this.audioFormat = AudioFileAudioType.MP3;
        this.data = buffer.slice(MP3_HEADER_SKIP);
        return;
      }
      this.parseRiffWave(buffer);
      this.data = this.extractDataChunk(buffer);
      return;
    }

    this.audioFormat = AudioFileAudioType.MP3;
    this.data = buffer;
  }

  private parseRiffWave(buffer: Uint8Array): void {
    const br = new BinaryReader(buffer);
    br.readChars(4); // RIFF
    br.readUInt32(); // size
    if (br.readChars(4) !== 'WAVE') return;
    while (br.position < buffer.length - 8) {
      const chunkId = br.readChars(4);
      const chunkSize = br.readUInt32();
      if (chunkId === 'fmt ') {
        const fmtSize = chunkSize;
        this.encoding = br.readUInt16();
        this.channels = br.readUInt16();
        this.sampleRate = br.readUInt32();
        this.bytesPerSec = br.readUInt32();
        this.blockAlign = br.readUInt16();
        this.bitsPerSample = br.readUInt16();
        if (fmtSize > 16) br.skip(fmtSize - 16);
      } else if (chunkId === 'data') {
        break;
      } else {
        br.skip(chunkSize);
      }
    }
  }

  private extractDataChunk(buffer: Uint8Array): Uint8Array {
    const br = new BinaryReader(buffer);
    br.readChars(4);
    br.readUInt32();
    if (br.readChars(4) !== 'WAVE') return new Uint8Array(0);
    while (br.position < buffer.length - 8) {
      const chunkId = br.readChars(4);
      const chunkSize = br.readUInt32();
      if (chunkId === 'data') {
        return buffer.slice(br.position, br.position + chunkSize);
      }
      br.skip(chunkSize);
    }
    return new Uint8Array(0);
  }

  getEncodingEnum(): AudioFileWaveEncoding | null {
    if (this.encoding === AudioFileWaveEncoding.PCM) return AudioFileWaveEncoding.PCM;
    if (this.encoding === AudioFileWaveEncoding.ADPCM) return AudioFileWaveEncoding.ADPCM;
    return null;
  }

  isPcm(): boolean {
    return this.encoding === AudioFileWaveEncoding.PCM;
  }

  isAdpcm(): boolean {
    return this.encoding === AudioFileWaveEncoding.ADPCM;
  }

  isMp3(): boolean {
    return this.audioFormat === AudioFileAudioType.MP3;
  }

  /**
   * Return file extension for this audio's actual format.
   * Use when saving to temp files or export.
   */
  getExportExtension(): 'mp3' | 'wav' {
    return this.audioFormat === AudioFileAudioType.MP3 ? 'mp3' : 'wav';
  }

  /**
   * Return playable audio bytes (clean RIFF/WAVE or raw MP3) for media players.
   * No game obfuscation headers; suitable for audio playback components.
   */
  getPlayableBytes(): Uint8Array {
    if (this.audioFormat === AudioFileAudioType.MP3) return this.data;
    const dataLen = this.data.length;
    const waveChunkLen = 36 + dataLen;
    const riffLen = 4 + waveChunkLen;
    const bw = new BinaryWriter(new Uint8Array(8 + waveChunkLen));
    bw.writeChars('RIFF');
    bw.writeUInt32(riffLen);
    bw.writeChars('WAVE');
    bw.writeChars('fmt ');
    bw.writeUInt32(16);
    bw.writeUInt16(this.encoding);
    bw.writeUInt16(this.channels);
    bw.writeUInt32(this.sampleRate);
    bw.writeUInt32(this.bytesPerSec || this.sampleRate * this.channels * (this.bitsPerSample >> 3));
    bw.writeUInt16(this.blockAlign || this.channels * (this.bitsPerSample >> 3));
    bw.writeUInt16(this.bitsPerSample);
    bw.writeChars('data');
    bw.writeUInt32(dataLen);
    bw.writeBytes(this.data);
    return bw.buffer;
  }

  toJSON(): {
    wavType: number;
    audioFormat: number;
    encoding: number;
    channels: number;
    sampleRate: number;
    bitsPerSample: number;
    dataBase64: string;
  } {
    const d = this.data ?? new Uint8Array(0);
    const b64 = d.length
      ? typeof Buffer !== 'undefined'
        ? Buffer.from(d).toString('base64')
        : btoa(String.fromCharCode(...d))
      : '';
    return {
      wavType: this.wavType ?? WAVType.VO,
      audioFormat: this.audioFormat ?? 1,
      encoding: this.encoding ?? 1,
      channels: this.channels ?? 1,
      sampleRate: this.sampleRate ?? 44100,
      bitsPerSample: this.bitsPerSample ?? 16,
      dataBase64: b64,
    };
  }

  fromJSON(json: string | ReturnType<WAVObject['toJSON']>): void {
    const obj = typeof json === 'string' ? (JSON.parse(json) as ReturnType<WAVObject['toJSON']>) : json;
    this.wavType = obj.wavType ?? WAVType.VO;
    this.audioFormat = obj.audioFormat ?? 1;
    this.encoding = obj.encoding ?? 1;
    this.channels = obj.channels ?? 1;
    this.sampleRate = obj.sampleRate ?? 44100;
    this.bitsPerSample = obj.bitsPerSample ?? 16;
    if (obj.dataBase64) {
      this.data =
        typeof Buffer !== 'undefined'
          ? new Uint8Array(Buffer.from(obj.dataBase64, 'base64'))
          : Uint8Array.from(atob(obj.dataBase64), (c) => c.charCodeAt(0));
    } else this.data = new Uint8Array(0);
  }

  toXML(): string {
    return objectToXML(this.toJSON());
  }
  fromXML(xml: string): void {
    this.fromJSON(xmlToObject(xml) as ReturnType<WAVObject['toJSON']>);
  }
  toYAML(): string {
    return objectToYAML(this.toJSON());
  }
  fromYAML(yaml: string): void {
    this.fromJSON(yamlToObject(yaml) as ReturnType<WAVObject['toJSON']>);
  }
  toTOML(): string {
    return objectToTOML(this.toJSON());
  }
  fromTOML(toml: string): void {
    this.fromJSON(tomlToObject(toml) as ReturnType<WAVObject['toJSON']>);
  }

  /**
   * Write back to buffer. If wavType is SFX, prepends the 470-byte obfuscation header.
   */
  toBuffer(): Uint8Array {
    if (this.audioFormat === AudioFileAudioType.MP3 && this.wavType === WAVType.VO) {
      const bw = new BinaryWriter(new Uint8Array(58 + this.data.length));
      bw.writeChars('RIFF');
      bw.writeUInt32(50);
      bw.writeChars('WAVE');
      bw.writeBytes(new Uint8Array(50));
      bw.writeBytes(this.data);
      return bw.buffer;
    }
    if (this.audioFormat === AudioFileAudioType.MP3) {
      return this.data;
    }
    const dataLen = this.data.length;
    const waveChunkLen = 36 + dataLen;
    const riffLen = 4 + waveChunkLen;
    const bw = new BinaryWriter(new Uint8Array(8 + waveChunkLen));
    bw.writeChars('RIFF');
    bw.writeUInt32(riffLen);
    bw.writeChars('WAVE');
    bw.writeChars('fmt ');
    bw.writeUInt32(16);
    bw.writeUInt16(this.encoding);
    bw.writeUInt16(this.channels);
    bw.writeUInt32(this.sampleRate);
    bw.writeUInt32(this.bytesPerSec || this.sampleRate * this.channels * (this.bitsPerSample >> 3));
    bw.writeUInt16(this.blockAlign || this.channels * (this.bitsPerSample >> 3));
    bw.writeUInt16(this.bitsPerSample);
    bw.writeChars('data');
    bw.writeUInt32(dataLen);
    bw.writeBytes(this.data);
    let out = bw.buffer;
    if (this.wavType === WAVType.SFX) {
      const full = new Uint8Array(SFX_HEADER_LEN + out.length);
      full.set(SFX_HEADER);
      full.set(new Uint8Array(SFX_HEADER_LEN - 4), 4);
      full.set(out, SFX_HEADER_LEN);
      out = full;
    }
    if (this.wavType === WAVType.VO) {
      const full = new Uint8Array(VO_HEADER_LEN + out.length);
      full.set(RIFF_HEADER);
      full.set(new Uint8Array(VO_HEADER_LEN - 4), 4);
      full.set(out, VO_HEADER_LEN);
      out = full;
    }
    return out;
  }
}

/** Match (a has at least b.length bytes and first b.length bytes equal b). */
function matchBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length < b.length) return false;
  for (let i = 0; i < b.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Detect KotOR audio format and header size to skip.
 * Returns [result, bytesToSkip].
 */
export function detectAudioFormat(data: Uint8Array): [DeobfuscationResult, number] {
  if (data.length < 12) return [DeobfuscationResult.STANDARD, 0];
  if (matchBytes(data, SFX_MAGIC)) return [DeobfuscationResult.SFX_HEADER, SFX_HEADER_LEN];
  if (matchBytes(data, RIFF_HEADER)) {
    if (data.length >= VO_HEADER_LEN + 4 && bytesMatchAt(data, VO_HEADER_LEN, RIFF_MAGIC)) {
      return [DeobfuscationResult.STANDARD, VO_HEADER_LEN];
    }
    const riffSize = data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24);
    if (riffSize === MP3_RIFF_SIZE) return [DeobfuscationResult.MP3_IN_WAV, MP3_HEADER_SKIP];
    return [DeobfuscationResult.STANDARD, 0];
  }
  return [DeobfuscationResult.STANDARD, 0];
}

/**
 * Remove KotOR obfuscation headers.
 * Returns cleaned WAVE or MP3 bytes.
 */
export function deobfuscateAudio(data: Uint8Array): Uint8Array {
  const [, skip] = detectAudioFormat(data);
  if (skip > 0 && data.length > skip) return data.slice(skip);
  return data;
}

/**
 * Add a KotOR obfuscation header.
 * wavType: 'SFX' (470-byte header) or 'VO' (20-byte header).
 */
export function obfuscateAudio(data: Uint8Array, wavType: 'SFX' | 'VO'): Uint8Array {
  if (wavType === 'SFX') {
    const out = new Uint8Array(SFX_HEADER_LEN + data.length);
    out.set(SFX_MAGIC);
    out.set(data, SFX_HEADER_LEN);
    return out;
  }
  if (wavType === 'VO') {
    const out = new Uint8Array(VO_HEADER_LEN + data.length);
    out.set(RIFF_HEADER);
    out.set(data, VO_HEADER_LEN);
    return out;
  }
  return data;
}
