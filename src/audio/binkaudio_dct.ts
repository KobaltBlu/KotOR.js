import { BitReaderLE } from '../video/BitReaderLE';

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
  100, 200, 300, 400, 510, 630, 770, 920,
  1080, 1270, 1480, 1720, 2000, 2320, 2700, 3150,
  3700, 4400, 5300, 6400, 7700, 9500, 12000, 15500,
  24500,
];

// rle lengths table from FFmpeg
const rle_length_tab: number[] = [
  2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 32, 64,
];

export interface BinkAudioDCTConfig {
  sampleRate: number;
  channels: number; // expect 2 for your files
  versionChar: string; // e.g. 'i' for BIKi
}

export class BinkAudioDCTDecoder {
  readonly frameLenBits: number;
  readonly frameLen: number;
  readonly overlapLen: number; // frame_len/16
  readonly blockSize: number;  // (frame_len - overlap_len) * min(2, channels)
  readonly root: number;
  readonly numBands: number;
  readonly bands: number[]; // length numBands+1, with bands[numBands]=frameLen
  readonly quantTable: Float32Array; // 96 entries

  private first = true;
  private previous: Float32Array[]; // [ch][overlapLen]
  private outBuffers: Float32Array[] = [];
  private coeffs!: Float32Array;
  private quant!: Float32Array;
  private idctOut!: Float32Array;

  constructor(private cfg: BinkAudioDCTConfig) {
    const { sampleRate, channels } = cfg;

    // frame_len_bits
    let frame_len_bits: number;
    if (sampleRate < 22050) frame_len_bits = 9; else if (sampleRate < 44100) frame_len_bits = 10; else frame_len_bits = 11;
    this.frameLenBits = frame_len_bits;
    this.frameLen = 1 << frame_len_bits; // e.g., 2048 for 44.1 kHz
    this.overlapLen = this.frameLen >> 4;  // /16
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
    const frameLen = this.frameLen;
    for (let ch = 0; ch < channels; ch++) this.outBuffers.push(new Float32Array(frameLen));
    this.coeffs = new Float32Array(frameLen);
    this.quant = new Float32Array(25);
    this.idctOut = new Float32Array(frameLen);
  }

  // Decode one Bink Audio DCT packet payload (including leading reported size field)
  // Returns per-channel Float32 samples (length frameLen)
  decodePacket(pkt: Uint8Array): Float32Array[] {
    const { channels } = this.cfg;
    const out = this.outBuffers;
    const coeffs = this.coeffs;
    const quant = this.quant;

    const br = new BitReaderLE(pkt);
    br.skipBits(32);

    const version_b = false;

    // Per FFmpeg: if (use_dct) skip 2 bits ONCE per block (before channel loop)
    if (br.bitsLeft() < 2) throw new RangeError('bitstream underrun: dct header');
    br.skipBits(2);

    for (let ch = 0; ch < channels; ch++) {
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
        const v = br.readBits(8) & 0xFF;
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

      coeffs[0] /= 0.5;
      this.idctIIIInto(coeffs, this.idctOut);
      out[ch].set(this.idctOut);
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
    // Return copies so playback queue is not overwritten by the next decode
    const result: Float32Array[] = new Array(channels);
    for (let ch = 0; ch < channels; ch++) result[ch] = out[ch].slice(0);
    return result;
  }

  // Read float as in FFmpeg get_float(): 5-bit power and 23-bit mantissa, with sign bit afterwards.
  private readFloat(br: BitReaderLE): number {
    if (br.bitsLeft() < 1 + 5 + 23) throw new RangeError('bitstream underrun: readFloat');
    const power = br.readBits(5);
    const mant = br.readBits(23);
    let f = (Math as any).ldexp ? (Math as any).ldexp(mant, power - 23) : (mant * Math.pow(2, power - 23));
    if (br.readBit()) f = -f;
    return f;
  }

  // IDCT-III into reusable buffer to avoid per-packet allocation.
  private _cosTable?: Float32Array;
  private idctIIIInto(X: Float32Array, out: Float32Array): void {
    const N = this.frameLen;
    if (!this._cosTable) {
      const tab = new Float32Array(N * N);
      const piOverN = Math.PI / N;
      for (let n = 0; n < N; n++) {
        const phi = (n + 0.5) * piOverN;
        for (let k = 0; k < N; k++) tab[n * N + k] = Math.cos(phi * k);
      }
      this._cosTable = tab;
    }
    const tab = this._cosTable!;
    const scale = 1 / N;
    for (let n = 0; n < N; n++) {
      let sum = 0;
      const base = n * N;
      for (let k = 0; k < N; k++) sum += X[k] * tab[base + k];
      let v = sum * scale;
      if (v > 1) v = 1; else if (v < -1) v = -1;
      out[n] = v;
    }
  }
}
