import React from "react";
import { TabState } from "./";
import { TabImageViewer } from "../../components/tabs/tab-image-viewer/TabImageViewer";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import { PixelManager } from "../../../../utility/PixelManager";

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

export class TabImageViewerState extends TabState {

  tabName: string = `Image Viewer`;
  image: KotOR.TPCObject|KotOR.TGAObject;
  workingData: Uint8Array;
  bitsPerPixel: number;


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
      {
        description: 'Compressed Odyssey Image File',
        accept: {
          'image/*': ['.tpc']
        }
      },
      {
        description: 'TGA Image File',
        accept: {
          'image/*': ['.tga']
        }
      }
    ];
  }

  openFile(file?: EditorFile){
    return new Promise<KotOR.TPCObject|KotOR.TGAObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        file.readFile().then( (response) => {
          switch(file?.ext){
            case 'tga':
              this.image = new KotOR.TGAObject({file: response.buffer, filename: file.resref+'.tga' });
            break;
            case 'tpc':
              this.image = new KotOR.TPCObject({file: response.buffer, filename: file.resref+'.tpc' });
            break;
          }
          
          resolve(this.image);
          this.processEventListener('onEditorFileLoad');
        });
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

  async getExportBuffer(ext?: string): Promise<Uint8Array> {
    if(ext == 'tga'){
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
    }else{
      return super.getExportBuffer(ext);
    }
  }

}