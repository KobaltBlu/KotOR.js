import React from "react";
import { TabState } from "@/apps/forge/states/tabs";
import { TabImageViewer } from "@/apps/forge/components/tabs/tab-image-viewer/TabImageViewer";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import { PixelManager } from "@/utility/PixelManager";
import {
  addLayer,
  buildTpcExportBuffer,
  encodePolicyFromTpc,
  canvasSize,
  clearSelected,
  cloneDocument,
  createDocumentFromRgba,
  createUntitledDocument,
  cropDocument,
  deleteLayer,
  desaturateLayer,
  deselect,
  displayRgbaToTga,
  duplicateLayer,
  flattenDocument,
  flattenLayers,
  flipDocumentHorizontal,
  flipDocumentVertical,
  floodFill,
  getActiveLayer,
  invertLayer,
  invertSelection,
  isLayerEditable,
  mergeDown,
  moveLayer,
  readForgePsd,
  resizeDocument,
  rotateDocument90,
  selectAll,
  setSelectionRect,
  strokeBrush,
  tgaToDisplayRgba,
  tpcDecodedToDisplayRgba,
  translateLayerPixels,
  writeForgePsd,
  type ImageDocument,
  type ImageEastPane,
  type ImageRect,
  type ImageRgba,
  type ImageToolId,
} from "@/apps/forge/image";
import { flipYInPlace, grayToRgba, rgbToRgba, sampleRgba, swapRB } from "@/apps/forge/image/imageIo";

