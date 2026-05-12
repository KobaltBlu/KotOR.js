import React from "react";
import { TabState } from "@/apps/forge/states/tabs";
import { TabImageViewer } from "@/apps/forge/components/tabs/tab-image-viewer/TabImageViewer";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import { PixelManager } from "@/utility/PixelManager";
import { BinaryWriter } from "@/utility/binary/BinaryWriter";
import { ENCODING } from "@/enums/graphics/tpc/Encoding";
import { PixelFormat } from "@/enums/graphics/tpc/PixelFormat";
import type { ITPCHeader } from "@/interface/resource/ITPCHeader";
import { TXI } from "@/resource/TXI";
// @ts-ignore
import * as dxtJs from "dxt-js";

const concatenate = (resultConstructor: any, ...arrays: any) => {
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

const TPC_HEADER_LENGTH = 128;

type TPCExportPolicy = {
  alphaPolicy: "opaque-threshold" | "strict-alpha";
  opaqueAlphaThreshold: number;
  mipPolicy: "full-chain" | "single-level";
};

const TPC_EXPORT_POLICY: TPCExportPolicy = {
  alphaPolicy: "opaque-threshold",
  opaqueAlphaThreshold: 250,
  mipPolicy: "full-chain",
};

export class TabImageViewerState extends TabState {

  tabName: string = `Image Viewer`;
  image: KotOR.TPCObject|KotOR.TGAObject|ForgeRasterImage;
  workingData: Uint8Array;
  bitsPerPixel: number;
  private forcedExportExt?: 'tga' | 'png' | 'jpg' | 'tpc';
  private txiText: string = "";

  private static isRasterImage(image: any): image is ForgeRasterImage {
    return !!image && (image.kind === 'png' || image.kind === 'jpg' || image.kind === 'jpeg');
  }

  private static decodeImage(buffer: Uint8Array, kind: 'png'|'jpg'|'jpeg'): Promise<ForgeRasterImage> {
    return new Promise<ForgeRasterImage>((resolve, reject) => {
      try{
        const mimeType = kind === 'png' ? 'image/png' : 'image/jpeg';
        const blobPart = new ArrayBuffer(buffer.byteLength);
        new Uint8Array(blobPart).set(buffer);
        const blob = new Blob([blobPart], { type: mimeType });
        const objectURL = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          try{
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if(!ctx){
              URL.revokeObjectURL(objectURL);
              reject(new Error(`Failed to get 2d canvas context for ${kind.toUpperCase()} decode`));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const rgba = ctx.getImageData(0, 0, width, height).data;
            URL.revokeObjectURL(objectURL);
            resolve({
              kind,
              header: {
                width,
                height,
                bitsPerPixel: 32,
              },
              pixelData: new Uint8Array(rgba),
            });
          }catch(e){
            URL.revokeObjectURL(objectURL);
            reject(e);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectURL);
          reject(new Error(`Failed to decode ${kind.toUpperCase()} image`));
        };
        img.src = objectURL;
      }catch(e){
        reject(e);
      }
    });
  }

  private static getSaveTypeForExtension(ext: string): any{
    switch(ext.toLowerCase()){
      case 'tpc':
        return {
          description: 'Compressed Odyssey Image File',
          accept: {
            'image/*': ['.tpc']
          }
        };
      case 'tga':
        return {
          description: 'TGA Image File',
          accept: {
            'image/*': ['.tga']
          }
        };
      case 'png':
        return {
          description: 'PNG Image File',
          accept: {
            'image/*': ['.png']
          }
        };
      case 'jpg':
        return {
          description: 'JPG Image File',
          accept: {
            'image/*': ['.jpg']
          }
        };
      default:
        return undefined;
    }
  }


  constructor(options: BaseTabStateOptions = {}){
    super(options);
    // this.singleInstance = true;
    this.isClosable = true;

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.setContentView(<TabImageViewer tab={this}></TabImageViewer>);
    this.openFile();

    this.saveTypes = [
      TabImageViewerState.getSaveTypeForExtension('tpc'),
      TabImageViewerState.getSaveTypeForExtension('tga'),
      TabImageViewerState.getSaveTypeForExtension('png'),
      TabImageViewerState.getSaveTypeForExtension('jpg')
    ];
  }

  async exportAs(ext: 'tga' | 'png' | 'jpg' | 'tpc'){
    const saveType = TabImageViewerState.getSaveTypeForExtension(ext);
    if(!saveType){
      return false;
    }

    const previousSaveTypes = this.saveTypes;
    const previousForcedExportExt = this.forcedExportExt;
    const previousFileExt = this.file?.ext;
    this.saveTypes = [saveType];
    this.forcedExportExt = ext;
    if(this.file){
      // Ensure Save As suggests the requested export extension instead of the
      // source file extension (e.g. opening .png then exporting .tga).
      this.file.ext = ext;
    }
    try{
      return await this.saveAs();
    }finally{
      this.forcedExportExt = previousForcedExportExt;
      this.saveTypes = previousSaveTypes;
      if(this.file){
        this.file.ext = previousFileExt;
      }
    }
  }

  openFile(file?: EditorFile){
    return new Promise<KotOR.TPCObject|KotOR.TGAObject|ForgeRasterImage>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        file.readFile().then( async (response) => {
          switch(file?.ext){
            case 'tga':
              this.image = new KotOR.TGAObject({file: response.buffer, filename: file.resref+'.tga' });
              this.txiText = "";
            break;
            case 'tpc':
              this.image = new KotOR.TPCObject({file: response.buffer, filename: file.resref+'.tpc' });
              this.txiText = this.image.txi?.info || "";
            break;
            case 'png':
              this.image = await TabImageViewerState.decodeImage(response.buffer, 'png');
              this.txiText = "";
            break;
            case 'jpg':
              this.image = await TabImageViewerState.decodeImage(response.buffer, 'jpg');
              this.txiText = "";
            break;
            case 'jpeg':
              this.image = await TabImageViewerState.decodeImage(response.buffer, 'jpeg');
              this.txiText = "";
            break;
          }
          
          resolve(this.image);
          this.processEventListener('onEditorFileLoad');
        }).catch(reject);
      }
    });

  }

  getPixelData(): Promise<Uint8Array>{
    return new Promise<Uint8Array>( (resolve, reject) => {
      if(this.image instanceof KotOR.TPCObject){
        const tpc = this.image;
        const dds = tpc.getDDS(false);
        let imagePixels = new Uint8Array(0);

        const width = tpc.header.width;
        const height = tpc.header.height;
        const mipmapCount = 1;

        if(!tpc.txi.procedureType){
          if(tpc.header.faces > 1){
            for ( let face = 0; face < tpc.header.faces; face ++ ) {
              for ( let i = 0; i < 1; i++ ) {
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
        }else{
          imagePixels = concatenate(Uint8Array, imagePixels, dds.mipmaps[0].data);
        }
        resolve(imagePixels);
      }else if(TabImageViewerState.isRasterImage(this.image)){
        resolve(new Uint8Array(this.image.pixelData));
      }else{
        this.image.getPixelData( (buffer: Uint8Array) => {
          resolve(new Uint8Array(buffer));
        })
      }
    });
  }

  static FlipY(pixelData: Uint8Array, width = 1, height = 1){
    let offset = 0;
    let stride = width * 4;

    let unFlipped = Uint8Array.from(pixelData);

    for (let pos = unFlipped.length - stride; pos >= 0; pos -= stride) {
      pixelData.set(unFlipped.slice(pos, pos + stride), offset);
      offset += stride;
    }
  }

  static FlipX(pixelData: Uint8Array, width = 1, height = 1){
    let unFlipped = Uint8Array.from(pixelData);

    for (let i = 0; i < pixelData.length; i++) {
      pixelData[i] = (unFlipped[i - 2 * (i % width) + width - 1]);
    }
  }

  static PixelDataToRGBA(pixelData: Uint8Array, width = 1, height = 1){
    let data = new Uint8Array(pixelData.length);
    let n = 4 * width * height;
    let s = 0, d = 0;
    while (d < n) {
      data[d++] = pixelData[s++];
      data[d++] = pixelData[s++];
      data[d++] = pixelData[s++];
      data[d++] = pixelData[s++];
    }
    return data;
  }

  static RGBToRGBA(pixelData: Uint8Array, width = 1, height = 1){
    let data = new Uint8Array(4 * width * height);
    let n = 4 * width * height;
    let s = 0, d = 0;
    while (d < n) {
      data[d++] = pixelData[s++];
      data[d++] = pixelData[s++];
      data[d++] = pixelData[s++];
      data[d++] = 255;
    }
    return data;
  }

  static BGRAtoRGBA(pixelData: Uint8Array){
    for (let i = 0; i < pixelData.length; i += 4) {
      pixelData[i    ] = pixelData[i + 2]; // red
      pixelData[i + 1] = pixelData[i + 1]; // green
      pixelData[i + 2] = pixelData[i    ]; // blue
      pixelData[i + 3] = pixelData[i + 3]; // alpha
    }
  }

  static TGAGrayFix(pixelData: Uint8Array){
    let fixed = new Uint8Array(pixelData.length * 4);
    for (let i = 0; i < pixelData.length; i++) {

      let color = pixelData[i];
      let offset = i * 4;

      fixed[offset    ] = color; // red
      fixed[offset + 1] = color; // green
      fixed[offset + 2] = color; // blue
      fixed[offset + 3] = 255; // alpha
    }
    return fixed;
  }

  static TGAColorFix(pixelData: Uint8Array){
    let fixed = Uint8Array.from(pixelData);
    for (let i = 0; i < pixelData.length; i += 4) {
      fixed[i + 2] = pixelData[i    ]; // red
      fixed[i + 1] = pixelData[i + 1]; // green
      fixed[i    ] = pixelData[i + 2]; // blue
      fixed[i + 3] = pixelData[i + 3]; // alpha
    }
    return fixed;
  }

  static PreviewAlphaFix(pixelData: Uint8Array){
    for (let i = 0; i < pixelData.length; i += 4){
      pixelData[i + 3] = 255;
    }
  }

  getTXIText(): string {
    if(this.txiText){
      return this.txiText;
    }
    if(this.image instanceof KotOR.TPCObject){
      return this.image.txi?.info || "";
    }
    return this.txiText || "";
  }

  setTXIText(text: string): void {
    this.txiText = text || "";
  }

  applyTXIText(text: string): void {
    this.txiText = text || "";
    if(this.image instanceof KotOR.TPCObject){
      this.image.txi = new TXI(this.txiText);
    }
  }

  private static hasMeaningfulAlpha(pixelData: Uint8Array, policy: TPCExportPolicy): boolean {
    if(policy.alphaPolicy === "strict-alpha"){
      for(let i = 3; i < pixelData.length; i += 4){
        if(pixelData[i] < 255){
          return true;
        }
      }
      return false;
    }

    for(let i = 3; i < pixelData.length; i += 4){
      if(pixelData[i] < policy.opaqueAlphaThreshold){
        return true;
      }
    }
    return false;
  }

  private static generateMipDimensions(width: number, height: number, policy: TPCExportPolicy){
    const count = policy.mipPolicy === "single-level"
      ? 1
      : KotOR.TPCObject.generateMipMapCountForDimensions(width, height);

    const levels: { width: number; height: number }[] = [];
    let w = width;
    let h = height;
    for(let i = 0; i < count; i++){
      levels.push({ width: w, height: h });
      w = Math.max(w >> 1, 1);
      h = Math.max(h >> 1, 1);
    }
    return levels;
  }

  private static resizeRGBA(pixelData: Uint8Array, srcW: number, srcH: number, dstW: number, dstH: number): Uint8Array {
    if(srcW === dstW && srcH === dstH){
      return new Uint8Array(pixelData);
    }
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = srcW;
    srcCanvas.height = srcH;
    const srcCtx = srcCanvas.getContext("2d");
    if(!srcCtx){
      return new Uint8Array(pixelData);
    }
    const srcImage = srcCtx.createImageData(srcW, srcH);
    srcImage.data.set(pixelData);
    srcCtx.putImageData(srcImage, 0, 0);

    const dstCanvas = document.createElement("canvas");
    dstCanvas.width = dstW;
    dstCanvas.height = dstH;
    const dstCtx = dstCanvas.getContext("2d");
    if(!dstCtx){
      return new Uint8Array(pixelData);
    }
    dstCtx.imageSmoothingEnabled = true;
    dstCtx.imageSmoothingQuality = "high";
    dstCtx.drawImage(srcCanvas, 0, 0, srcW, srcH, 0, 0, dstW, dstH);
    return new Uint8Array(dstCtx.getImageData(0, 0, dstW, dstH).data);
  }

  private async getRGBAForExport(width: number, height: number): Promise<Uint8Array> {
    let pixelData = await this.getPixelData();
    const bitsPerPixel = this.image?.header?.bitsPerPixel || 32;

    if(this.image instanceof KotOR.TPCObject){
      // TPC decode path returns RGBA-converted buffers for all encodings.
      TabImageViewerState.FlipY(pixelData, width, height);
      return pixelData;
    }

    if(this.image instanceof KotOR.TGAObject){
      switch(bitsPerPixel){
        case 32:
          pixelData = TabImageViewerState.TGAColorFix(pixelData);
        break;
        case 24:
          pixelData = TabImageViewerState.RGBToRGBA(pixelData, width, height);
          pixelData = TabImageViewerState.TGAColorFix(pixelData);
        break;
        case 8:
          pixelData = TabImageViewerState.TGAGrayFix(pixelData);
        break;
      }
      TabImageViewerState.FlipY(pixelData, width, height);
      return pixelData;
    }

    return new Uint8Array(pixelData);
  }

  private async buildTPCExportBuffer(): Promise<Uint8Array> {
    if(!this.image || !this.image.header){
      return new Uint8Array(0);
    }

    const width = this.image.header.width;
    const height = this.image.header.height;
    const level0RGBA = await this.getRGBAForExport(width, height);
    const hasAlpha = TabImageViewerState.hasMeaningfulAlpha(level0RGBA, TPC_EXPORT_POLICY);
    const encoding = hasAlpha ? ENCODING.RGBA : ENCODING.RGB;
    const dxtFormat = hasAlpha ? dxtJs.flags.DXT5 : dxtJs.flags.DXT1;

    const mipLevels = TabImageViewerState.generateMipDimensions(width, height, TPC_EXPORT_POLICY);
    const compressedLevels: Uint8Array[] = [];

    for(const level of mipLevels){
      const rgba = TabImageViewerState.resizeRGBA(level0RGBA, width, height, level.width, level.height);
      const compressed = dxtJs.compress(rgba, level.width, level.height, dxtFormat);
      const expectedLength = KotOR.TPCObject.getCompressedMipByteLength(level.width, level.height, encoding);
      if(compressed.length !== expectedLength){
        console.warn("TPC export mip byte-size mismatch", {
          expectedLength,
          actualLength: compressed.length,
          width: level.width,
          height: level.height,
        });
      }
      compressedLevels.push(new Uint8Array(compressed));
    }

    const mipMapCount = compressedLevels.length;
    const minDataSize = encoding == ENCODING.RGB ? 8 : 16;
    const dataSize = KotOR.TPCObject.getCompressedMipByteLength(width, height, encoding);

    const header: ITPCHeader = {
      dataSize,
      alphaTest: 1.0,
      width,
      height,
      encoding,
      mipMapCount,
      bytesPerPixel: 4,
      bitsPerPixel: 32,
      minDataSize,
      compressed: true,
      hasAlpha,
      format: hasAlpha ? PixelFormat.DXT5 : PixelFormat.DXT1,
      isCubemap: false,
      faces: 1,
    };

    const writer = new BinaryWriter(new Uint8Array(0));
    writer.writeUInt32(header.dataSize);
    writer.writeSingle(header.alphaTest);
    writer.writeUInt16(header.width);
    writer.writeUInt16(header.height);
    writer.writeUInt8(header.encoding);
    writer.writeUInt8(header.mipMapCount);
    while(writer.tell() < TPC_HEADER_LENGTH){
      writer.writeUInt8(0);
    }

    for(const mip of compressedLevels){
      writer.writeBytes(mip);
    }

    const txiText = this.getTXIText().trim();
    if(txiText.length){
      writer.writeStringNullTerminated(`${txiText}\n`);
    }

    return writer.buffer;
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    const normalizedExt = (this.forcedExportExt || ext || '').replace('.', '').toLowerCase();

    if(normalizedExt == 'tga'){
      const tga = new KotOR.TGAObject();
      tga.header = {
        ID: 0,
        ColorMapType: 0,
        FileType: 2,
        ColorMapIndex: 0,
        offsetX: 0,
        offsetY: 0,
        width: this.image.header.width,
        height: this.image.header.height,
        bitsPerPixel: 32,
        imageDescriptor: 0,
        hasColorMap: false,
        pixelDataOffset: 0,
      };
      tga.pixelData = TabImageViewerState.TGAColorFix(await this.getPixelData());
      return tga.toExportBuffer();
    }

    if(normalizedExt == 'png' || normalizedExt == 'jpg' || normalizedExt == 'jpeg'){
      if(!this.image || !this.image.header){
        return new Uint8Array(0);
      }
      const width = this.image.header.width;
      const height = this.image.header.height;
      const pixelData = await this.getRGBAForExport(width, height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if(!ctx){
        return new Uint8Array(0);
      }
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixelData);
      ctx.putImageData(imageData, 0, 0);

      const outputMime = normalizedExt == 'png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), outputMime, 0.92);
      });
      if(!blob){
        return new Uint8Array(0);
      }
      return new Uint8Array(await blob.arrayBuffer());
    }

    if(normalizedExt == 'tpc'){
      return this.buildTPCExportBuffer();
    }
    
    return super.getExportBuffer(resref, ext);
  }

}

export interface ForgeRasterImage {
  kind: 'png'|'jpg'|'jpeg';
  header: {
    width: number;
    height: number;
    bitsPerPixel: number;
  };
  pixelData: Uint8Array;
}