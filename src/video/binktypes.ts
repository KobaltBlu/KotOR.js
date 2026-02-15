export type FourCC = string; // 4-char tag like 'BIKb' or 'KB2a'

export interface Rational {
  num: number; // numerator
  den: number; // denominator
}

export interface BinkVideoInfo {
  codecTag: FourCC; // little-endian tag read as ASCII
  versionChar: string; // e.g. 'b'..'k' for Bink1, 'a'.. for Bink2
  width: number;
  height: number;
  frames: number; // number of video frames
  fps: Rational; // frames per second as a rational
  extradataFlags: number; // 32-bit flags
  hasAlpha: boolean; // from extradataFlags
  grayscale: boolean; // from extradataFlags
  isBink2: boolean; // KB2*
  smushSkips: number; // bytes skipped due to SMUS blocks in header (multiple of 512)
}

export interface BinkAudioTrackInfo {
  id: number; // stream id from header
  sampleRate: number;
  stereo: boolean; // from flags
  useDCT: boolean; // from flags
  prefer16Bits: boolean; // from flags
  extradata: Uint8Array; // 4-byte copy of video codecTag per ffmpeg impl
}

export interface BinkHeader {
  fileSizeLE: number; // file size reported in header (le + 8 in ffmpeg), not necessarily actual ArrayBuffer length
  maxFrameSize: number; // from header
  video: BinkVideoInfo;
  audioTracks: BinkAudioTrackInfo[];
  // Index table for frames (positions are file offsets relative to start of file)
  index: BinkFrameIndexEntry[];
}

export interface BinkFrameIndexEntry {
  pos: number; // start offset of frame payload (after header), absolute from file start
  size: number; // bytes for this frame (audio subpackets + video packet)
  keyframe: boolean;
}

export interface BinkAudioPacket {
  trackIndex: number; // 0..audioTracks-1
  offset: number; // absolute file offset for start of this audio packet payload
  size: number; // size in bytes of audio payload
  data: Uint8Array; // slice of underlying file bytes
  ptsSamples: number; // accumulated pts in samples for this track at this packet
}

export interface BinkVideoPacket {
  offset: number; // absolute file offset for start of video payload
  size: number;
  keyframe: boolean;
  data: Uint8Array;
  pts: number; // frame index (0-based)
}

export interface BinkFrame {
  frameIndex: number;
  audio: BinkAudioPacket[];
  video: BinkVideoPacket;
}

export class BinkFormatError extends Error {
  constructor(message: string) { super(message); this.name = 'BinkFormatError'; }
}

export const BINK_FLAGS = {
  ALPHA: 0x0010_0000,
  GRAY:  0x0002_0000,
} as const;

export const BINK_AUD_FLAGS = {
  PREFER_16BITS: 0x4000,
  STEREO:        0x2000,
  USE_DCT:       0x1000,
} as const;
