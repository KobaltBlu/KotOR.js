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
              // this.file = file.getLocalPath();
              // this.filename = file.resref + '.tga';
              this.image = new KotOR.TGAObject({file: response.buffer, filename: file.resref+'.tga' });
              // this.$tabName.text(file.getFilename());
            break;
            case 'tpc':
              // this.file = file.getLocalPath();
              // this.filename = file.resref + '.tpc';
              this.image = new KotOR.TPCObject({file: response.buffer, filename: file.resref+'.tpc' });
              // this.$tabName.text(file.getFilename());
            break;
          }
          
          resolve(this.image);
          // this.image.getPixelData( (pixelData: any) => {
            // this.setPixelData(pixelData);
            // resolve(pixelData);
          // });
        });
      }
    });

  }

  // setPixelData(pixelData: Uint8Array){

  //   this.data = pixelData;
  //   this.workingData = pixelData;

  //   this.width = this.image.header.width;
  //   this.height = this.image.header.height;

  //   //If the image is a TPC we will need to times the height by the number of faces
  //   //to correct the height incase we have a cubemap
  //   if(this.image instanceof KotOR.TPCObject){
  //     if(this.image.txi.procedureType == 1){
  //       this.width = this.image.header.width;
  //       this.height = this.image.header.height;
  //     }else{
  //       this.height = this.image.header.height * ((this.image.header as any).faces || 1);
  //     }
  //   }

  //   this.bitsPerPixel = this.image.header.bitsPerPixel;

  //   this.canvas.width = this.width;
  //   this.canvas.height = this.height;
  //   this.$canvas.css({
  //     width: this.width,
  //     height: this.height,
  //     position: 'absolute',
  //     left: 'calc(50% - '+this.width+'px / 2)',
  //     top: 'calc(50% - '+this.height+'px / 2)',
  //   });

  //   let imageData = this.ctx.getImageData(0, 0, this.width, this.height);
  //   let data = imageData.data;

  //   if(this.image instanceof KotOR.TPCObject){

  //     if(this.bitsPerPixel == 24)
  //       this.workingData = TabImageViewerState.PixelDataToRGBA(this.workingData, this.width, this.height);

  //     if(this.bitsPerPixel == 8)
  //       this.workingData = TabImageViewerState.TGAGrayFix(this.workingData);

  //     //FlipY
  //     TabImageViewerState.FlipY(this.workingData, this.width, this.height);

  //   }

  //   if(this.image instanceof KotOR.TGAObject){
      
  //     switch(this.bitsPerPixel){
  //       case 32:
  //         this.workingData = TabImageViewerState.TGAColorFix(this.workingData);
  //       break;
  //       case 24:
  //         //HTML Canvas requires 32bpp pixel data so we will need to add an alpha channel
  //         this.workingData = TabImageViewerState.RGBToRGBA(this.workingData, this.width, this.height);
  //         this.workingData = TabImageViewerState.TGAColorFix(this.workingData);
  //       break;
  //       case 8:
  //         this.workingData = TabImageViewerState.TGAGrayFix(this.workingData);
  //       break;
  //     }

  //     TabImageViewerState.FlipY(this.workingData, this.width, this.height);

  //   }

  //   //Set the preview image to opaque
  //   //this.PreviewAlphaFix(this.workingData);

  //   imageData.data.set(this.workingData);

  //   this.ctx.putImageData(imageData, 0, 0);

  //   this.$canvas.off('click').on('click', (e: any) => {
  //     e.preventDefault();
  //   });

  // }

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