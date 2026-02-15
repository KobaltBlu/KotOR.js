import { BinkAudioPacket, BinkAudioTrackInfo, BinkFormatError, BinkFrame, BinkFrameIndexEntry, BinkHeader, BinkVideoInfo, BINK_AUD_FLAGS, BINK_FLAGS, Rational } from './binktypes';
import { readFourCCLE, readU16LE, readU32LE } from './uint';
import { BitReaderLE, BitReaderBE } from './bitreader';
import { readTree } from './vlc';

function isSMUS(tag: string): boolean {
  return tag === 'SMUS';
}

function isBink2(tag: string): boolean {
  return tag.startsWith('KB2');
}

export class BinkDemuxer {
  private view: DataView;
  private bytes: Uint8Array;
  private header!: BinkHeader;

  // Maintain running PTS (in samples) per audio track, FFmpeg-style
  private trackPtsSamples: number[] = [];
  // One-shot info to help users diagnose layout
  private warnedVideoFirst = false;

  constructor(private buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
  }

  getHeader(): BinkHeader {
    if (!this.header) {
      this.header = this.parseHeader();
      this.trackPtsSamples = new Array(this.header.audioTracks.length).fill(0);
    }
    return this.header;
  }

  // Parse BIK container header and frame index
  private parseHeader(): BinkHeader {
    const view = this.view;
    const fileLen = view.byteLength;
    let off = 0;

    // Handle optional SMUSH wrapper: skip 512-byte blocks until we see 'BIK*'
    let smushSkips = 0;
    let tag = readFourCCLE(view, off);
    if (isSMUS(tag)) {
      while (off + 512 <= fileLen) {
        smushSkips += 512;
        off += 512 - 4; // we've already read 4 bytes of this block
        tag = readFourCCLE(view, off);
        if (tag.startsWith('BIK') || tag.startsWith('KB2')) break;
        off += 4;
      }
      if (!(tag.startsWith('BIK') || tag.startsWith('KB2'))) {
        throw new BinkFormatError('Invalid SMUSH header: BIK not found');
      }
    } else {
      off = 0;
      tag = readFourCCLE(view, off);
    }

    const codecTag = tag; // e.g., 'BIKi'
    const versionChar = codecTag.charAt(3);
    off += 4;

    const file_size_le = readU32LE(view, off); off += 4; // ffmpeg adds 8 to get file size; we'll keep raw
    const frames = readU32LE(view, off); off += 4;
    if (frames > 1_000_000) throw new BinkFormatError('Too many frames (header corrupt)');

    const maxFrameSize = readU32LE(view, off); off += 4;
    const _largestCheck = readU32LE(view, off); off += 4; // skipped by ffmpeg

    const width = readU32LE(view, off); off += 4;
    const height = readU32LE(view, off); off += 4;
    if (width <= 0 || height <= 0 || width > 7680 || height > 4800) {
      throw new BinkFormatError(`Invalid resolution ${width}x${height}`);
    }

    const fps_num = readU32LE(view, off); off += 4;
    const fps_den = readU32LE(view, off); off += 4;
    if (fps_num === 0 || fps_den === 0) throw new BinkFormatError('Invalid fps');

    const fps: Rational = { num: fps_num, den: fps_den };

    // 4-byte extradata (flags)
    const extradataFlags = readU32LE(view, off); off += 4;
    const hasAlpha = (extradataFlags & BINK_FLAGS.ALPHA) !== 0;
    const grayscale = (extradataFlags & BINK_FLAGS.GRAY) !== 0;

    const numAudioTracks = readU32LE(view, off); off += 4;

    const signatureLE = codecTag.substring(0, 3); // 'BIK' or 'KB2'

    // Conditional skip of unknown 4-byte field for late revisions
    if ((signatureLE === 'BIK' && versionChar === 'k') ||
        (signatureLE === 'KB2' && (versionChar === 'i' || versionChar === 'j' || versionChar === 'k'))) {
      off += 4;
    }

    const audioTracks: BinkAudioTrackInfo[] = [];
    if (numAudioTracks > 0) {
      if (numAudioTracks > 256) throw new BinkFormatError('Too many audio tracks');
      // skip max decoded sizes
      off += 4 * numAudioTracks;

      // Per-track params
      for (let i = 0; i < numAudioTracks; i++) {
        const sampleRate = readU16LE(view, off); off += 2;
        const flags = readU16LE(view, off); off += 2;
        const stereo = (flags & BINK_AUD_FLAGS.STEREO) !== 0;
        const useDCT = (flags & BINK_AUD_FLAGS.USE_DCT) !== 0;
        const prefer16 = (flags & BINK_AUD_FLAGS.PREFER_16BITS) !== 0;
        const extradata = new Uint8Array(4);
        extradata[0] = codecTag.charCodeAt(0);
        extradata[1] = codecTag.charCodeAt(1);
        extradata[2] = codecTag.charCodeAt(2);
        extradata[3] = codecTag.charCodeAt(3);
        audioTracks.push({ id: 0, sampleRate, stereo, useDCT, prefer16Bits: prefer16, extradata });
      }
      // Track IDs
      for (let i = 0; i < numAudioTracks; i++) {
        const id = readU32LE(view, off); off += 4;
        audioTracks[i].id = id;
      }
    }

    // Frame index table
    const index: BinkFrameIndexEntry[] = [];
    let next_pos = readU32LE(view, off); off += 4;
    let next_keyframe_flag = 1; // first frame is keyframe
    for (let i = 0; i < frames; i++) {
      let pos = next_pos;
      const keyframe = next_keyframe_flag;
      if (i === frames - 1) {
        next_pos = (file_size_le + 8) >>> 0; // end sentinel
        next_keyframe_flag = 0;
      } else {
        next_pos = readU32LE(view, off); off += 4;
        next_keyframe_flag = next_pos & 1;
      }
      pos &= ~1; const cleanNext = next_pos & ~1;
      if (cleanNext <= pos) throw new BinkFormatError('Invalid frame index table ordering');
      index.push({ pos, size: cleanNext - pos, keyframe: !!keyframe });
    }

    const video: BinkVideoInfo = {
      codecTag,
      versionChar,
      width,
      height,
      frames,
      fps,
      extradataFlags,
      hasAlpha,
      grayscale,
      isBink2: isBink2(codecTag),
      smushSkips,
    };

    return {
      fileSizeLE: file_size_le + 8, // match ffmpeg semantics
      maxFrameSize: maxFrameSize,
      video,
      audioTracks,
      index,
    };
  }

