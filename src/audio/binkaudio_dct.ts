import { BitReaderLE } from '@/video/BitReaderLE';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FFTCtor = require('fft.js');

/**
 * BinkAudioDCTDecoder class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file BinkAudioDCTDecoder.ts
 * @autthor Lachjames <https://github.com/Lachjames> (Ported from FFmpeg)
 * @author KobaltBlu <https://github.com/KobaltBlu> (Modified for KotOR JS)
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export const WMA_CRITICAL_FREQS: number[] = [
  100, 200, 300, 400, 510, 630, 770, 920, 1080, 1270, 1480, 1720, 2000, 2320, 2700, 3150, 3700, 4400, 5300, 6400, 7700,
  9500, 12000, 15500, 24500,
];

// rle lengths table from FFmpeg
const rle_length_tab: number[] = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 32, 64];

export interface BinkAudioDCTConfig {
  sampleRate: number;
  channels: number; // expect 2 for your files
  versionChar: string; // e.g. 'i' for BIKi
}

export interface DecodedBinkAudioDCTPacket {
  pcm: Float32Array[];
  sampleCount: number;
}

export class BinkAudioDCTDecoder {
  readonly frameLenBits: number;
  readonly frameLen: number;
  readonly overlapLen: number; // frame_len/16
  readonly blockSize: number; // (frame_len - overlap_len) * min(2, channels)
  readonly root: number;
  readonly numBands: number;
  readonly bands: number[]; // length numBands+1, with bands[numBands]=frameLen
  readonly quantTable: Float32Array; // 96 entries

  private first = true;
  private previous: Float32Array[]; // [ch][overlapLen]
  private readonly blockOut: Float32Array[];
  private readonly coeffs: Float32Array;
  private readonly quant: Float32Array;
  private readonly useFFTIdct = true;
  private readonly fftSize: number;
  private readonly fftCos: Float64Array;
  private readonly fftSin: Float64Array;
  private readonly fftScale: number;
  private readonly fft: any;
  private readonly fftIn: Float64Array;
  private readonly fftOut: Float64Array;

  constructor(private cfg: BinkAudioDCTConfig) {
    const { sampleRate, channels } = cfg;

    // frame_len_bits
    let frame_len_bits: number;
    if (sampleRate < 22050) frame_len_bits = 9;
    else if (sampleRate < 44100) frame_len_bits = 10;
    else frame_len_bits = 11;
    this.frameLenBits = frame_len_bits;
    this.frameLen = 1 << frame_len_bits; // e.g., 2048 for 44.1 kHz
    this.overlapLen = this.frameLen >> 4; // /16
    this.blockSize = (this.frameLen - this.overlapLen) * Math.min(2, channels);

    // scaling root for quantization table (matches FFmpeg)
    this.root = this.frameLen / (Math.sqrt(this.frameLen) * 32768.0);

    // quantization table: s->quant_table[i] = exp(i*0.15289164787221953f)*root
    this.quantTable = new Float32Array(96);
    for (let i = 0; i < 96; i++) {
      this.quantTable[i] = Math.exp(i * 0.15289164787221953) * this.root;
    }

    // bands
    const sample_rate_half = Math.floor((sampleRate + 1) / 2);
    let nb = 1;
    for (; nb < 25; nb++) {
      if (sample_rate_half <= WMA_CRITICAL_FREQS[nb - 1]) break;
    }
    this.numBands = nb;
    this.bands = new Array(this.numBands + 1);
    this.bands[0] = 2;
    for (let i = 1; i < this.numBands; i++) {
      this.bands[i] = ((WMA_CRITICAL_FREQS[i - 1] * this.frameLen) / sample_rate_half) & ~1;
    }
    this.bands[this.numBands] = this.frameLen;

    this.previous = new Array(channels);
    for (let ch = 0; ch < channels; ch++) this.previous[ch] = new Float32Array(this.overlapLen);
    this.blockOut = new Array(channels);
    for (let ch = 0; ch < channels; ch++) this.blockOut[ch] = new Float32Array(this.frameLen);
    this.coeffs = new Float32Array(this.frameLen);
    this.quant = new Float32Array(25);

    this.fftSize = this.frameLen << 1;
    this.fftCos = new Float64Array(this.frameLen);
    this.fftSin = new Float64Array(this.frameLen);
    for (let k = 0; k < this.frameLen; k++) {
      const theta = (Math.PI * k) / (this.frameLen << 1);
      this.fftCos[k] = Math.cos(theta);
      this.fftSin[k] = Math.sin(theta);
    }
    this.fft = new FFTCtor(this.fftSize);
    this.fftIn = this.fft.createComplexArray();
    this.fftOut = this.fft.createComplexArray();
    this.fftScale = this.calibrateFFTScale();
  }

  // Decode one Bink Audio DCT packet payload (including leading reported size field)
  // Returns the full playable PCM for all blocks carried by this packet.
  decodePacket(pkt: Uint8Array): DecodedBinkAudioDCTPacket {
    const { channels } = this.cfg;
    const samplesPerBlock = this.frameLen - this.overlapLen;
    const reportedBytes = pkt.length >= 4 ? (pkt[0] | (pkt[1] << 8) | (pkt[2] << 16) | (pkt[3] << 24)) >>> 0 : 0;
    const expectedSampleCount = Math.max(0, Math.floor(reportedBytes / (2 * channels)));

    if (expectedSampleCount === 0) {
      return {
        pcm: new Array(channels).fill(null).map(() => new Float32Array(0)),
        sampleCount: 0,
      };
    }

    const out: Float32Array[] = new Array(channels);
    for (let ch = 0; ch < channels; ch++) out[ch] = new Float32Array(expectedSampleCount);

    const br = new BitReaderLE(pkt);
    // skip reported decompressed byte size (32 bits)
    br.skipBits(32);

    let produced = 0;
    while (produced < expectedSampleCount) {
      const block = this.decodeBlock(br);
      const copyCount = Math.min(samplesPerBlock, expectedSampleCount - produced);
      for (let ch = 0; ch < channels; ch++) {
        out[ch].set(block[ch].subarray(0, copyCount), produced);
      }
      produced += copyCount;
    }

    return {
      pcm: out,
      sampleCount: produced,
    };
  }

  private decodeBlock(br: BitReaderLE): Float32Array[] {
    const { channels } = this.cfg;
    const out = this.blockOut;

    // Bink 'i' -> not version_b
    const version_b = false;

    // Local buffer for frequency coefficients per channel
    const coeffs = this.coeffs;
    const quant = this.quant;

    // Per FFmpeg: if (use_dct) skip 2 bits ONCE per block (before channel loop)
    if (br.bitsLeft() < 2) throw new RangeError('bitstream underrun: dct header');
    br.skipBits(2);

    for (let ch = 0; ch < channels; ch++) {
      coeffs.fill(0);

      // Read first two scalars
      if (version_b) {
        // not used for 'i'
        throw new Error('version_b path not expected for BIKi');
      } else {
        coeffs[0] = this.readFloat(br) * this.root;
        coeffs[1] = this.readFloat(br) * this.root;
      }

      // Read band quant selectors (numBands bytes)
      for (let i = 0; i < this.numBands; i++) {
        if (br.bitsLeft() < 8) throw new Error('bitstream underrun: band quant');
        const v = br.readBits(8) & 0xff;
        quant[i] = this.quantTable[Math.min(v, 95)];
      }

      // Parse coefficients i = 2..frameLen-1
      let i = 2;
      let k = 0;
      let q = quant[0];
      while (i < this.frameLen) {
        // choose block span length j
        let j: number;
        {
          const v = br.readBit();
          if (v) {
            const t = br.readBits(4);
            j = i + rle_length_tab[t] * 8;
          } else {
            j = i + 8;
          }
        }
        if (j > this.frameLen) j = this.frameLen;

        if (br.bitsLeft() < 4) throw new RangeError('bitstream underrun: width');
        const width = br.readBits(4);
        if (width === 0) {
          // zero fill
          for (; i < j; i++) coeffs[i] = 0;
          while (this.bands[k] < i) q = quant[k++];
        } else {
          while (i < j) {
            if (this.bands[k] === i) q = quant[k++];
            if (br.bitsLeft() < width) throw new RangeError('bitstream underrun: coeff');
            const c = br.readBits(width);
            if (c) {
              if (br.bitsLeft() < 1) throw new RangeError('bitstream underrun: sign');
              const sign = br.readBit() ? -1 : 1;
              coeffs[i] = sign * q * c;
            } else {
              coeffs[i] = 0;
            }
            i++;
          }
        }
      }

      // Transform to time domain (DCT-based inverse). FFmpeg uses av_tx DCT with coeffs[0] scaled.
      coeffs[0] /= 0.5; // multiply by 2 (undo 0.5 factor for k=0)
      this.idctIII(coeffs, out[ch]); // writes frameLen samples
    }

    // Align to 32 bits after finishing the block (all channels decoded)
    br.align32();

    // Overlap-add (linear crossfade) across first overlapLen samples
    const count = this.overlapLen * this.cfg.channels;
    for (let ch = 0; ch < this.cfg.channels; ch++) {
      if (!this.first) {
        let j = ch;
        for (let i = 0; i < this.overlapLen; i++, j += this.cfg.channels) {
          out[ch][i] = (this.previous[ch][i] * (count - j) + out[ch][i] * j) / count;
        }
      }
      // Save tail
      this.previous[ch].set(out[ch].subarray(this.frameLen - this.overlapLen));
    }

    this.first = false;
    return out;
  }

  // Read float as in FFmpeg get_float(): 5-bit power and 23-bit mantissa, with sign bit afterwards.
  private readFloat(br: BitReaderLE): number {
    if (br.bitsLeft() < 1 + 5 + 23) throw new RangeError('bitstream underrun: readFloat');
    const power = br.readBits(5);
    const mant = br.readBits(23);
    let f = (Math as any).ldexp ? (Math as any).ldexp(mant, power - 23) : mant * Math.pow(2, power - 23);
    if (br.readBit()) f = -f;
    return f;
  }

  // FFT-accelerated IDCT-III with dense reference fallback.
  private idctIII(X: Float32Array, out: Float32Array): void {
    if (this.useFFTIdct) {
      try {
        this.idctIIIFFT(X, out);
        return;
      } catch {
        // Fallback to exact implementation if FFT backend fails.
      }
    }
    this.idctIIIReference(X, out);
  }

  private idctIIIFFT(X: Float32Array, out: Float32Array): void {
    const N = this.frameLen;
    const fftIn = this.fftIn;
    for (let i = 0; i < this.fftSize << 1; i++) fftIn[i] = 0;

    // Build complex sequence C[k] = X[k] * exp(i*pi*k/(2N)), zero-padded to 2N.
    for (let k = 0; k < N; k++) {
      const v = X[k];
      const off = k << 1;
      fftIn[off] = v * this.fftCos[k];
      fftIn[off + 1] = v * this.fftSin[k];
    }

    this.fft.inverseTransform(this.fftOut, fftIn);

    for (let n = 0; n < N; n++) {
      const re = this.fftOut[n << 1];
      let v = re * this.fftScale;
      if (v > 1) v = 1;
      else if (v < -1) v = -1;
      out[n] = v;
    }
  }

  private idctIIIReference(X: Float32Array, out: Float32Array): void {
    const N = this.frameLen;
    const scale = 1 / N;
    for (let n = 0; n < N; n++) {
      let sum = 0;
      const phi = ((n + 0.5) * Math.PI) / N;
      for (let k = 0; k < N; k++) {
        sum += X[k] * Math.cos(phi * k);
      }
      let v = sum * scale;
      if (v > 1) v = 1;
      else if (v < -1) v = -1;
      out[n] = v;
    }
  }

  private calibrateFFTScale(): number {
    const N = this.frameLen;
    const test = new Float32Array(N);
    const outRef = new Float32Array(N);
    const outFFT = new Float32Array(N);
    test[0] = 2;
    test[1] = 0.5;
    this.idctIIIReference(test, outRef);

    const scaleCandidates = [1, 1 / N, 1 / this.fftSize, 2 / N];
    let best = scaleCandidates[0];
    let bestErr = Number.POSITIVE_INFINITY;
    for (const candidate of scaleCandidates) {
      this.idctIIIFFTWithScale(test, outFFT, candidate);
      let err = 0;
      for (let i = 0; i < N; i++) err += Math.abs(outFFT[i] - outRef[i]);
      if (err < bestErr) {
        bestErr = err;
        best = candidate;
      }
    }
    return best;
  }

  private idctIIIFFTWithScale(X: Float32Array, out: Float32Array, scale: number): void {
    const N = this.frameLen;
    const fftIn = this.fftIn;
    for (let i = 0; i < this.fftSize << 1; i++) fftIn[i] = 0;
    for (let k = 0; k < N; k++) {
      const v = X[k];
      const off = k << 1;
      fftIn[off] = v * this.fftCos[k];
      fftIn[off + 1] = v * this.fftSin[k];
    }
    this.fft.inverseTransform(this.fftOut, fftIn);
    for (let n = 0; n < N; n++) out[n] = this.fftOut[n << 1] * scale;
  }
}