const concatenate = (resultConstructor: any, ...arrays: any) => {
  let totalLength = 0;
  for (let arr of arrays) {
    totalLength += arr.length;
  }
  const result = new resultConstructor(totalLength);
  let offset = 0;
  for (let arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
};

export type ImageViewChannel = "rgba" | "r" | "g" | "b" | "a";

/**
 * Layered image editor for TPC / TGA / PNG / JPG / PSD.
 *
 * @file TabImageViewerState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TabImageViewerState extends TabState {

  tabName: string = "Image Editor";
  image: KotOR.TPCObject | KotOR.TGAObject | ForgeRasterImage;
  workingData: Uint8Array;
  bitsPerPixel: number = 32;
  document: ImageDocument = createUntitledDocument();
  composite: Uint8ClampedArray = flattenDocument(this.document);

  tool: ImageToolId = "brush";
  brushSize = 16;
  brushHardness = 0.8;
  brushOpacity = 1;
  fillTolerance = 32;
  canvasScale = 1;
  preview3D = false;
  eastPane: ImageEastPane = "layers";
  viewChannel: ImageViewChannel = "rgba";
  hoverX = -1;
  hoverY = -1;
  liveRect: ImageRect | null = null;
  dragKind: "none" | "marquee" | "crop" | "move" | "stroke" = "none";

  private forcedExportExt?: "tga" | "png" | "jpg" | "tpc" | "psd";
  private dragOrigin = { x: 0, y: 0 };
  private lastStroke = { x: 0, y: 0 };
  private moveStartPixels: Uint8ClampedArray | null = null;
  private hoverNotify = 0;

  private static isRasterImage(image: any): image is ForgeRasterImage {
    return !!image && (image.kind === "png" || image.kind === "jpg" || image.kind === "jpeg");
  }

  private static decodeImage(buffer: Uint8Array, kind: "png" | "jpg" | "jpeg"): Promise<ForgeRasterImage> {
    return new Promise<ForgeRasterImage>((resolve, reject) => {
      try {
        const mimeType = kind === "png" ? "image/png" : "image/jpeg";
        const blobPart = new ArrayBuffer(buffer.byteLength);
        new Uint8Array(blobPart).set(buffer);
        const blob = new Blob([blobPart], { type: mimeType });
        const objectURL = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          try {
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              URL.revokeObjectURL(objectURL);
              reject(new Error(`Failed to get 2d canvas context for ${kind.toUpperCase()} decode`));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const rgba = ctx.getImageData(0, 0, width, height).data;
            URL.revokeObjectURL(objectURL);
            resolve({
              kind,
              header: { width, height, bitsPerPixel: 32 },
              pixelData: new Uint8Array(rgba),
            });
          } catch (e) {
            URL.revokeObjectURL(objectURL);
            reject(e);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectURL);
          reject(new Error(`Failed to decode ${kind.toUpperCase()} image`));
        };
        img.src = objectURL;
      } catch (e) {
        reject(e);
      }
    });
  }

  static getSaveTypeForExtension(ext: string): any {
    switch (ext.toLowerCase()) {
      case "tpc":
        return { description: "Compressed Odyssey Image File", accept: { "image/*": [".tpc"] } };
      case "tga":
        return { description: "TGA Image File", accept: { "image/*": [".tga"] } };
      case "png":
        return { description: "PNG Image File", accept: { "image/*": [".png"] } };
      case "jpg":
        return { description: "JPG Image File", accept: { "image/*": [".jpg"] } };
      case "psd":
        return { description: "Photoshop Document", accept: { "image/vnd.adobe.photoshop": [".psd"] } };
      default:
        return undefined;
    }
  }

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.isClosable = true;
    if (this.file) {
      this.tabName = this.file.getFilename();
    }
    this.setContentView(<TabImageViewer tab={this}></TabImageViewer>);
    this.openFile();
    this.saveTypes = [
      TabImageViewerState.getSaveTypeForExtension("tpc"),
      TabImageViewerState.getSaveTypeForExtension("tga"),
      TabImageViewerState.getSaveTypeForExtension("png"),
      TabImageViewerState.getSaveTypeForExtension("jpg"),
      TabImageViewerState.getSaveTypeForExtension("psd"),
    ];
  }

  protected shouldHandleUndoKeyboard(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.(".monaco-editor")) {
      return false;
    }
    return super.shouldHandleUndoKeyboard(e);
  }

  protected captureUndoState(): ImageDocument | undefined {
    return cloneDocument(this.document);
  }

  protected applyUndoState(state: ImageDocument): void {
    this.document = cloneDocument(state);
    this.refreshComposite();
    if (this.file instanceof EditorFile) {
      this.file.unsaved_changes = true;
    }
    this.syncImageHeader();
    this.processEventListener("onEditorFileChange", [this]);
    this.editorFileUpdated();
  }

  mutate(fn: (doc: ImageDocument) => void, options?: { history?: boolean }): void {
    if (options?.history !== false) {
      this.captureUndoSnapshot();
    }
    fn(this.document);
    this.refreshComposite();
    if (this.file instanceof EditorFile) {
      this.file.unsaved_changes = true;
    }
    this.syncImageHeader();
    this.processEventListener("onEditorFileChange", [this]);
    this.editorFileUpdated();
  }

  notifyUi(): void {
    this.processEventListener("onEditorFileChange", [this]);
  }

  refreshComposite(): void {
    this.composite = flattenDocument(this.document);
    this.workingData = new Uint8Array(this.composite);
    this.bitsPerPixel = 32;
  }

  private syncImageHeader(): void {
    this.image = {
      kind: "png",
      header: {
        width: this.document.width,
        height: this.document.height,
        bitsPerPixel: 32,
      },
      pixelData: new Uint8Array(this.composite),
    };
  }

  async exportAs(ext: "tga" | "png" | "jpg" | "tpc" | "psd") {
    const saveType = TabImageViewerState.getSaveTypeForExtension(ext);
    if (!saveType) {
      return false;
    }
    const previousSaveTypes = this.saveTypes;
    const previousForcedExportExt = this.forcedExportExt;
    const previousFileExt = this.file?.ext;
    this.saveTypes = [saveType];
    this.forcedExportExt = ext;
    if (this.file) {
      this.file.ext = ext;
    }
    try {
      return await this.saveAs();
    } finally {
      this.forcedExportExt = previousForcedExportExt;
      this.saveTypes = previousSaveTypes;
      if (this.file) {
        this.file.ext = previousFileExt;
      }
    }
  }

  private isEmptyNewFile(file: EditorFile): boolean {
    return !(file.buffer instanceof Uint8Array && file.buffer.length)
      && !file.path
      && !file.archive_path
      && !file.handle;
  }

  openFile(file?: EditorFile) {
    return new Promise<ForgeRasterImage>((resolve, reject) => {
      if (!file && this.file instanceof EditorFile) {
        file = this.file;
      }
      if (file instanceof EditorFile) {
        if (this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
        if (this.isEmptyNewFile(file)) {
          this.applyLoadedDocument(createUntitledDocument(256, 256));
          resolve(this.image as ForgeRasterImage);
          return;
        }
        file.readFile().then(async (response) => {
          try {
            const ext = (file?.ext || "").toLowerCase();
            if (ext === "tga") {
              const tga = new KotOR.TGAObject({ file: response.buffer, filename: file.resref + ".tga" });
              const raw = await this.readTgaPixels(tga);
              const rgba = tgaToDisplayRgba(raw, tga.header.width, tga.header.height, tga.header.bitsPerPixel);
              this.applyLoadedDocument(createDocumentFromRgba(rgba, tga.header.width, tga.header.height, ""));
            } else if (ext === "tpc") {
              const tpc = new KotOR.TPCObject({ file: response.buffer, filename: file.resref + ".tpc" });
              const decoded = this.decodeTpcPixels(tpc);
              const rgba = tpcDecodedToDisplayRgba(decoded.pixels, decoded.width, decoded.height);
              this.applyLoadedDocument(createDocumentFromRgba(
                rgba,
                decoded.width,
                decoded.height,
                tpc.txi?.info || "",
                encodePolicyFromTpc(tpc),
              ));
            } else if (ext === "png" || ext === "jpg" || ext === "jpeg") {
              const raster = await TabImageViewerState.decodeImage(response.buffer, ext === "jpeg" ? "jpeg" : ext);
              this.applyLoadedDocument(createDocumentFromRgba(
                raster.pixelData,
                raster.header.width,
                raster.header.height,
                "",
              ));
            } else if (ext === "psd") {
              this.applyLoadedDocument(readForgePsd(response.buffer));
            } else {
              this.applyLoadedDocument(createUntitledDocument(256, 256));
            }
            resolve(this.image as ForgeRasterImage);
          } catch (err) {
            reject(err);
          }
        }).catch(reject);
      } else {
        this.applyLoadedDocument(createUntitledDocument(256, 256));
        resolve(this.image as ForgeRasterImage);
      }
    });
  }

  private applyLoadedDocument(doc: ImageDocument): void {
    this.document = doc;
    this.refreshComposite();
    this.syncImageHeader();
    this.clearUndoHistory();
    this.processEventListener("onEditorFileLoad", [this]);
    this.processEventListener("onEditorFileChange", [this]);
  }

  private readTgaPixels(tga: KotOR.TGAObject): Promise<Uint8Array> {
    return new Promise((resolve) => {
      tga.getPixelData((buffer: Uint8Array) => resolve(new Uint8Array(buffer)));
    });
  }

  private decodeTpcPixels(tpc: KotOR.TPCObject): { pixels: Uint8Array; width: number; height: number } {
    const dds = tpc.getDDS(false);
    const width = tpc.header.width;
    const height = tpc.header.height;
    let imagePixels = new Uint8Array(0);
    let outHeight = height;
    if (!tpc.txi.procedureType) {
      if (tpc.header.faces > 1) {
        for (let face = 0; face < tpc.header.faces; face++) {
          const mipmap = dds.mipmaps[face * dds.mipmapCount];
          if (tpc.header.faces == 6) {
            switch (face) {
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
          imagePixels = concatenate(Uint8Array, imagePixels, Uint8Array.from(mipmap.data));
        }
        outHeight = height * tpc.header.faces;
      } else {
        imagePixels = concatenate(Uint8Array, imagePixels, dds.mipmaps[0].data);
      }
    } else {
      imagePixels = concatenate(Uint8Array, imagePixels, dds.mipmaps[0].data);
    }
    return { pixels: imagePixels, width, height: outHeight };
  }

  getPixelData(): Promise<Uint8Array> {
    return Promise.resolve(new Uint8Array(this.composite));
  }

  static FlipY(pixelData: Uint8Array, width = 1, height = 1) {
    flipYInPlace(pixelData, width, height);
  }

  static FlipX(pixelData: Uint8Array, width = 1, height = 1) {
    const copy = Uint8Array.from(pixelData);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const src = (y * width + x) * 4;
        const dst = (y * width + (width - 1 - x)) * 4;
        pixelData[dst] = copy[src];
        pixelData[dst + 1] = copy[src + 1];
        pixelData[dst + 2] = copy[src + 2];
        pixelData[dst + 3] = copy[src + 3];
      }
    }
  }

  static PixelDataToRGBA(pixelData: Uint8Array, width = 1, height = 1) {
    return Uint8Array.from(pixelData.subarray(0, 4 * width * height));
  }

  static RGBToRGBA(pixelData: Uint8Array, width = 1, height = 1) {
    return rgbToRgba(pixelData, width, height);
  }

  static BGRAtoRGBA(pixelData: Uint8Array) {
    const swapped = swapRB(pixelData);
    pixelData.set(swapped);
  }

  static TGAGrayFix(pixelData: Uint8Array) {
    return grayToRgba(pixelData);
  }

  static TGAColorFix(pixelData: Uint8Array) {
    return swapRB(pixelData);
  }

  getTXIText(): string {
    return this.document.txiText || "";
  }

  setTXIText(text: string, options?: { history?: boolean }): void {
    this.mutate((doc) => {
      doc.txiText = text || "";
    }, options);
  }

  applyTXIText(text: string): void {
    this.setTXIText(text);
  }

  setTool(tool: ImageToolId): void {
    this.tool = tool;
    this.liveRect = null;
    this.dragKind = "none";
    this.notifyUi();
  }

  setEastPane(pane: ImageEastPane): void {
    this.eastPane = pane;
    this.notifyUi();
  }

  pointerDown(x: number, y: number, button: number): void {
    const { width, height } = this.document;
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    if (button === 2) {
      this.sampleAt(x, y);
      return;
    }
    const bgSample = button === 1;
    if (this.tool === "eyedropper") {
      this.sampleAt(x, y, bgSample);
      return;
    }
    if (this.tool === "fill") {
      this.mutate((doc) => {
        const layer = getActiveLayer(doc);
        if (!isLayerEditable(layer)) return;
        floodFill(layer, doc, x, y, doc.foreground, this.fillTolerance);
      });
      return;
    }
    if (this.tool === "marquee" || this.tool === "crop") {
      this.dragKind = this.tool;
      this.dragOrigin = { x, y };
      this.liveRect = { x, y, w: 1, h: 1 };
      this.notifyUi();
      return;
    }
    if (this.tool === "move") {
      const layer = getActiveLayer(this.document);
      if (!isLayerEditable(layer)) return;
      this.captureUndoSnapshot();
      this.dragKind = "move";
      this.dragOrigin = { x, y };
      this.moveStartPixels = new Uint8ClampedArray(layer.pixels);
      return;
    }
    if (this.tool === "brush" || this.tool === "eraser") {
      if (!isLayerEditable(getActiveLayer(this.document))) return;
      this.captureUndoSnapshot();
      this.dragKind = "stroke";
      this.lastStroke = { x, y };
      this.paintAt(x, y, x, y, false);
    }
  }

  pointerMove(x: number, y: number, buttons: number): void {
    this.hoverX = x;
    this.hoverY = y;
    if (!buttons && this.dragKind === "none") {
      if (!this.hoverNotify) {
        this.hoverNotify = window.setTimeout(() => {
          this.hoverNotify = 0;
          this.notifyUi();
        }, 50) as unknown as number;
      }
      return;
    }
    if (this.dragKind === "marquee" || this.dragKind === "crop") {
      this.liveRect = rectFromPoints(this.dragOrigin.x, this.dragOrigin.y, x, y);
      this.notifyUi();
      return;
    }
    if (this.dragKind === "move") {
      const layer = getActiveLayer(this.document);
      if (layer && this.moveStartPixels) {
        layer.pixels = new Uint8ClampedArray(this.moveStartPixels);
        translateLayerPixels(layer, this.document, x - this.dragOrigin.x, y - this.dragOrigin.y);
        this.refreshComposite();
        this.notifyUi();
      }
      return;
    }
    if (this.dragKind === "stroke") {
      this.paintAt(this.lastStroke.x, this.lastStroke.y, x, y, false);
      this.lastStroke = { x, y };
    }
  }

  pointerUp(): void {
    if (this.dragKind === "marquee" && this.liveRect) {
      this.mutate((doc) => setSelectionRect(doc, this.liveRect as ImageRect));
    } else if (this.dragKind === "crop" && this.liveRect) {
      const rect = this.liveRect;
      this.mutate((doc) => cropDocument(doc, rect));
    } else if (this.dragKind === "move") {
      if (this.file instanceof EditorFile) this.file.unsaved_changes = true;
      this.syncImageHeader();
      this.editorFileUpdated();
      this.processEventListener("onEditorFileChange", [this]);
    } else if (this.dragKind === "stroke") {
      if (this.file instanceof EditorFile) this.file.unsaved_changes = true;
      this.syncImageHeader();
      this.editorFileUpdated();
    }
    this.dragKind = "none";
    this.liveRect = null;
    this.moveStartPixels = null;
    this.notifyUi();
  }

  private paintAt(x0: number, y0: number, x1: number, y1: number, history: boolean): void {
    this.mutate((doc) => {
      const layer = getActiveLayer(doc);
      if (!isLayerEditable(layer)) return;
      strokeBrush(
        layer,
        doc,
        x0,
        y0,
        x1,
        y1,
        doc.foreground,
        this.brushSize,
        this.brushHardness,
        this.brushOpacity,
        this.tool === "eraser",
      );
    }, { history });
  }

  sampleAt(x: number, y: number, background = false): void {
    if (x < 0 || y < 0 || x >= this.document.width || y >= this.document.height) return;
    const color = sampleRgba(this.composite, this.document.width, x, y);
    this.document[background ? "background" : "foreground"] = color;
    this.notifyUi();
  }

  deleteSelection(): void {
    this.mutate((doc) => {
      const layer = getActiveLayer(doc);
      if (isLayerEditable(layer)) clearSelected(layer, doc);
    });
  }

  getHoverColor(): ImageRgba | undefined {
    if (this.hoverX < 0 || this.hoverY < 0) return undefined;
    if (this.hoverX >= this.document.width || this.hoverY >= this.document.height) return undefined;
    return sampleRgba(this.composite, this.document.width, this.hoverX, this.hoverY);
  }

  newLayer(): void { this.mutate((doc) => { addLayer(doc); }); }
  duplicateActiveLayer(): void { this.mutate((doc) => { duplicateLayer(doc); }); }
  deleteActiveLayer(): void { this.mutate((doc) => { deleteLayer(doc); }); }
  mergeActiveDown(): void { this.mutate((doc) => { mergeDown(doc); }); }
  moveActiveLayer(direction: 1 | -1): void { this.mutate((doc) => { moveLayer(doc, direction); }); }
  flatten(): void { this.mutate((doc) => { flattenLayers(doc); }); }
  selectAll(): void { this.mutate((doc) => { selectAll(doc); }); }
  deselect(): void { this.mutate((doc) => { deselect(doc); }); }
  invertSelection(): void { this.mutate((doc) => { invertSelection(doc); }); }
  flipH(): void { this.mutate((doc) => { flipDocumentHorizontal(doc); }); }
  flipV(): void { this.mutate((doc) => { flipDocumentVertical(doc); }); }
  rotate90(): void { this.mutate((doc) => { rotateDocument90(doc, 1); }); }
  rotate180(): void { this.mutate((doc) => { rotateDocument90(doc, 2); }); }
  invert(): void {
    this.mutate((doc) => {
      const layer = getActiveLayer(doc);
      if (isLayerEditable(layer)) invertLayer(layer, doc);
    });
  }
  desaturate(): void {
    this.mutate((doc) => {
      const layer = getActiveLayer(doc);
      if (isLayerEditable(layer)) desaturateLayer(layer, doc);
    });
  }
  resize(width: number, height: number): void { this.mutate((doc) => { resizeDocument(doc, width, height); }); }
  canvasResize(width: number, height: number): void { this.mutate((doc) => { canvasSize(doc, width, height); }); }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    const normalizedExt = (this.forcedExportExt || ext || this.file?.ext || "tga").replace(".", "").toLowerCase();
    const width = this.document.width;
    const height = this.document.height;
    const pixelData = new Uint8Array(this.composite);

    if (normalizedExt == "tga") {
      const tga = new KotOR.TGAObject();
      tga.header = {
        ID: 0,
        ColorMapType: 0,
        FileType: 2,
        ColorMapIndex: 0,
        offsetX: 0,
        offsetY: 0,
        width,
        height,
        bitsPerPixel: 32,
        imageDescriptor: 0,
        hasColorMap: false,
        pixelDataOffset: 0,
      };
      tga.pixelData = displayRgbaToTga(pixelData, width, height);
      return tga.toExportBuffer();
    }

    if (normalizedExt == "png" || normalizedExt == "jpg" || normalizedExt == "jpeg") {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return new Uint8Array(0);
      }
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixelData);
      ctx.putImageData(imageData, 0, 0);
      const outputMime = normalizedExt == "png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), outputMime, 0.92);
      });
      if (!blob) {
        return new Uint8Array(0);
      }
      return new Uint8Array(await blob.arrayBuffer());
    }

    if (normalizedExt == "tpc") {
      return buildTpcExportBuffer(pixelData, width, height, this.document.txiText, this.document.encode);
    }

    if (normalizedExt == "psd") {
      return writeForgePsd(this.document);
    }

    return super.getExportBuffer(resref, ext);
  }

}

function rectFromPoints(x0: number, y0: number, x1: number, y1: number): ImageRect {
  const x = Math.min(x0, x1);
  const y = Math.min(y0, y1);
  return { x, y, w: Math.abs(x1 - x0) + 1, h: Math.abs(y1 - y0) + 1 };
}

export interface ForgeRasterImage {
  kind: "png" | "jpg" | "jpeg";
  header: {
    width: number;
    height: number;
    bitsPerPixel: number;
  };
  pixelData: Uint8Array;
}
