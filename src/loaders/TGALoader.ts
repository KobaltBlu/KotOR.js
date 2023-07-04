/*
 * @author Daosheng Mu / https://github.com/DaoshengMu/
 * @author mrdoob / http://mrdoob.com/
 * @author takahirox / https://github.com/takahirox/
 */

import * as path from "path";
import * as THREE from "three";
import { ResourceLoader } from ".";
import { ResourceTypes } from "../resource/ResourceTypes";
import { TXI } from "../resource/TXI";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { OdysseyTexture } from "../resource/OdysseyTexture";
import { TextureLoader } from "./TextureLoader";
import { GameFileSystem } from "../utility/GameFileSystem";

/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The THREE.TGALoader class is modified from the standard one that comes with THREE.js to include KotOR related stuff like TXI.
 */

export class TGALoader {
	manager: any;
	constructor( manager?: any ){
		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
	}

	load( url: string, onLoad: Function = undefined, onError: Function = undefined ) {
	
		let texture = new OdysseyTexture();
		let found = false;

		ResourceLoader.loadResourceAsync(ResourceTypes.tga, url).then( (buffer: Buffer) => {
			if(!buffer){
				if(typeof onLoad == 'function')
					onLoad( undefined );
				return;
			}
			texture.image = this.parse( buffer, url );
			texture.needsUpdate = true;
			texture.name = url;
			texture.bumpMapType = 'BUMP';
			texture.generateMipmaps = true;

			//Check for TXI info
			ResourceLoader.loadResourceAsync(ResourceTypes.txi, url).then( (txiBuffer: Buffer) => {
				if(typeof txiBuffer !== 'undefined'){
					if ( typeof onLoad !== 'undefined' ) {
						texture.txi = new TXI(txiBuffer);
						if(typeof onLoad == 'function')
							onLoad( texture );
					}
				}else{
					if ( typeof onLoad !== 'undefined' ) {
						texture.txi = new TXI('');
						if(typeof onLoad == 'function')
							onLoad( undefined );
					}
				}
			});
		});
	
	};

	load_override = function ( name: string, onLoad?: Function, onError?: Function ) {

		let dir = path.join('Override');
		
		let scope = this;
		let texture = new OdysseyTexture();
	
		GameFileSystem.readFile(path.join(dir, name)+'.tga').then( (buffer) => {

			texture.image = scope.parse( buffer, name );
			texture.needsUpdate = true;
			texture.name = name;
			texture.bumpMapType = 'BUMP';
			texture.generateMipmaps = true;
	
			GameFileSystem.readFile(path.join(dir, name)+'.txi').then( (txiBuffer) => {
	
				TextureLoader.tpcLoader.fetch(name, (tpcCheck: any) => {

					if(tpcCheck){
						texture.txi = tpcCheck.txi;
						if(typeof onLoad == 'function')
							onLoad( texture );
					}else{
						texture.txi = new TXI('');
						if(typeof onLoad == 'function')
							onLoad( texture );
					}

				});
	
			}).catch( (err) => {
				texture.txi = new TXI('');
				if(typeof onLoad == 'function')
					onLoad( texture );
			})
	
		}).catch( (err) => {
			if(typeof onError == 'function')
				onError( err );

			return;
		})
	
	};
	
	load_local( name: string, onLoad: Function = undefined, onError: Function = undefined ) {
		
		let texture = new OdysseyTexture();
	
		GameFileSystem.readFile(name).then( (buffer) => {
			texture.image = this.parse( buffer, name );
			texture.needsUpdate = true;
			texture.name = name;
			texture.bumpMapType = 'BUMP';
			texture.generateMipmaps = true;
	
			//fs.readFile(path.join(dir, name)+'.txi', (err, txiBuffer) => {
	
				//if(err){
	
					TextureLoader.tpcLoader.fetch(name, (tpcCheck: any) => {
	
						/*if(tpcCheck){
							texture.txi = tpcCheck.txi;
							onLoad( texture );
						}else{*/
							texture.txi = new TXI('');
							if(typeof onLoad == 'function')
								onLoad( texture );
						//}
	
					});
	
				/*}else{
					texture.txi = new TXI(txiBuffer);
					if(typeof onLoad == 'function')
						onLoad( texture );
				}*/
	
			//});
	
		}).catch( (err) => {
			if(typeof onError === 'function')
				onError( err );

			return;
		})
	
	};




