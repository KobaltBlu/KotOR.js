import { PixelManager } from "../utility/PixelManager";
import { TPCObject } from "../resource/TPCObject";

function concatenate (resultConstructor: any, ...arrays: any) {
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

onmessage = function (e: any = {}){
  if(!e.data || !e.data.buffer) return;
  let tpc = new TPCObject({
    file: new Uint8Array(e.data.buffer)
  });
  tpc.header = e.data.Header;

  const dds = tpc.getDDS(false);
  let imagePixels = new Uint8Array(0);

  const width = tpc.header.width;
  const height = tpc.header.height;
  const mipmapCount = 1;

  if(!tpc.txi.procedureType){
    for ( let face = 0; face < tpc.header.faces; face ++ ) {
      for ( let i = 0; i < mipmapCount; i++ ) {
        const mipmap = dds.mipmaps[face + (i * dds.mipmapCount)];
        if(tpc.header.faces == 6){
          switch(face){
            case 3:
              mipmap.data = PixelManager.Rotate90deg(PixelManager.Rotate90deg(mipmap.data, 4, width, height), 4, width, height);
            break;
            case 1:
              mipmap.data = PixelManager.Rotate90deg(mipmap.data, 4, width, height);
            break;
            case 0:
              mipmap.data = PixelManager.Rotate90deg(PixelManager.Rotate90deg(PixelManager.Rotate90deg(mipmap.data, 4, width, height), 4, width, height), 4, width, height);
            break;
          }
        }
        imagePixels = concatenate(Uint8Array, imagePixels, mipmap.data);
      }
    }
  }else{
    imagePixels = concatenate(Uint8Array, imagePixels, dds.mipmaps[0].data);
  }
  
  postMessage(imagePixels, [imagePixels.buffer]);
}
