import { dialog } from "electron";
import { BinaryWriter } from "../../BinaryWriter";
import { TGAObject } from "../../resource/TGAObject";
import { TPCObject } from "../../resource/TPCObject";
import { EditorFile } from "../EditorFile";
import { EditorTab } from "../EditorTab";
import { Modal } from "../Modal";



export class ImageViewerTab extends EditorTab {
  $contentWrapper: JQuery<HTMLElement>;
  $canvas: JQuery<HTMLElement>;
  canvas: any;
  ctx: any;
  data: Uint8Array;
  workingData: Uint8Array;
  image: any;
  file: any;
  filename: string;
  width: any;
  height: any;
  bitsPerPixel: any;
  constructor(file: EditorFile){
    super();

    $('a', this.$tab).text('Image Viewer');

    this.$contentWrapper = $('<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: scroll;" />');

    this.$canvas = $('<canvas class="checkerboard" style="width: 512px; height: 512px; top: calc(50% - 512px / 2); left: calc(50% - 512px / 2); position: absolute;" />');
    this.canvas = this.$canvas[0];
    this.ctx = this.canvas.getContext('2d');
    this.$contentWrapper.append(this.$canvas);
    this.$tabContent.append(this.$contentWrapper);

    this.data = new Uint8Array(0);
    this.workingData = new Uint8Array(0);

    window.addEventListener('resize', () => {
      try{
        this.TabSizeUpdate();
      }catch(e){

      }
    });

    $('#container').layout({ applyDefaultStyles: false,
      onresize: () => {
        try{
          this.TabSizeUpdate();
        }catch(e){

        }
      }
    });

    global.testImage = this;

    this.OpenFile(file);

  }

  OpenFile(file: EditorFile){

    this.image = null;
    this.file = null;

    if(file instanceof EditorFile){

      file.readFile( (buffer: Buffer) => {
        switch(file.ext){
          case 'tga':
            this.file = file.getLocalPath();
            this.filename = file.resref + '.tga';
            this.image = new TGAObject({file: buffer, filename: file.resref+'.tga' });
            this.$tabName.text(file.getFilename());
          break;
          case 'tpc':
            this.file = file.getLocalPath();
            this.filename = file.resref + '.tpc';
            this.image = new TPCObject({file: buffer, filename: file.resref+'.tpc' });
            this.$tabName.text(file.getFilename());
          break;
        }

        this.image.getPixelData( (pixelData) => {
          this.SetPixelData(pixelData);
        });
      });

    }

  }

  static FlipY(pixelData: Uint8Array, width = 1, height = 1){
    let offset = 0;
    let stride = width * 4;

    if(pixelData == null)
      pixelData = this.data;

    let unFlipped = Uint8Array.from(pixelData);

    for (let pos = unFlipped.length - stride; pos >= 0; pos -= stride) {
      pixelData.set(unFlipped.slice(pos, pos + stride), offset);
      offset += stride;
    }

  }

