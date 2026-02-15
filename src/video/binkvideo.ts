import { BitReaderLE, BitReaderBE } from './bitreader';
import { idctPut, idctAdd, scaleBlock, addPixels8 } from './bink-idct';
import { bink_scan, bink_patterns, bink_intra_quant, bink_inter_quant } from './binkdata';
import { readTree, getHuff, Tree } from './vlc';

export class BinkDecodeError extends Error {
    constructor(message: string, public readonly isTruncated: boolean = false) {
        super(message);
        this.name = 'BinkDecodeError';
    }
}

export interface YUVFrame {
    width: number;
    height: number;
    y: Uint8Array;
    u: Uint8Array;
    v: Uint8Array;
    linesizeY: number;
    linesizeU: number;
    linesizeV: number;
}

export class BinkVideoDecoder {
    private width: number;
    private height: number;
    private version: string;
    private swapPlanes: boolean;
    private hasAlpha: boolean;
    private last?: YUVFrame;
    private frameNum = 0;

    // Reusable buffers to avoid allocations
    private static readonly intraDct = new Int32Array(64);
    private static readonly intraBlk = new Uint8Array(64);
    private static readonly scaledBlk = new Uint8Array(64);
    private static readonly scaledTmp = new Uint8Array(256); // 16*16

    constructor(width: number, height: number, versionChar: string, hasAlpha = false) {
        this.width = width;
        this.height = height;
        this.version = versionChar;
        this.swapPlanes = versionChar >= 'h';
        this.hasAlpha = hasAlpha;
    }

    decodePacketToFrame(pkt: Uint8Array): YUVFrame {
        try {
            const w = this.width, h = this.height;
            const yStride = w, cStride = (w + 1) >> 1;
            // Allocate block-aligned buffers: luma bh*8 rows, chroma bh_chroma*8 rows.
            // This matches FFmpeg's padded allocation and prevents out-of-bounds writes
            // when the block grid extends beyond the visible area.
            const yBh = ((h + 7) >> 3) << 3;           // ceil to 8px rows for luma
            const cBh = ((h + 15) >> 4) << 3;           // ceil to 16px then *8 for chroma block rows
            const y = new Uint8Array(yStride * yBh);
            const u = new Uint8Array(cStride * cBh);
            const v = new Uint8Array(cStride * cBh);
            const frame: YUVFrame = { width: w, height: h, y, u, v, linesizeY: yStride, linesizeU: cStride, linesizeV: cStride };

            const br = new BitReaderLE(pkt);
            const bitsCount = pkt.length << 3;

            // If stream has alpha, consume its plane first (Bink >= 'i') to keep bitstream aligned
            if (this.hasAlpha) {
                if (this.version >= 'i') br.skipBits(32);
                const aFrame: YUVFrame = {
                    width: w, height: h,
                    y: new Uint8Array(yStride * yBh),
                    u: new Uint8Array(0), v: new Uint8Array(0),
                    linesizeY: yStride, linesizeU: 0, linesizeV: 0,
                };
                this.decodePlane(br, aFrame, 0, false);
            }

            // For revisions >= 'i', a 32-bit YUV-data-size field precedes the planes
            if (this.version >= 'i') br.skipBits(32);

            for (let plane = 0; plane < 3; plane++) {
                const plane_idx = (!plane || !this.swapPlanes) ? plane : (plane ^ 3);
                const isChroma = plane !== 0;
                this.decodePlane(br, frame, plane_idx, isChroma);
                // Match FFmpeg: bail out if all bits consumed (remaining planes stay zeroed)
                if (br.getBitPos() >= bitsCount) break;
            }

            this.last = frame;
            this.frameNum++;
            return frame;
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            const isTruncated = message.includes('readBits beyond end') || message.includes('not enough bits');
            throw new BinkDecodeError(`BinkVideoDecoder: Failed to decode packet (${pkt.length} bytes): ${message}`, isTruncated);
        }
    }

