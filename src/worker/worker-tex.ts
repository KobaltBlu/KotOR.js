import { ITPCHeader } from "../interface/resource/ITPCHeader";
import { TPCObject } from "../resource/TPCObject";
import { PixelManager } from "../utility/PixelManager";

function concatenate (...arrays: Uint8Array[]) {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

self.onmessage = function (e: MessageEvent){
  if(!e.data || !e.data.buffer) return;
  const tpc = new TPCObject({
    file: new Uint8Array(e.data.buffer as ArrayBuffer)
  });
  tpc.header = e.data.Header as ITPCHeader;

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
        imagePixels = concatenate(imagePixels, mipmap.data);
      }
    }
  }else{
    imagePixels = concatenate(imagePixels, dds.mipmaps[0].data);
  }
  
  self.postMessage(imagePixels, { transfer: [imagePixels.buffer] });
}