  // Lightweight structural check: does this payload look like a Bink1 video packet header?
  // We read the same sequence of trees as PlaneContext.readAllTrees() for one plane (no row data).
  public validateVideoHeader(pkt: Uint8Array, versionChar: string, hasAlpha: boolean, width: number, height: number): boolean {
    try {
      const br = new BitReaderLE(pkt);
      // For revisions >= 'i', a 32-bit pad precedes the planes block
      if (versionChar >= 'i') br.skipBits(32);
      // Trees are read in id order with COLORS (id=2) special-casing the 16 high-nibble trees
      // BLOCK_TYPES
      readTree(br);
      // SUB_BLOCK_TYPES
      readTree(br);
      // COLORS: 16 high trees, then COLORS tree
      for (let i = 0; i < 16; i++) readTree(br);
      readTree(br);
      // PATTERN, X_OFF, Y_OFF
      readTree(br);
      readTree(br);
      readTree(br);
      // INTRA_DC and INTER_DC have no trees (delta-coded directly)
      // RUN
      readTree(br);
      // Additionally, read first row's bundle lengths (t) to ensure we actually have data for a row
      const av_log2_ts = (x: number) => { let r = 0; while (x >>> 1) { x >>>= 1; r++; } return r; };
      const widthAligned = (width + 7) & ~7;
      const bw = (width + 7) >> 3;
      const blen  = av_log2_ts((widthAligned >> 3) + 511) + 1;
      const sblen = av_log2_ts((widthAligned >> 4) + 511) + 1;
      const clen  = av_log2_ts(bw * 64 + 511) + 1;
      const patlen= av_log2_ts((bw << 3) + 511) + 1;
      const mvlen = av_log2_ts((widthAligned >> 3) + 511) + 1;
      const runlen= av_log2_ts(bw * 48 + 511) + 1;
      // Order: BLOCK_TYPES, SUB_BLOCK_TYPES, COLORS, PATTERN, X_OFF, Y_OFF, INTRA_DC, INTER_DC, RUN
      br.readBits(blen);
      br.readBits(sblen);
      br.readBits(clen);
      br.readBits(patlen);
      br.readBits(mvlen);
      br.readBits(mvlen);
      br.readBits(mvlen);
      br.readBits(mvlen);
      br.readBits(runlen);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Return frame payload broken into audio subpackets and video packet
  getFrame(frameIndex: number, opts?: { forceVideoFirst?: boolean }): BinkFrame {
    const h = this.getHeader();
    if (frameIndex < 0 || frameIndex >= h.video.frames) {
      throw new RangeError(`frameIndex out of range: ${frameIndex}`);
    }
    const entry = h.index[frameIndex];
    const base = entry.pos + h.video.smushSkips; // account for SMUS wrapper
    let off = base;
    const end = base + entry.size;

    const audio: BinkAudioPacket[] = [];
    const trackCount = h.audioTracks.length;

    // Strategy:
    // 1) Try strict audio-first (don’t commit PTS yet). If remainder > 0, validate it as a video header.
    // 2) If invalid, try video-first (entire payload). If still invalid, mark as video-noop.

    // If caller forces video-first, skip audio-first attempt entirely
    if (opts?.forceVideoFirst) {
      const allVideoForced = this.bytes.subarray(off, end);
      if (this.validateVideoHeader(allVideoForced, h.video.versionChar, h.video.hasAlpha, h.video.width, h.video.height)) {
        for (let t = 0; t < trackCount; t++) {
          audio.push({ trackIndex: t, offset: off, size: 0, data: new Uint8Array(), ptsSamples: this.trackPtsSamples[t] | 0 });
        }
        const video = { offset: off, size: end - off, keyframe: h.index[frameIndex].keyframe, data: allVideoForced, pts: frameIndex };
        return { frameIndex, audio, video };
      }
      // Forced but invalid: emit no-op video
      for (let t = 0; t < trackCount; t++) {
        audio.push({ trackIndex: t, offset: off, size: 0, data: new Uint8Array(), ptsSamples: this.trackPtsSamples[t] | 0 });
      }
      // eslint-disable-next-line no-console
      console.warn('[BINK][DEMUX] Forced video-first invalid; emitting video-noop for frame', frameIndex);
      return { frameIndex, audio, video: { offset: end, size: 0, keyframe: h.index[frameIndex].keyframe, data: new Uint8Array(), pts: frameIndex } };
    }

    // Attempt strict audio-first
    let afParsed = true;
    let tempOff = off;
    const tempAudio: BinkAudioPacket[] = [];
    const tempPts = this.trackPtsSamples.slice();
    let totalAudioBytes = 0;

    if (trackCount > 0) {
      for (let t = 0; t < trackCount; t++) {
        if (tempOff + 4 > end) { afParsed = false; break; }
        const audioSize = readU32LE(this.view, tempOff); tempOff += 4;
        if (audioSize < 0 || audioSize > (end - tempOff)) { afParsed = false; break; }
        const pktOffset = tempOff;
        const data = this.bytes.subarray(pktOffset, pktOffset + Math.max(0, audioSize));
        const pts = tempPts[t] | 0;
        if (audioSize >= 4) {
          const reportedBytes = readU32LE(this.view, tempOff);
          const ch = h.audioTracks[t].stereo ? 2 : 1;
          if (reportedBytes > 0 && Number.isFinite(reportedBytes)) {
            const samples = Math.floor(reportedBytes / (2 * ch));
            tempPts[t] = (tempPts[t] | 0) + samples;
          }
        }
        tempAudio.push({ trackIndex: t, offset: pktOffset, size: audioSize, data, ptsSamples: pts });
        tempOff += audioSize;
        totalAudioBytes += 4 + audioSize;
      }
    }

    if (afParsed) {
      const rem = end - (off + totalAudioBytes);
      if (rem === 0) {
        // Audio-only frame: commit audio, no video payload
        for (const a of tempAudio) audio.push(a);
        this.trackPtsSamples = tempPts;
        const video = { offset: end, size: 0, keyframe: h.index[frameIndex].keyframe, data: new Uint8Array(), pts: frameIndex };
        return { frameIndex, audio, video };
      }
      if (rem > 0) {
        const candidate = this.bytes.subarray(off + totalAudioBytes, end);
        const valid = this.validateVideoHeader(candidate, h.video.versionChar, h.video.hasAlpha, h.video.width, h.video.height);
        if (valid) {
          // Accept audio-first; commit audio and PTS
          for (const a of tempAudio) audio.push(a);
          this.trackPtsSamples = tempPts;
          const video = { offset: off + totalAudioBytes, size: rem, keyframe: h.index[frameIndex].keyframe, data: candidate, pts: frameIndex };
          return { frameIndex, audio, video };
        }
      }
      // Audio-first plausible but video remainder invalid — fall back to video-first
    }

    // Video-first: entire frame payload is the video packet, audio stubs only
    if (trackCount > 0 && !this.warnedVideoFirst) {
      // eslint-disable-next-line no-console
      console.warn('[BINK][DEMUX] Falling back to video-first layout for this frame.');
      this.warnedVideoFirst = true;
    }
    const allVideo = this.bytes.subarray(off, end);
    if (this.validateVideoHeader(allVideo, h.video.versionChar, h.video.hasAlpha, h.video.width, h.video.height)) {
      for (let t = 0; t < trackCount; t++) {
        audio.push({ trackIndex: t, offset: off, size: 0, data: new Uint8Array(), ptsSamples: this.trackPtsSamples[t] | 0 });
      }
      const video = { offset: off, size: end - off, keyframe: h.index[frameIndex].keyframe, data: allVideo, pts: frameIndex };
      return { frameIndex, audio, video };
    }

    // Unknown layout: avoid decoder crash — emit audio-first if parsed (commit PTS), but no video
    if (afParsed) {
      for (const a of tempAudio) audio.push(a);
      this.trackPtsSamples = tempPts;
    } else {
      for (let t = 0; t < trackCount; t++) {
        audio.push({ trackIndex: t, offset: off, size: 0, data: new Uint8Array(), ptsSamples: this.trackPtsSamples[t] | 0 });
      }
    }
    // eslint-disable-next-line no-console
    console.warn('[BINK][DEMUX] Unrecognized frame layout; treating as video-noop to preserve sync (frame', frameIndex, ').');
    const video = { offset: end, size: 0, keyframe: h.index[frameIndex].keyframe, data: new Uint8Array(), pts: frameIndex };
    return { frameIndex, audio, video };
  }

  // Helper to iterate frames in presentation order
  *frames(): IterableIterator<BinkFrame> {
    const count = this.getHeader().video.frames;
    for (let i = 0; i < count; i++) {
      yield this.getFrame(i);
    }
  }
}