    private decodePlane(br: BitReaderLE, frame: YUVFrame, plane_idx: number, isChroma: boolean) {
        const w = isChroma ? (this.width >> 1) : this.width;
        const h = isChroma ? ((this.height + 1) >> 1) : this.height;
        const stride = plane_idx === 0 ? frame.linesizeY : (plane_idx === 1 ? frame.linesizeU : frame.linesizeV);
        const base = plane_idx === 0 ? frame.y : (plane_idx === 1 ? frame.u : frame.v);

        const bw = isChroma ? ((this.width + 15) >> 4) : ((this.width + 7) >> 3);
        const bh = isChroma ? ((this.height + 15) >> 4) : ((this.height + 7) >> 3);

        const c = new PlaneContext(br, this.version, w, bw, base, stride, this.getPrevPlane(plane_idx));

        // BIKk plane fill shortcut: if bit is set, fill entire plane with next 8-bit value
        if (this.version === 'k') {
            if (br.bitsLeft() > 9) {
                const bit = br.readBit();
                if (bit) {
                    const fill = br.readBits(8) & 0xFF;
                    for (let i = 0; i < h; i++) base.fill(fill, i * stride, i * stride + w);
                    if (br.getBitPos() & 31) br.skipBits(32 - (br.getBitPos() & 31));
                    return;
                }
            }
        }

        c.readAllTrees();

        for (let by = 0; by < bh; by++) {
            c.readAllBundlesRow();

            let dstOff = by * 8 * stride;
            let prevOff = by * 8 * stride;
            for (let bx = 0; bx < bw; bx++, dstOff += 8, prevOff += 8) {
                const blk = c.getBlockType();
                if (((by & 1) || (bx & 1)) && blk === BlockType.SCALED_BLOCK) {
                    bx++; dstOff += 8; prevOff += 8; continue;
                }
                // Optimized switch with inlined simple cases
                switch (blk) {
                    case BlockType.SKIP_BLOCK: {
                        const ref = c.getRefPtr(dstOff, stride);
                        if (!ref) {
                            for (let i = 0; i < 8; i++) base.fill(0, dstOff + i * stride, dstOff + i * stride + 8);
                        } else {
                            for (let i = 0; i < 8; i++) {
                                base.set(ref.buf.subarray(ref.off + i * ref.stride, ref.off + i * ref.stride + 8), dstOff + i * stride);
                            }
                        }
                        break;
                    }
                    case BlockType.SCALED_BLOCK:
                        this.decodeScaledBlock(c, base, dstOff, stride, by, h);
                        bx++; dstOff += 8; prevOff += 8;
                        break;
                    case BlockType.MOTION_BLOCK: {
                        const { xoff, yoff } = c.getMotion();
                        const ref = c.getRefPtr(dstOff + xoff + yoff * stride, stride);
                        if (!ref) {
                            for (let i = 0; i < 8; i++) base.fill(0, dstOff + i * stride, dstOff + i * stride + 8);
                        } else {
                            for (let i = 0; i < 8; i++) {
                                base.set(ref.buf.subarray(ref.off + i * ref.stride, ref.off + i * ref.stride + 8), dstOff + i * stride);
                            }
                        }
                        break;
                    }
                    case BlockType.RUN_BLOCK:
                        this.decodeRunBlock(c, base, dstOff, stride);
                        break;
                    case BlockType.RESIDUE_BLOCK:
                        {
                            const { xoff, yoff } = c.getMotion();
                            const ref = c.getRefPtr(dstOff + xoff + yoff * stride, stride);
                            if (!ref) {
                                for (let i = 0; i < 8; i++) base.fill(0, dstOff + i * stride, dstOff + i * stride + 8);
                            } else {
                                for (let i = 0; i < 8; i++) {
                                    base.set(ref.buf.subarray(ref.off + i * ref.stride, ref.off + i * ref.stride + 8), dstOff + i * stride);
                                }
                            }
                        }
                        this.decodeResidueAdd(c, base, dstOff, stride);
                        break;
                    case BlockType.INTRA_BLOCK:
                        this.decodeIntra(c, base, dstOff, stride);
                        break;
                    case BlockType.FILL_BLOCK: {
                        const v = c.getColor();
                        for (let i = 0; i < 8; i++) base.fill(v, dstOff + i * stride, dstOff + i * stride + 8);
                        break;
                    }
                    case BlockType.INTER_BLOCK:
                        {
                            const { xoff, yoff } = c.getMotion();
                            const ref = c.getRefPtr(dstOff + xoff + yoff * stride, stride);
                            if (!ref) {
                                for (let i = 0; i < 8; i++) base.fill(0, dstOff + i * stride, dstOff + i * stride + 8);
                            } else {
                                for (let i = 0; i < 8; i++) {
                                    base.set(ref.buf.subarray(ref.off + i * ref.stride, ref.off + i * ref.stride + 8), dstOff + i * stride);
                                }
                            }
                        }
                        this.decodeInterAdd(c, base, dstOff, stride);
                        break;
                    case BlockType.PATTERN_BLOCK:
                        this.decodePattern(c, base, dstOff, stride);
                        break;
                    case BlockType.RAW_BLOCK:
                        this.decodeRaw(c, base, dstOff, stride);
                        break;
                    default: {
                        const ref = c.getRefPtr(dstOff, stride);
                        if (!ref) {
                            for (let i = 0; i < 8; i++) base.fill(0, dstOff + i * stride, dstOff + i * stride + 8);
                        } else {
                            for (let i = 0; i < 8; i++) {
                                base.set(ref.buf.subarray(ref.off + i * ref.stride, ref.off + i * ref.stride + 8), dstOff + i * stride);
                            }
                        }
                        break;
                    }
                }
            }
        }

        // Align to 32-bit boundary at plane end
        if (br.getBitPos() & 31) br.skipBits(32 - (br.getBitPos() & 31));
    }

