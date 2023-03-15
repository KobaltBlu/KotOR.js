export interface OdysseyFileHeader {
  flagBinary: number;
  mdlDataSize: number;
  mdxDataSize: number;

  modelDataOffset: number;
  rawDataOffset: number;
}