	// reference from vthibault, https://github.com/vthibault/roBrowser/blob/master/src/Loaders/Targa.js
	parse( buffer: Buffer, name: string ) {

		// TGA Constants
		let TGA_TYPE_NO_DATA = 0,
		TGA_TYPE_INDEXED = 1,
		TGA_TYPE_RGB = 2,
		TGA_TYPE_GREY = 3,
		TGA_TYPE_RLE_INDEXED = 9,
		TGA_TYPE_RLE_RGB = 10,
		TGA_TYPE_RLE_GREY = 11,

		TGA_ORIGIN_MASK = 0x30,
		TGA_ORIGIN_SHIFT = 0x04,
		TGA_ORIGIN_BL = 0x00,
		TGA_ORIGIN_BR = 0x01,
		TGA_ORIGIN_UL = 0x02,
		TGA_ORIGIN_UR = 0x03;


		if ( buffer.length < 19 )
			console.error( 'THREE.TGALoader.parse: Not enough data to contain header.' );

		let content = new Uint8Array( buffer ),
			offset = 0,
			header = {
				id_length:       content[ offset ++ ],
				colormap_type:   content[ offset ++ ],
				image_type:      content[ offset ++ ],
				colormap_index:  content[ offset ++ ] | content[ offset ++ ] << 8,
				colormap_length: content[ offset ++ ] | content[ offset ++ ] << 8,
				colormap_size:   content[ offset ++ ],

				origin: [
					content[ offset ++ ] | content[ offset ++ ] << 8,
					content[ offset ++ ] | content[ offset ++ ] << 8
				],
				width:      content[ offset ++ ] | content[ offset ++ ] << 8,
				height:     content[ offset ++ ] | content[ offset ++ ] << 8,
				pixel_size: content[ offset ++ ],
				flags:      content[ offset ++ ]
			};

		function tgaCheckHeader( header: any ) {

			switch ( header.image_type ) {

				// Check indexed type
				case TGA_TYPE_INDEXED:
				case TGA_TYPE_RLE_INDEXED:
					if ( header.colormap_length > 256 || header.colormap_size !== 24 || header.colormap_type !== 1 ) {

						console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid type colormap data for indexed type' );

					}
					break;

				// Check colormap type
				case TGA_TYPE_RGB:
				case TGA_TYPE_GREY:
				case TGA_TYPE_RLE_RGB:
				case TGA_TYPE_RLE_GREY:
					if ( header.colormap_type ) {

						console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid type colormap data for colormap type' );

					}
					break;

				// What the need of a file without data ?
				case TGA_TYPE_NO_DATA:
					console.error( 'THREE.TGALoader.parse.tgaCheckHeader: No data' );

				// Invalid type ?
				default:
					console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid type " ' + header.image_type + '"' );

			}

			// Check image width and height
			if ( header.width <= 0 || header.height <= 0 ) {

				console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid image size' );

			}

			// Check image pixel size
			if ( header.pixel_size !== 8  &&
				header.pixel_size !== 16 &&
				header.pixel_size !== 24 &&
				header.pixel_size !== 32 ) {

				console.error( 'THREE.TGALoader.parse.tgaCheckHeader: Invalid pixel size "' + header.pixel_size + '"' );

			}

		}

		// Check tga if it is valid format
		tgaCheckHeader( header );

		if ( header.id_length + offset > buffer.length ) {

			console.error( 'THREE.TGALoader.parse: No data' );

		}

		// Skip the needn't data
		offset += header.id_length;

		// Get targa information about RLE compression and palette
		let use_rle = false,
			use_pal = false,
			use_grey = false;

		switch ( header.image_type ) {

			case TGA_TYPE_RLE_INDEXED:
				use_rle = true;
				use_pal = true;
				break;

			case TGA_TYPE_INDEXED:
				use_pal = true;
				break;

			case TGA_TYPE_RLE_RGB:
				use_rle = true;
				break;

			case TGA_TYPE_RGB:
				break;

			case TGA_TYPE_RLE_GREY:
				use_rle = true;
				use_grey = true;
				break;

			case TGA_TYPE_GREY:
				use_grey = true;
				break;

		}

		// Parse tga image buffer
		function tgaParse( use_rle: any, use_pal: any, header: any, offset: any, data: any, face = 0 ) {

			let pixel_data,
				pixel_size,
				pixel_total,
				palettes;

			pixel_size = header.pixel_size >> 3;
			pixel_total = header.width * header.height * pixel_size;

			offset += (pixel_total * face);

			// Read palettes
			if ( use_pal ) {

				palettes = data.subarray( offset, offset += header.colormap_length * ( header.colormap_size >> 3 ) );

			}

			// Read RLE
			if ( use_rle ) {

				pixel_data = new Uint8Array( pixel_total );

				let c, count, i;
				let shift = 0;
				let pixels = new Uint8Array( pixel_size );

				while ( shift < pixel_total ) {

					c     = data[ offset ++ ];
					count = ( c & 0x7f ) + 1;

					// RLE pixels.
					if ( c & 0x80 ) {

						// Bind pixel tmp array
						for ( i = 0; i < pixel_size; ++ i ) {

							pixels[ i ] = data[ offset ++ ];

						}

						// Copy pixel array
						for ( i = 0; i < count; ++ i ) {

							pixel_data.set( pixels, shift + i * pixel_size );

						}

						shift += pixel_size * count;

					} else {

						// Raw pixels.
						count *= pixel_size;
						for ( i = 0; i < count; ++ i ) {

							pixel_data[ shift + i ] = data[ offset ++ ];

						}
						shift += count;

					}

				}

			} else {

				// RAW Pixels
				pixel_data = data.subarray(
					offset, offset += ( use_pal ? header.width * header.height : pixel_total )
				);

			}

			return {
				pixel_data: pixel_data,
				palettes: palettes
			};

		}

		function tgaGetImageData8bits( imageData: any, y_start: any, y_step: any, y_end: any, x_start: any, x_step: any, x_end: any, image: any, palettes: any ) {

			let colormap = palettes;
			let color, i = 0, x, y;
			let width = header.width;

			for ( y = y_start; y !== y_end; y += y_step ) {

				for ( x = x_start; x !== x_end; x += x_step, i ++ ) {

					color = image[ i ];
					imageData[ ( x + width * y ) * 4 + 3 ] = 255;
					imageData[ ( x + width * y ) * 4 + 2 ] = colormap[ ( color * 3 ) + 0 ];
					imageData[ ( x + width * y ) * 4 + 1 ] = colormap[ ( color * 3 ) + 1 ];
					imageData[ ( x + width * y ) * 4 + 0 ] = colormap[ ( color * 3 ) + 2 ];

				}

			}

			return imageData;

		}

		function tgaGetImageData16bits( imageData: any, y_start: any, y_step: any, y_end: any, x_start: any, x_step: any, x_end: any, image: any ) {

			let color, i = 0, x, y;
			let width = header.width;

			for ( y = y_start; y !== y_end; y += y_step ) {

				for ( x = x_start; x !== x_end; x += x_step, i += 2 ) {

					color = image[ i + 0 ] + ( image[ i + 1 ] << 8 ); // Inversed ?
					imageData[ ( x + width * y ) * 4 + 0 ] = ( color & 0x7C00 ) >> 7;
					imageData[ ( x + width * y ) * 4 + 1 ] = ( color & 0x03E0 ) >> 2;
					imageData[ ( x + width * y ) * 4 + 2 ] = ( color & 0x001F ) >> 3;
					imageData[ ( x + width * y ) * 4 + 3 ] = ( color & 0x8000 ) ? 0 : 255;

				}

			}

			return imageData;

		}

		function tgaGetImageData24bits( imageData: any, y_start: any, y_step: any, y_end: any, x_start: any, x_step: any, x_end: any, image: any ) {

			let i = 0, x, y;
			let width = header.width;

			for ( y = y_start; y !== y_end; y += y_step ) {

				for ( x = x_start; x !== x_end; x += x_step, i += 3 ) {

					imageData[ ( x + width * y ) * 4 + 3 ] = 255;
					imageData[ ( x + width * y ) * 4 + 2 ] = image[ i + 0 ];
					imageData[ ( x + width * y ) * 4 + 1 ] = image[ i + 1 ];
					imageData[ ( x + width * y ) * 4 + 0 ] = image[ i + 2 ];

				}

			}

			return imageData;

		}

		function tgaGetImageData32bits( imageData: any, y_start: any, y_step: any, y_end: any, x_start: any, x_step: any, x_end: any, image: any ) {

			let i = 0, x, y;
			let width = header.width;

			for ( y = y_start; y !== y_end; y += y_step ) {

				for ( x = x_start; x !== x_end; x += x_step, i += 4 ) {

					imageData[ ( x + width * y ) * 4 + 2 ] = image[ i + 0 ];
					imageData[ ( x + width * y ) * 4 + 1 ] = image[ i + 1 ];
					imageData[ ( x + width * y ) * 4 + 0 ] = image[ i + 2 ];
					imageData[ ( x + width * y ) * 4 + 3 ] = image[ i + 3 ];

				}

			}

			return imageData;

		}

		function tgaGetImageDataGrey8bits( imageData: any, y_start: any, y_step: any, y_end: any, x_start: any, x_step: any, x_end: any, image: any ) {

			let color, i = 0, x, y;
			let width = header.width;

			for ( y = y_start; y !== y_end; y += y_step ) {

				for ( x = x_start; x !== x_end; x += x_step, i ++ ) {

					color = image[ i ];
					imageData[ ( x + width * y ) * 4 + 0 ] = color;
					imageData[ ( x + width * y ) * 4 + 1 ] = color;
					imageData[ ( x + width * y ) * 4 + 2 ] = color;
					imageData[ ( x + width * y ) * 4 + 3 ] = 255;

				}

			}

			return imageData;

		}

		function tgaGetImageDataGrey16bits( imageData: any, y_start: any, y_step: any, y_end: any, x_start: any, x_step: any, x_end: any, image: any ) {

			let i = 0, x, y;
			let width = header.width;

			for ( y = y_start; y !== y_end; y += y_step ) {

				for ( x = x_start; x !== x_end; x += x_step, i += 2 ) {

					imageData[ ( x + width * y ) * 4 + 0 ] = image[ i + 0 ];
					imageData[ ( x + width * y ) * 4 + 1 ] = image[ i + 0 ];
					imageData[ ( x + width * y ) * 4 + 2 ] = image[ i + 0 ];
					imageData[ ( x + width * y ) * 4 + 3 ] = image[ i + 1 ];

				}

			}

			return imageData;

		}

		function getTgaRGBA( data: any, width: any, height: any, image: any, palette: any ) {

			let x_start,
				y_start,
				x_step,
				y_step,
				x_end,
				y_end;

			switch ( ( header.flags & TGA_ORIGIN_MASK ) >> TGA_ORIGIN_SHIFT ) {
				default:
				case TGA_ORIGIN_UL:
					x_start = 0;
					x_step = 1;
					x_end = width;
					y_start = 0;
					y_step = 1;
					y_end = height;
					break;

				case TGA_ORIGIN_BL:
					x_start = 0;
					x_step = 1;
					x_end = width;
					y_start = height - 1;
					y_step = - 1;
					y_end = - 1;
					break;

				case TGA_ORIGIN_UR:
					x_start = width - 1;
					x_step = - 1;
					x_end = - 1;
					y_start = 0;
					y_step = 1;
					y_end = height;
					break;

				case TGA_ORIGIN_BR:
					x_start = width - 1;
					x_step = - 1;
					x_end = - 1;
					y_start = height - 1;
					y_step = - 1;
					y_end = - 1;
					break;

			}

			if ( use_grey ) {

				switch ( header.pixel_size ) {
					case 8:
						tgaGetImageDataGrey8bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
						break;
					case 16:
						tgaGetImageDataGrey16bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
						break;
					default:
						console.error( 'THREE.TGALoader.parse.getTgaRGBA: not support this format' );
						break;
				}

			} else {

				switch ( header.pixel_size ) {
					case 8:
						tgaGetImageData8bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image, palette );
						break;

					case 16:
						tgaGetImageData16bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
						break;

					case 24:
						tgaGetImageData24bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
						break;

					case 32:
						tgaGetImageData32bits( data, y_start, y_step, y_end, x_start, x_step, x_end, image );
						break;

					default:
						console.error( 'THREE.TGALoader.parse.getTgaRGBA: not support this format' );
						break;
				}

			}

			// Load image data according to specific method
			// let func = 'tgaGetImageData' + (use_grey ? 'Grey' : '') + (header.pixel_size) + 'bits';
			// func(data, y_start, y_step, y_end, x_start, x_step, x_end, width, image, palette );
			return data;

		}