    private getPrevPlane(plane_idx: number): { data: Uint8Array, stride: number } | undefined {
        if (!this.last) return undefined;
        if (plane_idx === 0) return { data: this.last.y, stride: this.last.linesizeY };
        if (plane_idx === 1) return { data: this.last.u, stride: this.last.linesizeU };
        return { data: this.last.v, stride: this.last.linesizeV };
    }

    private blitFromPrev(c: PlaneContext, dst: Uint8Array, dstOff: number, stride: number) {
        const ref = c.getRefPtr(dstOff, stride);
        if (!ref) {
            // Inline fillBlock8
            for (let i = 0; i < 8; i++) dst.fill(0, dstOff + i * stride, dstOff + i * stride + 8);
            return;
        }
        // Inline copyBlock8
        for (let i = 0; i < 8; i++) {
            dst.set(ref.buf.subarray(ref.off + i * ref.stride, ref.off + i * ref.stride + 8), dstOff + i * stride);
        }
    }

    private blitFromPrevWithMV(c: PlaneContext, dst: Uint8Array, dstOff: number, stride: number) {
        const { xoff, yoff } = c.getMotion();
        const ref = c.getRefPtr(dstOff + xoff + yoff * stride, stride);
        if (!ref) {
            // Inline fillBlock8
            for (let i = 0; i < 8; i++) dst.fill(0, dstOff + i * stride, dstOff + i * stride + 8);
            return;
        }
        // Inline copyBlock8
        for (let i = 0; i < 8; i++) {
            dst.set(ref.buf.subarray(ref.off + i * ref.stride, ref.off + i * ref.stride + 8), dstOff + i * stride);
        }
    }

    private decodeRunBlock(c: PlaneContext, dst: Uint8Array, dstOff: number, stride: number) {
        const scan = bink_patterns[c.br.readBits(4) & 0xF];
        // Inline makeCoordMap
        const coord = new Array<number>(64);
        for (let ci = 0; ci < 64; ci++) coord[ci] = (ci & 7) + (ci >> 3) * stride;
        let i = 0, scanIdx = 0;
        do {
            const run = c.getRun() + 1;
            i += run;
            if (i > 64) break; // invalid data
            if (c.br.readBit()) {
                const v = c.getColor();
                for (let j = 0; j < run; j++) dst[dstOff + coord[scan[scanIdx++]]] = v;
            } else {
                for (let j = 0; j < run; j++) dst[dstOff + coord[scan[scanIdx++]]] = c.getColor();
            }
        } while (i < 63);
        if (i === 63) dst[dstOff + coord[scan[scanIdx]]] = c.getColor();
    }

    private decodePattern(c: PlaneContext, dst: Uint8Array, dstOff: number, stride: number) {
        const col0 = c.getColor();
        const col1 = c.getColor();
        for (let i = 0; i < 8; i++) {
            let v = c.getPatternByte();
            for (let j = 0; j < 8; j++, v >>= 1) dst[dstOff + i * stride + j] = (v & 1) ? col1 : col0;
        }
    }

