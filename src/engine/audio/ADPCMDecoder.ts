interface ADPCMHeader {
	sampleRate: number;
	frameSize: number;
	channels: number;
}

/**
 * ADPCMDecoder class.
 * 
 * The ADPCMDecoder is used to decode ADPCM wav files in the game.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ADPCMDecoder.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ADPCMDecoder {
	adpcm: Uint8Array;
	header: ADPCMHeader;
	pcm: Int16Array;
	stepIdx: number[];
	previous: number[];
	predictor: number[];
	inputStreamIndex: number;

  constructor( header: ADPCMHeader, data: Uint8Array ){
		this.header = header;
    this.adpcm = data;
    this.pcm = new Int16Array(0);

		this.stepIdx = [0, 0];
		this.previous = [0, 0];
		this.predictor = [0, 0];

		this.inputStreamIndex = 0;

    this.decode();
  }

	decode(){
		if(!(this.adpcm instanceof Uint8Array)) return;

		const channels = this.header.channels;
		const blockHeaderSize = 4 * channels;

		/* Pre-calculate total Int16 samples so we can allocate once */
		let totalSamples = 0;
		let count = this.adpcm.length;
		while(count > 0) {
			const n = Math.min(count, this.header.frameSize);
			totalSamples += (n - blockHeaderSize) * 2 + 2;
			count -= n;
		}

		this.pcm = new Int16Array(totalSamples);

		count = this.adpcm.length;
		let outputIdx = 0;
		while(count > 0) {
			const inSamples = Math.min(count, this.header.frameSize);
			this.decodeBlock(this.adpcm, this.pcm, this.inputStreamIndex, outputIdx, inSamples);
			outputIdx += (inSamples - blockHeaderSize) * 2 + 2;
			count -= inSamples;
			this.inputStreamIndex += inSamples;
		}
	}

	decodeBlock(input: Uint8Array, output: Int16Array, inputIdx: number, outputIdx: number, blockSize: number): void {
		const channels = this.header.channels;
		const blockHeaderSize = 4 * channels;
		const blockDataBytes = blockSize - blockHeaderSize;
		const stepTable = ADPCMDecoder.stepTable;
		const stepIdxTable = ADPCMDecoder.stepIdxTable;

		/* Block Header: read predictor and stepIdx per channel */
		for(let ch = 0; ch < channels; ch++) {
			const lo = input[inputIdx++];
			const hi = input[inputIdx++];
			this.predictor[ch] = lo | (hi << 8);
			if(this.predictor[ch] & 0x8000) this.predictor[ch] -= 0x10000;
			this.stepIdx[ch] = input[inputIdx++] & 0xFF;
			inputIdx++; /* dummy byte, always zero */
		}

		/* Write predictor values as the first interleaved samples */
		for(let ch = 0; ch < channels; ch++) {
			output[outputIdx + ch] = this.predictor[ch];
		}
		outputIdx += channels;

		/* Hoist decoder state into locals to avoid repeated property lookups */
		let pred0 = this.predictor[0];
		let sidx0 = this.stepIdx[0];

		if(channels === 1) {
			/* Mono: decode nibbles sequentially, write directly to output */
			let out = outputIdx;
			for(let byteIdx = 0; byteIdx < blockDataBytes; byteIdx++) {
				const byte = input[inputIdx++];
				let nibble: number, step: number, diff: number;

				nibble = byte & 0x0F;
				step = stepTable[sidx0];
				diff = step >> 3;
				if(nibble & 1) diff += step >> 2;
				if(nibble & 2) diff += step >> 1;
				if(nibble & 4) diff += step;
				if(nibble & 8) diff = -diff;
				pred0 += diff;
				if(pred0 > 32767) pred0 = 32767; else if(pred0 < -32768) pred0 = -32768;
				sidx0 += stepIdxTable[nibble];
				if(sidx0 > 88) sidx0 = 88; else if(sidx0 < 0) sidx0 = 0;
				output[out++] = pred0;

				nibble = (byte >> 4) & 0x0F;
				step = stepTable[sidx0];
				diff = step >> 3;
				if(nibble & 1) diff += step >> 2;
				if(nibble & 2) diff += step >> 1;
				if(nibble & 4) diff += step;
				if(nibble & 8) diff = -diff;
				pred0 += diff;
				if(pred0 > 32767) pred0 = 32767; else if(pred0 < -32768) pred0 = -32768;
				sidx0 += stepIdxTable[nibble];
				if(sidx0 > 88) sidx0 = 88; else if(sidx0 < 0) sidx0 = 0;
				output[out++] = pred0;
			}
		} else {
			/*
			 * Stereo: bytes arrive in groups of 4 per channel (ch0×4, ch1×4, …).
			 * Decode each nibble and write directly to the interleaved output slot,
			 * eliminating all per-block allocations and the separate interleave pass.
			 */
			let pred1 = this.predictor[1];
			let sidx1 = this.stepIdx[1];
			let sIdx0 = 0, sIdx1 = 0;

			for(let byteIdx = 0; byteIdx < blockDataBytes; byteIdx++) {
				const byte = input[inputIdx++];
				let nibble: number, step: number, diff: number;

				if((byteIdx & 4) === 0) {
					/* Channel 0 — write to even interleave slots */
					nibble = byte & 0x0F;
					step = stepTable[sidx0];
					diff = step >> 3;
					if(nibble & 1) diff += step >> 2;
					if(nibble & 2) diff += step >> 1;
					if(nibble & 4) diff += step;
					if(nibble & 8) diff = -diff;
					pred0 += diff;
					if(pred0 > 32767) pred0 = 32767; else if(pred0 < -32768) pred0 = -32768;
					sidx0 += stepIdxTable[nibble];
					if(sidx0 > 88) sidx0 = 88; else if(sidx0 < 0) sidx0 = 0;
					output[outputIdx + sIdx0 * 2] = pred0;
					sIdx0++;

					nibble = (byte >> 4) & 0x0F;
					step = stepTable[sidx0];
					diff = step >> 3;
					if(nibble & 1) diff += step >> 2;
					if(nibble & 2) diff += step >> 1;
					if(nibble & 4) diff += step;
					if(nibble & 8) diff = -diff;
					pred0 += diff;
					if(pred0 > 32767) pred0 = 32767; else if(pred0 < -32768) pred0 = -32768;
					sidx0 += stepIdxTable[nibble];
					if(sidx0 > 88) sidx0 = 88; else if(sidx0 < 0) sidx0 = 0;
					output[outputIdx + sIdx0 * 2] = pred0;
					sIdx0++;
				} else {
					/* Channel 1 — write to odd interleave slots */
					nibble = byte & 0x0F;
					step = stepTable[sidx1];
					diff = step >> 3;
					if(nibble & 1) diff += step >> 2;
					if(nibble & 2) diff += step >> 1;
					if(nibble & 4) diff += step;
					if(nibble & 8) diff = -diff;
					pred1 += diff;
					if(pred1 > 32767) pred1 = 32767; else if(pred1 < -32768) pred1 = -32768;
					sidx1 += stepIdxTable[nibble];
					if(sidx1 > 88) sidx1 = 88; else if(sidx1 < 0) sidx1 = 0;
					output[outputIdx + sIdx1 * 2 + 1] = pred1;
					sIdx1++;

					nibble = (byte >> 4) & 0x0F;
					step = stepTable[sidx1];
					diff = step >> 3;
					if(nibble & 1) diff += step >> 2;
					if(nibble & 2) diff += step >> 1;
					if(nibble & 4) diff += step;
					if(nibble & 8) diff = -diff;
					pred1 += diff;
					if(pred1 > 32767) pred1 = 32767; else if(pred1 < -32768) pred1 = -32768;
					sidx1 += stepIdxTable[nibble];
					if(sidx1 > 88) sidx1 = 88; else if(sidx1 < 0) sidx1 = 0;
					output[outputIdx + sIdx1 * 2 + 1] = pred1;
					sIdx1++;
				}
			}

			this.predictor[1] = pred1;
			this.stepIdx[1] = sidx1;
		}

		/* Write back decoder state */
		this.predictor[0] = pred0;
		this.stepIdx[0] = sidx0;
	}

	expandNibble(nibble: number, channel = 0){

		let bytecode = nibble & 0xFF;

		let step = ADPCMDecoder.stepTable[this.stepIdx[channel]];
		let predictor = this.predictor[channel];

		let diff = step >> 3 ;
		if (bytecode & 1)
			diff += step >> 2 ;
		if (bytecode & 2)
			diff += step >> 1 ;
		if (bytecode & 4)
			diff += step ;
		if (bytecode & 8)
			diff = -diff ;

		predictor += diff ;

		predictor = ADPCMDecoder.CLAMP(predictor, -32768, 32767);

		this.stepIdx[channel] += ADPCMDecoder.stepIdxTable[bytecode] ;
		this.stepIdx[channel] = ADPCMDecoder.CLAMP(this.stepIdx[channel], 0, 88) ;

		this.predictor[channel] = predictor;

		return predictor;

	}

	static CLAMP(value: any, min: number, max: number){
		return Math.min(Math.max(value, min), max);
	}

	static stepIdxTable: number[] = [ 
			-1, -1, -1, -1,		/* +0 - +3, decrease the step size */
			 2,  4,  6,  8,   /* +4 - +7, increase the step size */
			-1, -1, -1, -1,		/* -0 - -3, decrease the step size */
			 2,  4,  6,  8,
	];
	
	static stepTable: number[] = [
		7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
		50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
		253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
		1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
		3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442,
		11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794,
		32767
	];

}
