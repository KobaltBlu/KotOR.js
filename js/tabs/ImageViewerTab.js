


class ImageViewerTab extends EditorTab {
  constructor(file){
    super({
      toolbar: {
        items: [
          {name: 'File', items: [
            {name: 'Open File', onClick: () => {
              this.OpenFileDialog();
            }},
            {name: 'Save File', onClick: () => {
              //Save the image data as a TGA image
              this.SaveFileDialog();
            }}
          ]},
          {name: 'View', items: [
            {name: 'TXI Data', onClick: () => {
              this.ShowTXI();
            }}
          ]}
        ]
      }
    });

    $('a', this.$tab).text('Image Viewer');

    this.$contentWrapper = $('<div style="position: absolute; top: 50px; left: 0; right: 0; bottom: 0; overflow: scroll;" />');

    this.$canvas = $('<canvas class="checkerboard" style="width: 512px; height: 512px;" />');
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

    window.testImage = this;

    this.OpenFile(file);

  }

  OpenFile(file){

    this.image = null;
    this.file = null;

    console.log(file);

    let info = Utility.filePathInfo(file);

    console.log(file, info);

    if(info.location == 'local'){

      this.file = info.file.name;

      fs.readFile(info.path, (err, buffer) => {
        if (err) throw err;
        try{
          switch(info.file.ext){
            case 'tga':
              this.image = new TGAObject({file: buffer, filename: info.file.name });
            break;
            case 'tpc':
              this.image = new TPCObject({file: buffer, filename: info.file.name });
            break;
          }

          this.image.getPixelData( (pixelData) => {
            this.SetPixelData(pixelData);
          });
        }
        catch (e) {
          console.log(e);
        }

      });

    }else if(info.location == 'archive'){

      switch(info.archive.type){
        case 'erf':
          let loader = new THREE.TPCLoader();

          loader.loadFromArchive( info.archive.name, info.file.name, ( image ) => {
            this.image = image;

            this.image.getPixelData( (pixelData) => {
              this.SetPixelData(pixelData);
            });

          });
        break;
        case 'bif':
          Global.kotorBIF[info.archive.name].GetResourceData(Global.kotorBIF[info.archive.name].GetResourceByLabel(info.file.name, ResourceTypes[info.file.ext]), (buffer) => {
            switch(info.file.ext){
              case 'tga':
                this.image = new TGAObject({file: buffer, filename: info.file.name });
              break;
              case 'tpc':
                this.image = new TPCObject({file: buffer, filename: info.file.name });
              break;
            }

            this.image.getPixelData( (pixelData) => {
              this.SetPixelData(pixelData);
            });

          }, (e) => {
            if(typeof onError === 'function')
              throw 'Resource not found in BIF archive '+pathInfo.archive.name;
          });
        break;
      }

    }

    this.fileType = info.file.ext;
    this.location = info.location;

  }

  FlipY(pixelData = null){
    let offset = 0;
    let stride = this.width * 4;

    if(pixelData == null)
      pixelData = this.data;

    let unFlipped = Uint8Array.from(pixelData);

    for (var pos = unFlipped.length - stride; pos >= 0; pos -= stride) {
      pixelData.set(unFlipped.slice(pos, pos + stride), offset);
      offset += stride;
    }

  }

  FlipX(pixelData = null){
    let offset = 0;
    let stride = this.width * 4;

    if(pixelData == null)
      pixelData = this.data;

    let unFlipped = Uint8Array.from(pixelData);

    for (var y = 0; y <= this.height; y++) {
      let xStride = (this.width * 4) * y;
      let xStrideEnd = xStride * 2;

      if(xStrideEnd == 0)
        xStrideEnd = (this.width * 4);

      for(let x = this.width * 4; x >= 0; x -= 4){
        pixelData.set(unFlipped.slice(xStrideEnd - x, pos + 4), x + xStride);
      }
    }

  }

  PixelDataToRGBA(pixelData){
    let data = new Uint8Array(pixelData.length);
    let n = 4 * this.width * this.height;
    let s = 0, d = 0;
    while (d < n) {
      data[d++] = pixelData[s++];
      data[d++] = pixelData[s++];
      data[d++] = pixelData[s++];
      data[d++] = pixelData[s++];
    }
  }

  BGRAtoRGBA(pixelData){
    for (var i = 0; i < pixelData.length; i += 4) {
      pixelData[i    ] = pixelData[i + 2]; // red
      pixelData[i + 1] = pixelData[i + 1]; // green
      pixelData[i + 2] = pixelData[i    ]; // blue
      pixelData[i + 3] = pixelData[i + 3]; // alpha
    }
  }