    private decodeRaw(c: PlaneContext, dst: Uint8Array, dstOff: number, stride: number) {
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) dst[dstOff + i * stride + j] = c.getRawColor();
        }
    }

    private decodeResidueAdd(c: PlaneContext, dst: Uint8Array, dstOff: number, stride: number) {
        const block = new Int16Array(64);
        block.fill(0);
        const masks = c.br.readBits(7);
        readResidue(c.br, block, masks);
        addPixels8(dst.subarray(dstOff), block, stride);
    }

    private decodeIntra(c: PlaneContext, dst: Uint8Array, dstOff: number, stride: number) {
        const dct = BinkVideoDecoder.intraDct; dct.fill(0);
        dct[0] = c.getIntraDC();
        const { quantIdx, coefIdx, coefCount } = readDctCoeffs(c, c.br, dct, -1);
        unquantize(dct, bink_intra_quant, quantIdx, coefIdx, coefCount);
        const blk = BinkVideoDecoder.intraBlk;
        idctPut(blk, 8, dct);
        // Inline blit8
        for (let i = 0; i < 8; i++) {
            dst.set(blk.subarray(i * 8, i * 8 + 8), dstOff + i * stride);
        }
    }

    private decodeInterAdd(c: PlaneContext, dst: Uint8Array, dstOff: number, stride: number) {
        const dct = BinkVideoDecoder.intraDct; dct.fill(0);
        dct[0] = c.getInterDC();
        const { quantIdx, coefIdx, coefCount } = readDctCoeffs(c, c.br, dct, -1);
        unquantize(dct, bink_inter_quant, quantIdx, coefIdx, coefCount);
        idctAdd(dst.subarray(dstOff), stride, dct);
    }

    private decodeScaledBlock(c: PlaneContext, dst: Uint8Array, dstOff: number, stride: number, blockRow: number, planeHeight: number) {
        const subType = c.getSubBlockType();
        const ublk = BinkVideoDecoder.scaledBlk;
        switch (subType) {
            case BlockType.RUN_BLOCK: {
                const scan = bink_patterns[c.br.readBits(4) & 0xF];
                let i = 0, idx = 0;
                do {
                    const run = c.getRun() + 1;
                    i += run;
                    if (i > 64) break; // invalid data
                    if (c.br.readBit()) {
                        const v = c.getColor();
                        for (let j = 0; j < run; j++) ublk[scan[idx++]] = v;
                    } else {
                        for (let j = 0; j < run; j++) ublk[scan[idx++]] = c.getColor();
                    }
                } while (i < 63);
                if (i === 63) ublk[scan[idx]] = c.getColor();
                break;
            }
            case BlockType.INTRA_BLOCK: {
                const dct = BinkVideoDecoder.intraDct; dct.fill(0);
                dct[0] = c.getIntraDC();
                const { quantIdx, coefIdx, coefCount } = readDctCoeffs(c, c.br, dct, -1);
                unquantize(dct, bink_intra_quant, quantIdx, coefIdx, coefCount);
                idctPut(ublk, 8, dct);
                break;
            }
            case BlockType.FILL_BLOCK: {
                const v = c.getColor(); for (let i = 0; i < 64; i++) ublk[i] = v; break;
            }
            case BlockType.PATTERN_BLOCK: {
                const c0 = c.getColor(), c1 = c.getColor();
                for (let j = 0; j < 8; j++) { let v = c.getPatternByte(); for (let i = 0; i < 8; i++, v >>= 1) ublk[i + j * 8] = (v & 1) ? c1 : c0; }
                break;
            }
            case BlockType.RAW_BLOCK: {
                for (let i = 0; i < 64; i++) ublk[i] = c.getRawColor();
                break;
            }
            default:
                ublk.fill(0);
        }
        const tmp = BinkVideoDecoder.scaledTmp;
        scaleBlock(ublk, tmp, 16);
        const rowsToWrite = Math.min(16, planeHeight - blockRow * 8);
        for (let j = 0; j < rowsToWrite; j++) {
            const s = j * 16; const d = dstOff + j * stride;
            dst.set(tmp.subarray(s, s + 16), d);
        }
    }
}

enum BundleId {
    BLOCK_TYPES = 0, SUB_BLOCK_TYPES, COLORS, PATTERN, X_OFF, Y_OFF, INTRA_DC, INTER_DC, RUN,
}

enum BlockType {
    SKIP_BLOCK = 0, SCALED_BLOCK, MOTION_BLOCK, RUN_BLOCK, RESIDUE_BLOCK, INTRA_BLOCK, FILL_BLOCK, INTER_BLOCK, PATTERN_BLOCK, RAW_BLOCK,
}

class Bundle {
    len = 0;
    tree: Tree = { vlc_num: 0, syms: Array.from({ length: 16 }, (_, i) => i) };
    data!: Uint8Array;
    cur_dec = 0;
    cur_ptr = 0;
    disabled = false;
}

class PlaneContext {
    br: BitReaderLE;
    private version: string;
    private width: number;
    private bw: number;
    private base: Uint8Array;
    private stride: number;
    private ref?: { data: Uint8Array, stride: number };

