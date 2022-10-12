

export interface TGAHeader {
  ID: number;
  ColorMapType: number;
  FileType: number;

  //Simple color map detection (May not be adequate)
  hasColorMap: boolean;
  ColorMapIndex: number;

  offsetX: number;
  offsetY: number;
  width: number;
  height: number;

  bitsPerPixel: number;
  imageDescriptor: number;

  pixelDataOffset: number;
};