  TGAGrayFix(pixelData){
    let fixed = new Uint8Array(pixelData.length * 4);
    for (var i = 0; i < pixelData.length; i++) {

      let color = pixelData[i];
      let offset = i * 4;

      fixed[offset    ] = color; // red
      fixed[offset + 1] = color; // green
      fixed[offset + 2] = color; // blue
      fixed[offset + 3] = 255; // alpha
    }
  }

  TGAColorFix(pixelData){
    let fixed = Uint8Array.from(pixelData);
    for (let i = 0; i < pixelData.length; i += 4) {
      fixed[i + 2] = pixelData[i    ]; // red
      fixed[i + 1] = pixelData[i + 1]; // green
      fixed[i    ] = pixelData[i + 2]; // blue
      fixed[i + 3] = pixelData[i + 3]; // alpha
    }
    return fixed;
  }

  PreviewAlphaFix(pixelData){
    for (var i = 0; i < pixelData.length; i += 4){
      pixelData[i + 3] = 255;
    }
  }

  SetImageData(imageData, pixelData){
    imageData.set(pixelData);
  }

  SetPixelData(pixelData){

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
    this.$canvas.css({width: this.width, height: this.height});

    console.log(pixelData);

    let imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    let data = imageData.data;

    if(this.image instanceof TPCObject){

      if(this.bitsPerPixel == 24)
        this.workingData = this.PixelDataToRGBA(this.workingData);

      if(this.bitsPerPixel == 8)
        this.workingData = this.TGAGrayFix(this.workingData);

      //FlipY
      this.FlipY(this.workingData);

    }

    //HTML Canvas requires 32bpp pixel data so we will need to add an alpha channel
    //if we are working with 24bpp pixeldata
    /*if(this.bitsPerPixel == 24)
      this.workingData = this.PixelDataToRGBA(this.data);*/

    if(this.image instanceof TGAObject){
      switch(this.bitsPerPixel){
        case 32:
          this.workingData = this.TGAColorFix(this.workingData);
        break;
        case 24:
          this.workingData = this.TGAColorFix(this.workingData);
        break;
        case 8:
          this.workingData = this.TGAGrayFix(this.workingData);
        break;
      }

      this.FlipX(this.workingData);

    }

    //Set the preview image to opaque
    //this.PreviewAlphaFix(this.workingData);

    data.set(this.workingData);

    this.ctx.putImageData(imageData, 0, 0);

    this.$canvas.off('click').on('click', (e) => {
      e.preventDefault();
    });

  }

  TabSizeUpdate(){

  }

  SaveFileDialog(){
    let path = dialog.showSaveDialog({
      title: 'Export Image',
      defaultPath: this.file,
      filters: [
        {name: 'TGA Image', extensions: ['tga']}
    ]});

    if(typeof path != 'undefined' && path != null){
      this.Export(path, IMAGE_TYPE.TGA);
    }
  }

  OpenFileDialog(){
    let path = dialog.showOpenDialog({
      title: 'Open Image',
      defaultPath: this.file,
      filters: [
        {name: 'TPC Image', extensions: ['tpc']},
        {name: 'TGA Image', extensions: ['tga']}
    ]});

    if(typeof path != 'undefined' && path != null){
      if(path.length)
        this.OpenFile(path[0]);
    }
  }

  Export(path = null, type = IMAGE_TYPE.TGA){
    if(path != null){
      if(type == IMAGE_TYPE.TGA){
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
          for (var i = 0; i < this.data.length; i += 4) {
            pixels[i]     = this.data[i + 2];     // red
            pixels[i + 1] = this.data[i + 1]; // green
            pixels[i + 2] = this.data[i]; // blue
            pixels[i + 3] = this.data[i + 3]; // alpha
          }

          //FLIP Y
          this.FlipY(pixels)
        }

        try{
          writer.WriteBytes(pixels);
        }catch(e){
          console.log(e);
        }

        fs.writeFile(path, writer.buffer, (err) => {
          if (err) {
           return console.error(err);
          }
          console.log('Image Saved', Object.keys(IMAGE_TYPE)[type]);
        });
      }

    }else{
      alert('Output path missing: Failed to save image.');
    }

  }

  ShowTXI(){

    let txiModal = new Modal({
      'title': 'TXI Info',
      'message': '<textarea style="max-width: 100%;">'+this.image.getTXIData()+'</textarea>'
    });

  }

}

module.exports = ImageViewerTab;