    bundle: Bundle[] = Array.from({ length: 9 }, () => new Bundle());
    col_high: Tree[] = Array.from({ length: 16 }, () => ({ vlc_num: 0, syms: Array.from({ length: 16 }, (_, i) => i) }));
    col_lastval = 0;

    constructor(br: BitReaderLE, version: string, width: number, bw: number, base: Uint8Array, stride: number, prev?: { data: Uint8Array, stride: number }) {
        this.br = br; this.version = version; this.width = Math.max(width, 8); this.bw = bw; this.base = base; this.stride = stride; this.ref = prev;
        this.initLengths(); this.initBundleBuffers();
    }

    readAllTrees() {
        for (let id = 0; id < this.bundle.length; id++) {
            if (id === BundleId.COLORS) {
                for (let i = 0; i < 16; i++) this.col_high[i] = readTree(this.br);
                this.col_lastval = 0;
            }
            if (id === BundleId.INTRA_DC || id === BundleId.INTER_DC) continue;
            this.bundle[id].tree = readTree(this.br);
        }
    }

    private initLengths() {
        const width = align8(this.width);
        this.bundle[BundleId.BLOCK_TYPES].len = av_log2_ts((width >> 3) + 511) + 1;
        this.bundle[BundleId.SUB_BLOCK_TYPES].len = av_log2_ts((width >> 4) + 511) + 1;
        this.bundle[BundleId.COLORS].len = av_log2_ts(this.bw * 64 + 511) + 1;
        const mvLen = av_log2_ts((width >> 3) + 511) + 1;
        this.bundle[BundleId.INTRA_DC].len = mvLen;
        this.bundle[BundleId.INTER_DC].len = mvLen;
        this.bundle[BundleId.X_OFF].len = mvLen;
        this.bundle[BundleId.Y_OFF].len = mvLen;
        this.bundle[BundleId.PATTERN].len = av_log2_ts((this.bw << 3) + 511) + 1;
        this.bundle[BundleId.RUN].len = av_log2_ts(this.bw * 48 + 511) + 1;
    }

    private initBundleBuffers() {
        const height = (this.base.length / this.stride) | 0;
        const bh = (height + 7) >> 3;
        const blocks = this.bw * bh;
        for (let i = 0; i < this.bundle.length; i++) {
            const b = this.bundle[i]; b.data = new Uint8Array(blocks * 64); b.cur_dec = 0; b.cur_ptr = 0; b.disabled = false;
        }
    }

    readAllBundlesRow() {
        this.decodeRowBundle(BundleId.BLOCK_TYPES);
        this.decodeRowBundle(BundleId.SUB_BLOCK_TYPES);
        this.decodeRowBundle(BundleId.COLORS);
        this.decodeRowBundle(BundleId.PATTERN);
        this.decodeRowBundle(BundleId.X_OFF);
        this.decodeRowBundle(BundleId.Y_OFF);
        this.decodeRowBundle(BundleId.INTRA_DC);
        this.decodeRowBundle(BundleId.INTER_DC);
        this.decodeRowBundle(BundleId.RUN);
    }

    private decodeRowBundle(id: number) {
        const b = this.bundle[id];
        if (b.disabled || (b.cur_dec > b.cur_ptr)) return;

        let t: number;
        // Strictly read the row entry count; if not enough bits, propagate error to avoid desync
        t = this.br.readBits(b.len);

        // BIKk quirk: XOR and disable
        if (id === BundleId.BLOCK_TYPES && this.version === 'k') {
            t = t ^ 0xBB;
            if (t === 0) { b.disabled = true; return; }
        }

        if (t === 0) { b.disabled = true; return; }

        // Bounds check: ensure we won't write beyond bundle buffer
        const maxEnd = b.cur_dec + t;
        if (maxEnd > b.data.length) {
            throw new RangeError('Bundle decode exceeds buffer for ' + bundleName(id));
        }

        switch (id) {
            case BundleId.BLOCK_TYPES:
            case BundleId.SUB_BLOCK_TYPES: this.readBlockTypes(b, t); break;
            case BundleId.PATTERN: this.readPatterns(b, t); break;
            case BundleId.COLORS: this.readColors(b, t); break;
            case BundleId.X_OFF:
            case BundleId.Y_OFF: this.readMotion(b, t); break;
            case BundleId.INTRA_DC: this.readDCs(b, t, 11, 0); break;
            case BundleId.INTER_DC: this.readDCs(b, t, 11, 1); break;
            case BundleId.RUN: this.readRuns(b, t); break;
        }
    }

