import React from "react";
import { TabState } from "./";
import { TabImageViewer } from "../../components/tabs/TabImageViewer";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";

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
        const worker = new Worker('worker-tex.js'); 
    
        worker.addEventListener('message', function(e) {
          resolve(new Uint8Array(e.data));
        }, false);
    
        worker.postMessage({
          Header: this.image.header,
          buffer: this.image.file,
          txi: this.image.txi
        }, [this.image.file.buffer]);
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

}