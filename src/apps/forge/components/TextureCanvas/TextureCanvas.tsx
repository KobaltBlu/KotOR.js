import React, { useEffect, useRef, useState } from "react";
import * as KotOR from "../../KotOR";
import { TabImageViewerState } from "../../states/tabs/TabImageViewerState";
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

const getPixelData = async (image: KotOR.TPCObject | KotOR.TGAObject): Promise<Uint8Array> => {
  return new Promise<Uint8Array>((resolve, reject) => {
    if (image instanceof KotOR.TPCObject) {
      const tpc = image;
      const dds = tpc.getDDS(false);
      let imagePixels = new Uint8Array(0);

      const width = tpc.header.width;
      const height = tpc.header.height;
      const _mipmapCount = 1;

      if (!tpc.txi.procedureType) {
        if (tpc.header.faces > 1) {
          for (let face = 0; face < tpc.header.faces; face++) {
            for (let i = 0; i < 1; i++) {
              const mipmap = dds.mipmaps[face + (i * dds.mipmapCount)];
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
              imagePixels = concatenate(Uint8Array, imagePixels, mipmap.data);
            }
          }
        } else {
          imagePixels = concatenate(Uint8Array, imagePixels, dds.mipmaps[0].data);
        }
      } else {
        imagePixels = concatenate(Uint8Array, imagePixels, dds.mipmaps[0].data);
      }
      resolve(imagePixels);
    } else {
      image.getPixelData((buffer: Uint8Array) => {
        resolve(new Uint8Array(buffer));
      });
    }
  });
};

export interface TextureCanvasProps {
  texture: string;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
}

export const TextureCanvas: React.FC<TextureCanvasProps> = ({
  texture,
  width,
  height,
  className = "",
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [_textureLoaded, setTextureLoaded] = useState<boolean>(false);

  const [cWidth, setCanvasWidth] = useState<number>(width || 0);
  const [cHeight, setCanvasHeight] = useState<number>(height || 0);

  useEffect(() => {
    if (!texture || !canvasRef.current) return;

    const loadTexture = async () => {
      try {
        // Load TPC resource using TPCLoader
        const result = await KotOR.TextureLoader.tpcLoader.findTPC(texture);
        if (!result || !result.buffer) return;

        // Create TPCObject from buffer
        const tpcObject = new KotOR.TPCObject({
          file: result.buffer,
          filename: texture + '.tpc',
          pack: result.pack
        });

        if (!tpcObject || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get pixel data
        const pixelData = await getPixelData(tpcObject);

        // Get texture dimensions
        let textureWidth = tpcObject.header.width;
        let textureHeight = tpcObject.header.height;

        // Handle cubemap height adjustment
        if (tpcObject.txi.procedureType == 1) {
          textureWidth = tpcObject.header.width;
          textureHeight = tpcObject.header.height;
        } else {
          textureHeight = tpcObject.header.height * ((tpcObject.header as any).faces || 1);
        }

        // Determine canvas dimensions
        let canvasWidth: number;
        let canvasHeight: number;

        if (width !== undefined && height !== undefined) {
          // Use provided dimensions - scale texture to fit
          canvasWidth = width;
          canvasHeight = height;
        } else {
          // Use texture's native size
          canvasWidth = textureWidth;
          canvasHeight = textureHeight;
        }

        // Set canvas size
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Process pixel data based on bits per pixel
        let processedData = pixelData;
        const bitsPerPixel = tpcObject.header.bitsPerPixel;

        if (bitsPerPixel == 24) {
          processedData = TabImageViewerState.PixelDataToRGBA(processedData, textureWidth, textureHeight);
        }

        if (bitsPerPixel == 8) {
          processedData = TabImageViewerState.TGAGrayFix(processedData);
        }

        // Flip Y
        TabImageViewerState.FlipY(processedData, textureWidth, textureHeight);

        // Create ImageData and draw to canvas
        const imageData = ctx.createImageData(textureWidth, textureHeight);
        imageData.data.set(processedData);

        // If scaling is needed, draw to a temporary canvas first, then scale
        if (width !== undefined && height !== undefined && (canvasWidth !== textureWidth || canvasHeight !== textureHeight)) {
          // Create temporary canvas for original size
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = textureWidth;
          tempCanvas.height = textureHeight;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(imageData, 0, 0);
            // Draw scaled to main canvas
            ctx.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);
          }
        } else {
          ctx.putImageData(imageData, 0, 0);
        }

        setCanvasWidth(canvasWidth);
        setCanvasHeight(canvasHeight);

        setTextureLoaded(true);
      } catch (error) {
        log.error(`Failed to load texture: ${texture}`, error);
      }
    };

    loadTexture();
  }, [texture, width, height, canvasRef]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`iSlot texture-canvas ${className} ${onClick ? 'clickable' : ''}`}
      onClick={onClick ? handleClick : undefined}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      <canvas ref={canvasRef} style={{ width: `${cWidth}px`, height: `${cHeight}px`, display: 'block' }} />
    </div>
  );
};