    private readRuns(b: Bundle, t: number) {
        const end = b.cur_dec + t;
        if (this.br.readBit()) {
            const v = this.br.readBits(4) & 0xF; b.data.fill(v, b.cur_dec, end); b.cur_dec = end; return;
        }
        while (b.cur_dec < end) b.data[b.cur_dec++] = getHuff(this.br, b.tree);
    }

    private readMotion(b: Bundle, t: number) {
        const end = b.cur_dec + t;
        if (this.br.readBit()) {
            let v = this.br.readBits(4) & 0xF; if (v) { const sign = this.br.readBit() ? -1 : 0; v = (v ^ sign) - sign; }
            b.data.fill(v & 0xFF, b.cur_dec, end); b.cur_dec = end; return;
        }
        while (b.cur_dec < end) {
            let v = getHuff(this.br, b.tree); if (v) { const sign = this.br.readBit() ? -1 : 0; v = (v ^ sign) - sign; }
            b.data[b.cur_dec++] = v & 0xFF;
        }
    }

    private readBlockTypes(b: Bundle, t: number) {
        let last = 0; const end = b.cur_dec + t;
        if (this.br.readBit()) {
            const v = this.br.readBits(4) & 0xF; b.data.fill(v, b.cur_dec, end); b.cur_dec = end;
            return;
        }
        const rleLens = [4, 8, 12, 32];
        while (b.cur_dec < end) {
            const v = getHuff(this.br, b.tree);
            if (v < 12) { last = v; b.data[b.cur_dec++] = v; }
            else { const run = rleLens[v - 12]; for (let i = 0; i < run && b.cur_dec < end; i++) b.data[b.cur_dec++] = last; }
        }
    }

    private readPatterns(b: Bundle, t: number) {
        const end = b.cur_dec + t;
        while (b.cur_dec < end) {
            const v = getHuff(this.br, b.tree) | (getHuff(this.br, b.tree) << 4);
            b.data[b.cur_dec++] = v & 0xFF;
        }
    }

    private readColors(b: Bundle, t: number) {
        const end = b.cur_dec + t;
        if (t <= 0) return;
        if (this.br.readBit()) {
            this.col_lastval = getHuff(this.br, this.col_high[this.col_lastval]);
            let v = (this.col_lastval << 4) | getHuff(this.br, b.tree);
            if (this.version < 'i') { const sign = ((v & 0x80) ? -1 : 0); v = ((v & 0x7F) ^ sign) - sign; v += 0x80; }
            b.data.fill(v & 0xFF, b.cur_dec, end);
            b.cur_dec = end;
            return;
        }
        while (b.cur_dec < end) {
            this.col_lastval = getHuff(this.br, this.col_high[this.col_lastval]);
            let v = (this.col_lastval << 4) | getHuff(this.br, b.tree);
            if (this.version < 'i') { const sign = ((v & 0x80) ? -1 : 0); v = ((v & 0x7F) ^ sign) - sign; v += 0x80; }
            b.data[b.cur_dec++] = v & 0xFF;
        }
    }

    private readDCs(b: Bundle, t: number, startBits: number, hasSign: number) {
        let len = t;
        let v = this.br.readBits(startBits - hasSign);
        if (v && hasSign) { const sign = this.br.readBit() ? -1 : 0; v = (v ^ sign) - sign; }
        // Inline writeInt16
        const iv = (v << 16) >> 16;
        b.data[b.cur_dec] = iv & 0xFF; b.data[b.cur_dec + 1] = (iv >> 8) & 0xFF;
        b.cur_dec += 2; len--;
        for (let i = 0; i < len; i += 8) {
            const len2 = Math.min(len - i, 8);
            const bsize = this.br.readBits(4);
            if (bsize) {
                for (let j = 0; j < len2; j++) {
                    let v2 = this.br.readBits(bsize);
                    if (v2) { const sign = this.br.readBit() ? -1 : 0; v2 = (v2 ^ sign) - sign; }
                    v += v2;
                    // Inline writeInt16
                    const iv = (v << 16) >> 16;
                    b.data[b.cur_dec] = iv & 0xFF; b.data[b.cur_dec + 1] = (iv >> 8) & 0xFF;
                    b.cur_dec += 2;
                }
            } else {
                for (let j = 0; j < len2; j++) {
                    // Inline writeInt16
                    const iv = (v << 16) >> 16;
                    b.data[b.cur_dec] = iv & 0xFF; b.data[b.cur_dec + 1] = (iv >> 8) & 0xFF;
                    b.cur_dec += 2;
                }
            }
        }
    }

