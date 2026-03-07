import { BinaryReader } from "../BinaryReader";

/**
 * DxtUtil class.
 * 
 * Converted to typescript from https://github.com/FNA-XNA/FNA/blob/master/src/Graphics/DxtUtil.cs
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file DxtUtil.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class DxtUtil {

	constructor(){

	}

	static DecompressDxt5(imageReader: any, width: number, height: number) {
		
		let imageData = new Uint8Array(imageReader.length);
		let Reader = new BinaryReader(Buffer.from(imageReader));

		let blockCountX = (width + 3) / 4;
		let blockCountY = (height + 3) / 4;

		for (let y = 0; y < blockCountY; y++){
			for (let x = 0; x < blockCountX; x++){
				this.DecompressDxt5Block(Reader, x, y, blockCountX, width, height, imageData);
			}
		}
		
		return imageData;
	}

	static DecompressDxt5Block(imageReader: any, x: number, y: number, blockCountX: number, width: number, height: number, imageData: Uint8Array) {
		let alpha0 = imageReader.readByte();
		let alpha1 = imageReader.readByte();

		let alphaMask = imageReader.readByte();
		alphaMask += imageReader.readByte() << 8;
		alphaMask += imageReader.readByte() << 16;
		alphaMask += imageReader.readByte() << 24;
		alphaMask += imageReader.readByte() << 32;
		alphaMask += imageReader.readByte() << 40;

		let c0 = imageReader.readUInt16();
		let c1 = imageReader.readUInt16();

		let r0, g0, b0;
		let r1, g1, b1;
		let converted0 = this.ConvertRgb565ToRgb888(c0, r0, g0, b0);
		let converted1 = this.ConvertRgb565ToRgb888(c1, r1, g1, b1);

		r0 = converted0.r;
		g0 = converted0.g;
		b0 = converted0.b;

		r1 = converted1.r;
		g1 = converted1.g;
		b1 = converted1.b;

		let lookupTable = imageReader.readUInt32();

		for (let blockY = 0; blockY < 4; blockY++){
			for (let blockX = 0; blockX < 4; blockX++){
				let r = 0, g = 0, b = 0, a = 255;
				let index = (lookupTable >> 2 * (4 * blockY + blockX)) & 0x03;

				let alphaIndex = ((alphaMask >> 3 * (4 * blockY + blockX)) & 0x07);
				if (alphaIndex == 0){
					a = alpha0;
				}else if (alphaIndex == 1){
					a = alpha1;
				}else if (alpha0 > alpha1){
					a = (((8 - alphaIndex) * alpha0 + (alphaIndex - 1) * alpha1) / 7);
				}else if (alphaIndex == 6){
					a = 0;
				}else if (alphaIndex == 7){
					a = 0xff;
				}else{
					a = (((6 - alphaIndex) * alpha0 + (alphaIndex - 1) * alpha1) / 5);
				}

				switch (index){
					case 0:
						r = r0;
						g = g0;
						b = b0;
						break;
					case 1:
						r = r1;
						g = g1;
						b = b1;
						break;
					case 2:
						r = ((2 * r0 + r1) / 3);
						g = ((2 * g0 + g1) / 3);
						b = ((2 * b0 + b1) / 3);
						break;
					case 3:
						r = ((r0 + 2 * r1) / 3);
						g = ((g0 + 2 * g1) / 3);
						b = ((b0 + 2 * b1) / 3);
						break;
				}

				let px = (x << 2) + blockX;
				let py = (y << 2) + blockY;
				if ((px < width) && (py < height))
				{
					let offset = ((py * width) + px) << 2;
					imageData[offset] = r;
					imageData[offset + 1] = g;
					imageData[offset + 2] = b;
					imageData[offset + 3] = a;
				}
			}
		}
	}

	static ConvertRgb565ToRgb888(color: number, r: number, g: number, b: number){
		let temp;

		temp = (color >> 11) * 255 + 16;
		r = ((temp / 32 + temp) / 32);
		temp = ((color & 0x07E0) >> 5) * 255 + 32;
		g = ((temp / 64 + temp) / 64);
		temp = (color & 0x001F) * 255 + 16;
		b = ((temp / 32 + temp) / 32);

		return {r:r,g:g,b:b};

	}
}
