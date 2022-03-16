/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ADPCMDecoder is used to decode ADPCM wav files in the game.
 */

class ADPCMDecoder {

  constructor( args = {} ){

    args = Object.assign({
      data: null,
			header: {
				sampleRate: 14400,
				frameSize: 2048,
				channels: 2
			}
    }, args);

    this.adpcm = args.data;
		this.header = args.header;
    this.pcm = Buffer.alloc(0);

		this.stepIdx = [0, 0];
		this.previous = [0, 0];
		this.predictor = [0, 0];

		this.inputStreamIndex = 0;

		this.blocks = [];

    this.decode();

  }

	decode(){
		this.blocks = [];
		if(this.adpcm instanceof Buffer){

			let blockHeaderSize = 4 * this.header.channels;
			let count = this.adpcm.length;

			this.pcm = Buffer.alloc(0);
			let chunks = [];

			console.log('ADPCMDecoder', 'Decode Starting');
			while( count > 0 ) {
				let inSamples = (count > this.header.frameSize ? this.header.frameSize : count);

				let samples =  ( (inSamples - blockHeaderSize) * 4 ) + blockHeaderSize / this.header.channels;
				let buffer = Buffer.alloc( samples );
				this.decodeBlock( this.adpcm, buffer, this.inputStreamIndex, samples );

				chunks.push(buffer);

				count -= inSamples;
				this.inputStreamIndex += inSamples;
			}

			this.pcm = Buffer.concat(chunks);

			console.log('ADPCMDecoder', 'Decode Complete');

    }
	}

  decodeBlock( input, output, index, count ) {

		let inputIdx = index, outputIdx = 0, outputEnd = count, blockIndex = index / this.header.frameSize;

		let currentBlock = this.blocks[blockIndex] = new ADPCMBlock({channels: this.header.channels});

		/* Block Header */
		let byte1 = undefined, byte2 = undefined, dummyByte = undefined;
		for(let i = 0, len = this.header.channels; i < len; i++){

			byte1 = currentBlock.header.samples[i][0] = output[ outputIdx++ ] = input[ inputIdx++ ];
			byte2 = currentBlock.header.samples[i][1] = output[ outputIdx++ ] = input[ inputIdx++ ];

			this.predictor[i] = byte1 | (byte2 << 8); //byte2 << 8 | (byte1 & 0xFF)

			if (this.predictor[i] & 0x8000)
				this.predictor[i] -= 0x10000;

			this.stepIdx[i] = input[ inputIdx++ ] & 0xFF;

			dummyByte = input[ inputIdx++ ]; //Always Zero

		}
		/* END Block Header */

		/* Sample Parser: Start */
		let sampleIdx = 0;
		let channelSamples = undefined;
		let channel = undefined, bytes = undefined;
		while( outputIdx < (outputEnd) ) {

			channel = (sampleIdx & 4) >> 2;

			if(this.header.channels == 1)
			  channel = 0;

			bytes = this.getNibblesFromByte(input[ inputIdx++ ], channel);

			channelSamples = currentBlock.samples[channel];

			channelSamples.push(bytes[0]);
			channelSamples.push(bytes[1]);
			channelSamples.push(bytes[2]);
			channelSamples.push(bytes[3]);

			output[ outputIdx++ ] = bytes[0];
			output[ outputIdx++ ] = bytes[1];
			output[ outputIdx++ ] = bytes[2];
			output[ outputIdx++ ] = bytes[3];

			sampleIdx++;

		}
		/* Sample Parser: END */

		/* Sample Ouput: START */
		outputIdx = 2 * this.header.channels;
		sampleIdx = 0;

		let channelMultiplier = (this.header.channels * 2);
		let sIdx = 0, idx1 = 0, idx2 = 0;
		while( outputIdx < outputEnd ){

			sIdx = sampleIdx / channelMultiplier;

			idx1 = sIdx + sIdx;
			idx2 = idx1 + 1;

			for(let i = 0, len = this.header.channels; i < len; i++){
				output[ outputIdx++ ] = currentBlock.samples[i][idx1];
				output[ outputIdx++ ] = currentBlock.samples[i][idx2];
			}
			sampleIdx += (this.header.channels * 2);
		}
		/* Sample Output: END */

	}

	getNibblesFromByte(input, channel){

		let sample1 = this.expandNibble(input & 0x0F, channel);
		let sample2 = this.expandNibble((input >> 4) & 0x0F, channel);

		return [sample1 & 0xFF, (sample1 >> 8) & 0xFF, sample2 & 0xFF, (sample2 >> 8) & 0xFF];

	}

	expandNibble(nibble, channel = 0){

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

	static CLAMP(value, min, max){
		return Math.min(Math.max(parseInt(value), min), max);
	}

}

ADPCMDecoder.stepIdxTable =[ 
    -1, -1, -1, -1,		/* +0 - +3, decrease the step size */
     2,  4,  6,  8,     /* +4 - +7, increase the step size */
    -1, -1, -1, -1,		/* -0 - -3, decrease the step size */
     2,  4,  6,  8,
];

ADPCMDecoder.stepTable = [
	7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
	50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
	253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
	1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
	3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442,
	11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794,
	32767
];

module.exports = ADPCMDecoder;