    getBlockType(): number { return this.bundle[BundleId.BLOCK_TYPES].data[this.bundle[BundleId.BLOCK_TYPES].cur_ptr++]; }
    getSubBlockType(): number { return this.bundle[BundleId.SUB_BLOCK_TYPES].data[this.bundle[BundleId.SUB_BLOCK_TYPES].cur_ptr++]; }
    getColor(): number { return this.bundle[BundleId.COLORS].data[this.bundle[BundleId.COLORS].cur_ptr++]; }
    getRawColor(): number { return this.bundle[BundleId.COLORS].data[this.bundle[BundleId.COLORS].cur_ptr++]; }
    getPatternByte(): number { return this.bundle[BundleId.PATTERN].data[this.bundle[BundleId.PATTERN].cur_ptr++]; }
    getRun(): number { return this.bundle[BundleId.RUN].data[this.bundle[BundleId.RUN].cur_ptr++]; }
    getIntraDC(): number {
        const buf = this.bundle[BundleId.INTRA_DC].data, off = this.bundle[BundleId.INTRA_DC].cur_ptr;
        // Inline readInt16
        const v = (buf[off] | (buf[off + 1] << 8));
        this.bundle[BundleId.INTRA_DC].cur_ptr += 2;
        return (v << 16) >> 16;
    }
    getInterDC(): number {
        const buf = this.bundle[BundleId.INTER_DC].data, off = this.bundle[BundleId.INTER_DC].cur_ptr;
        // Inline readInt16
        const v = (buf[off] | (buf[off + 1] << 8));
        this.bundle[BundleId.INTER_DC].cur_ptr += 2;
        return (v << 16) >> 16;
    }
    getMotion(): { xoff: number, yoff: number } { const x = (this.bundle[BundleId.X_OFF].data[this.bundle[BundleId.X_OFF].cur_ptr++] << 24) >> 24; const y = (this.bundle[BundleId.Y_OFF].data[this.bundle[BundleId.Y_OFF].cur_ptr++] << 24) >> 24; return { xoff: x, yoff: y }; }

    getRefPtr(dstOff: number, stride: number): { buf: Uint8Array, off: number, stride: number } | undefined {
        if (!this.ref) return undefined;
        const height = (this.ref.data.length / this.ref.stride) | 0;
        const width = this.width | 0;
        const maxOff = ((height - 8) * this.ref.stride + (width - 8)) | 0;
        const off = dstOff | 0;
        if (off < 0 || off > maxOff) return undefined;
        return { buf: this.ref.data, off, stride: this.ref.stride };
    }
}

function align8(x: number) { return (x + 7) & ~7; }
function av_log2_ts(x: number) {
    let r = 0;
    while (x >>> 1) { x >>>= 1; r++; }
    return r;
}

function readDctCoeffs(c: PlaneContext, br: BitReaderLE, block: Int32Array, q: number): { quantIdx: number, coefIdx: number[], coefCount: number } {
    const coef_list = new Int32Array(128);
    const mode_list = new Int32Array(128);
    let list_start = 64, list_end = 64;
    let coefCount = 0;
    const coefIdx: number[] = [];
    const scan = bink_scan;

    function pushCoef(idx: number, val: number) {
        block[scan[idx]] = val | 0; coefIdx.push(idx); coefCount++;
    }

    coef_list[list_end] = 4; mode_list[list_end++] = 0;
    coef_list[list_end] = 24; mode_list[list_end++] = 0;
    coef_list[list_end] = 44; mode_list[list_end++] = 0;
    coef_list[list_end] = 1; mode_list[list_end++] = 3;
    coef_list[list_end] = 2; mode_list[list_end++] = 3;
    coef_list[list_end] = 3; mode_list[list_end++] = 3;

    let bits = (br.readBits(4) | 0) - 1;
    for (; bits >= 0; bits--) {
        let list_pos = list_start;
        while (list_pos < list_end) {
            if (!(mode_list[list_pos] | coef_list[list_pos]) || !br.readBit()) { list_pos++; continue; }
            let ccoef = coef_list[list_pos];
            const mode = mode_list[list_pos];
            switch (mode) {
                case 0: coef_list[list_pos] = ccoef + 4; mode_list[list_pos] = 1; // fallthrough
                case 2:
                    if (mode === 2) { coef_list[list_pos] = 0; mode_list[list_pos++] = 0; }
                    for (let i = 0; i < 4; i++, ccoef++) {
                        if (br.readBit()) { coef_list[--list_start] = ccoef; mode_list[list_start] = 3; }
                        else {
                            let t: number;
                            if (!bits) { t = 1 - ((br.readBit()) << 1); }
                            else { t = br.readBits(bits) | (1 << bits); t = (br.readBit() ? -t : t) | 0; }
                            pushCoef(ccoef, t);
                        }
                    }
                    break;
                case 1:
                    mode_list[list_pos] = 2;
                    for (let i = 0; i < 3; i++) { ccoef += 4; coef_list[list_end] = ccoef; mode_list[list_end++] = 2; }
                    break;
                case 3: {
                    let t: number; if (!bits) { t = 1 - ((br.readBit()) << 1); } else { t = br.readBits(bits) | (1 << bits); t = (br.readBit() ? -t : t) | 0; }
                    pushCoef(ccoef, t); coef_list[list_pos] = 0; mode_list[list_pos++] = 0; break; }
            }
        }
    }

    let quantIdx = q;
    if (q === -1) quantIdx = br.readBits(4) & 0xF;
    return { quantIdx, coefIdx, coefCount };
}