  static FlipX(pixelData: Uint8Array, width = 1, height = 1){

    if(pixelData == null)
      pixelData = this.data;

    let unFlipped = Uint8Array.from(pixelData);

    for (let i = 0; i < pixelData.length; i++) {
      pixelData[i] = (unFlipped[i - 2 * (i % width) + width - 1]);
    }

    /*let offset = 0;
    let stride = width * 4;

    if(pixelData == null)
      pixelData = this.data;

    let unFlipped = Uint8Array.from(pixelData);

    for (let y = 0; y <= height; y++) {
      let xStride = (width * 4) * y;
      let xStrideEnd = xStride * 2;

      if(xStrideEnd == 0)
        xStrideEnd = (width * 4);

      for(let x = width * 4; x >= 0; x -= 4){
        pixelData.set(unFlipped.slice(xStrideEnd - x, pos + 4), x + xStride);
      }
    }*/

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

  SetImageData(imageData: any, pixelData: Uint8Array){
    imageData.set(pixelData);
  }

  SetPixelData(pixelData: Uint8Array){

    this.data = pixelData;
    this.workingData = pixelData;

    this.width = this.image.header.width;
    this.height = this.image.header.height;

    //If the image is a TPC we will need to times the height by the number of faces
    //to correct the height incase we have a cubemap
    if(this.image instanceof TPCObject)
      this.height = this.image.header.height * this.image.header.faces;

    this.bitsPerPixel = this.image.header.bitsPerPixel;

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.$canvas.css({
      width: this.width,
      height: this.height,
      position: 'absolute',
      left: 'calc(50% - '+this.width+'px / 2)',
      top: 'calc(50% - '+this.height+'px / 2)',
    });

    let imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    let data = imageData.data;

    if(this.image instanceof TPCObject){

      if(this.bitsPerPixel == 24)
        this.workingData = ImageViewerTab.PixelDataToRGBA(this.workingData, this.width, this.height);

      if(this.bitsPerPixel == 8)
        this.workingData = ImageViewerTab.TGAGrayFix(this.workingData);

      //FlipY
      ImageViewerTab.FlipY(this.workingData, this.width, this.height);

    }

    if(this.image instanceof TGAObject){
      
      switch(this.bitsPerPixel){
        case 32:
          this.workingData = ImageViewerTab.TGAColorFix(this.workingData);
        break;
        case 24:
          //HTML Canvas requires 32bpp pixel data so we will need to add an alpha channel
          this.workingData = ImageViewerTab.RGBToRGBA(this.workingData, this.width, this.height);
          this.workingData = ImageViewerTab.TGAColorFix(this.workingData);
        break;
        case 8:
          this.workingData = ImageViewerTab.TGAGrayFix(this.workingData);
        break;
      }

      ImageViewerTab.FlipY(this.workingData, this.width, this.height);

    }

    //Set the preview image to opaque
    //this.PreviewAlphaFix(this.workingData);

    imageData.data.set(this.workingData);

    this.ctx.putImageData(imageData, 0, 0);

    this.$canvas.off('click').on('click', (e: any) => {
      e.preventDefault();
    });

  }

  TabSizeUpdate(){

  }

  export( onComplete?: Function ){

    if(!this.file){
      this.exportAs( onComplete );
      return;
    }

    let writer = new BinaryWriter();

    writer.WriteByte(0);
    writer.WriteByte(0);
    writer.WriteByte(2);
    writer.WriteByte(0);
    writer.WriteUInt32(0);
    writer.WriteUInt32(0);
    writer.WriteUInt16(this.width);
    writer.WriteUInt16(this.height);
    writer.WriteByte(this.bitsPerPixel);
    writer.WriteByte(0);

    let pixels = this.data;

    //If we are exporting data from a TPCObject we will need to invert the
    //pixels before we write them. (BGRA -> RGBA)
    if(this.image instanceof TPCObject){
      pixels = new Uint8Array(this.data.length);
      for (let i = 0; i < this.data.length; i += 4) {
        pixels[i]     = this.data[i + 2];     // red
        pixels[i + 1] = this.data[i + 1]; // green
        pixels[i + 2] = this.data[i]; // blue
        pixels[i + 3] = this.data[i + 3]; // alpha
      }

      //FLIP Y
      ImageViewerTab.FlipY(pixels, this.width, this.height);
    }

    try{
      writer.WriteBytes(pixels);
    }catch(e){
      console.log(e);
    }

    fs.writeFile(this.file, writer.buffer, (err) => {
      if (err) {
        return console.error(err);
      }

      if(typeof onComplete === 'function')
        onComplete(err);

      console.log('Image Saved');//, Object.keys(IMAGE_TYPE)[type]);
    });

  }

  async exportAs( onComplete = null ){

    let payload = await dialog.showSaveDialog({
      title: 'Export Image',
      defaultPath: this.filename,
      properties: ['createDirectory'],
      filters: [
        {name: 'TGA', extensions: ['tga']}
      ]
    });

    if(!payload.canceled && typeof payload.filePath != 'undefined'){
      this.file = payload.filePath;
      this.export(onComplete);
    }else{
      console.warn('TGA export aborted');
      if(typeof onComplete === 'function')
        onComplete();
    }

  }

  Save(){
    this.export();
  }

  ShowTXI(){

    let txiModal = new Modal({
      'title': 'TXI Info',
      'message': '<textarea style="max-width: 100%;">'+this.image.getTXIData()+'</textarea>'
    });

  }

}