		let canvas: HTMLCanvasElement;
		let faces = (header.height / header.width) == 6 ? 6 : 1;

		if(faces == 1){
			canvas = document.createElement( 'canvas' );
			canvas.width = header.width;
			canvas.height = header.height;

			let context = canvas.getContext( '2d' );
			let imageData = context.createImageData( header.width, header.height );

			let result = tgaParse( use_rle, use_pal, header, offset, content, 0 );
			let rgbaData = getTgaRGBA( imageData.data, header.width, header.height, result.pixel_data, result.palettes );

			context.putImageData( imageData, 0, 0 );
			return canvas;
		}

		let canvases = [];
		for(let i = 0; i < faces; i++){
			canvas = document.createElement( 'canvas' );
			canvas.width = header.width;
			canvas.height = header.width;
			header.height = header.width;

			let context = canvas.getContext( '2d' );
			let imageData = context.createImageData( header.width, header.width );
			let result = tgaParse( use_rle, use_pal, header, offset, content, i );
			let rgbaData = getTgaRGBA( imageData.data, header.width, header.width, result.pixel_data, result.palettes );

			context.putImageData( imageData, 0, 0 );

			/*switch(i){
				case 0:
					canvases[0] = canvas;
				break;
				case 1:
					canvases[1] = canvas;
				break;
				case 2:
					canvases[2] = canvas;
				break;
				case 3:
					canvases[3] = canvas;
				break;
				case 4:
					canvases[4] = canvas;
				break;
				case 5:
					canvases[5] = canvas;
				break;
			}*/

			//offset += ( (header.width + header.width) * 5 );
			canvases.push(canvas);
		}

		return canvases;

	};

}