function unquantize(block: Int32Array, qtables: number[][], qindex: number, coefIdx: number[], coefCount: number) {
    const qi = Math.min(qindex, qtables.length - 1);
    const qt = qtables[qi];
    block[0] = (block[0] * qt[0]) >> 11;
    for (let i = 0; i < coefCount; i++) { const idx = coefIdx[i]; const si = bink_scan[idx]; block[si] = (block[si] * qt[idx]) >> 11; }
}

function readResidue(br: BitReaderLE, block: Int16Array, masksCount: number) {
    const coef_list = new Int32Array(128);
    const mode_list = new Int32Array(128);
    let list_start = 64, list_end = 64;
    const nz_coeff: number[] = [];

    coef_list[list_end] = 4; mode_list[list_end++] = 0;
    coef_list[list_end] = 24; mode_list[list_end++] = 0;
    coef_list[list_end] = 44; mode_list[list_end++] = 0;
    coef_list[list_end] = 0; mode_list[list_end++] = 2;

    for (let mask = 1 << br.readBits(3); mask; mask >>= 1) {
        for (let i = 0; i < nz_coeff.length; i++) {
            if (!br.readBit()) continue; const idx = nz_coeff[i];
            if (block[idx] < 0) block[idx] -= mask; else block[idx] += mask;
            if (--masksCount < 0) return;
        }
        let list_pos = list_start;
        while (list_pos < list_end) {
            if (!(coef_list[list_pos] | mode_list[list_pos]) || !br.readBit()) { list_pos++; continue; }
            let ccoef = coef_list[list_pos];
            const mode = mode_list[list_pos];
            switch (mode) {
                case 0:
                    coef_list[list_pos] = ccoef + 4;
                    mode_list[list_pos] = 1;
                case 2:
                    if (mode === 2) { coef_list[list_pos] = 0; mode_list[list_pos++] = 0; }
                    for (let i = 0; i < 4; i++, ccoef++) {
                        if (br.readBit()) { coef_list[--list_start] = ccoef; mode_list[list_start] = 3; }
                        else {
                            const idx = bink_scan[ccoef]; const sign = br.readBit() ? -1 : 0; block[idx] = (mask ^ sign) - sign; nz_coeff.push(idx); if (--masksCount < 0) return;
                        }
                    }
                    break;
                case 1:
                    mode_list[list_pos] = 2;
                    for (let i = 0; i < 3; i++) { ccoef += 4; coef_list[list_end] = ccoef; mode_list[list_end++] = 2; }
                    break;
                case 3:
                    {
                        const idx = bink_scan[ccoef]; nz_coeff.push(idx); const sign = br.readBit() ? -1 : 0; block[idx] = (mask ^ sign) - sign; coef_list[list_pos] = 0; mode_list[list_pos++] = 0; if (--masksCount < 0) return; break;
                    }
            }
        }
    }
}

function bundleName(id: number): string {
    switch (id) {
        case BundleId.BLOCK_TYPES: return 'BLOCK_TYPES';
        case BundleId.SUB_BLOCK_TYPES: return 'SUB_BLOCK_TYPES';
        case BundleId.COLORS: return 'COLORS';
        case BundleId.PATTERN: return 'PATTERN';
        case BundleId.X_OFF: return 'X_OFF';
        case BundleId.Y_OFF: return 'Y_OFF';
        case BundleId.INTRA_DC: return 'INTRA_DC';
        case BundleId.INTER_DC: return 'INTER_DC';
        case BundleId.RUN: return 'RUN';
        default: return String(id);
    }
}
