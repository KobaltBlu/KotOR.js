importScripts("../js/libs/squish.js");
importScripts("../js/PixelManager.js");

function concatenate (resultConstructor, ...arrays) {
    let totalLength = 0;
    for (let arr of arrays) {
        totalLength += arr.length;
    }
    let result = new resultConstructor(totalLength);
    let offset = 0;
    for (let arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

onmessage = function (e){

  let Header = e.data.Header;
  let PixelFormat = e.data.PixelFormat;
  let buffer = Uint8Array.from(e.data.buffer);

  let dataOffset = 128;
	let imagePixels = new Uint8Array(0);

  for ( let face = 0; face < Header.faces; face ++ ) {

		let width = Header.width;
		let height = Header.height;
    let dataSize = Header.dataSize;

    //console.log(width, height);

    for ( let i = 0; i < Header.mipMapCount; i++ ) {

      let byteArray = new Uint8Array(0);

      if(i == 0){
        if ( Header.compressed == false ) {

          let dataLength = dataSize;
          byteArray = new Uint8Array( buffer.buffer, dataOffset, dataLength );

          if(Header.minDataSize == 4)
            Header.bitsPerPixel = 32;

          if(Header.minDataSize == 3)
            Header.bitsPerPixel = 24;

          if(Header.minDataSize == 1)
            Header.bitsPerPixel = 8;
        } else {
          //let dataLength = dataSize;//Math.max( 4, width ) / 4 * Math.max( 4, height ) / 4 * Header.minDataSize;
          let dataLength = 0;//Math.max(Header.minDataSize, Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * Header.minDataSize);

          let pixel_bytes = 1;
          if(Header.format == PixelFormat.DXT1){
            pixel_bytes = 0.5;
          }

          if (Header.compressed && (width % 4 || height % 4)) {
            dataLength = Math.max(Header.minDataSize, parseInt((width + 3) / 4) * parseInt((height + 3) / 4) * Header.minDataSize);
          } else {
            dataLength = Math.max(Header.minDataSize, width * height * pixel_bytes);
          }
          
          if(Header.format == PixelFormat.DXT5){
            //dataLength = Math.max(Header.minDataSize, Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * Header.minDataSize);
            let pEncode = new Uint8Array(buffer.buffer, dataOffset, dataLength);
            byteArray = new Uint8Array(width * height * 4);
            Decode(byteArray, width, height, pEncode, kDxt5);
            Header.bitsPerPixel = 32;
          }else if(Header.format == PixelFormat.DXT1){
            //dataLength = Math.max(Header.minDataSize, 256 * 256 * 0.5);
            let pEncode = new Uint8Array(buffer.buffer, dataOffset, dataLength);
            byteArray = new Uint8Array(width * height * 4);
            Decode(byteArray, width, height, pEncode, kDxt1);
            Header.bitsPerPixel = 32;
          }else{
            console.error('Image Type Not Found', Header, isRGBAUncompressed)
          }
          dataSize = dataLength;
        }

        if(Header.faces == 6){
          switch(face){
            case 3:
              console.log('Face 4')
              byteArray = PixelManager.Rotate90deg(PixelManager.Rotate90deg(byteArray, 4, width, height), 4, width, height);
            break;
            case 1:
              byteArray = PixelManager.Rotate90deg(byteArray, 4, width, height);
            break;
            case 0:
              byteArray = PixelManager.Rotate90deg(PixelManager.Rotate90deg(PixelManager.Rotate90deg(byteArray, 4, width, height), 4, width, height), 4, width, height);
            break;
          }
        }


        imagePixels = concatenate(Uint8Array, imagePixels, byteArray);
      }

      dataOffset += dataSize;

      width = Math.max( width >> 1, 1 );
      height = Math.max( height >> 1, 1 );
      dataSize = Math.max( dataSize >> 2, Header.minDataSize );

    }

  }

  postMessage(imagePixels, [imagePixels.buffer]);

}
