import React, { useEffect, useRef, useState } from "react";

import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import * as KotOR from "@/apps/forge/KotOR";
import { TabImageViewerState } from "@/apps/forge/states/tabs";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

interface Vec3 { x: number; y: number; z: number }
function isVec3(v: unknown): v is Vec3 {
  return typeof v === 'object' && v !== null && 'x' in v && 'y' in v && 'z' in v;
}

export const TabImageViewer = function(props: BaseTabProps){

  const tab = props.tab as TabImageViewerState;
  const [render, rerender] = useState<boolean>(false);
  const [canvasScale, setCanvasScale] = useState<number>(1);
  const [canvasWidth, setCanvasWidth] = useState<number>(512);
  const [canvasHeight, setCanvasHeight] = useState<number>(512);
  const [_txiObject, _setTXIObject] = useState<object>();
  const [_txiPane, _setTXIPane] = useState<React.ReactElement | undefined>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const setPixelData = (image: KotOR.TPCObject|KotOR.TGAObject) => {
    rerender(!render);
    if(canvasRef.current){
      const canvas = canvasRef.current;
      tab.getPixelData().then( (pixelData) => {
        log.trace('pixel data', pixelData);
        const ctx = canvas.getContext('2d');
        if(ctx){
          // let data = pixelData;
          tab.workingData = pixelData;

          let width = image.header.width;
          let height = image.header.height;

          //If the image is a TPC we will need to times the height by the number of faces
          //to correct the height incase we have a cubemap
          if(image instanceof KotOR.TPCObject){
            if(image.txi.procedureType == 1){
              width = image.header.width;
              height = image.header.height;
            }else{
              height = image.header.height * ((image.header as { faces?: number }).faces ?? 1);
            }
          }

          setCanvasWidth(width);
          setCanvasHeight(height);

          tab.bitsPerPixel = image.header.bitsPerPixel;

          canvas.width = width;
          canvas.height = height;

          const imageData = ctx.getImageData(0, 0, width, height);
          if(image instanceof KotOR.TPCObject){

            if(tab.bitsPerPixel == 24)
              tab.workingData = TabImageViewerState.PixelDataToRGBA(tab.workingData, width, height);

            if(tab.bitsPerPixel == 8)
              tab.workingData = TabImageViewerState.TGAGrayFix(tab.workingData);

            //FlipY
            TabImageViewerState.FlipY(tab.workingData, width, height);

          }

          if(image instanceof KotOR.TGAObject){
            
            switch(tab.bitsPerPixel){
              case 32:
                tab.workingData = TabImageViewerState.TGAColorFix(tab.workingData);
              break;
              case 24:
                //HTML Canvas requires 32bpp pixel data so we will need to add an alpha channel
                tab.workingData = TabImageViewerState.RGBToRGBA(tab.workingData, width, height);
                tab.workingData = TabImageViewerState.TGAColorFix(tab.workingData);
              break;
              case 8:
                tab.workingData = TabImageViewerState.TGAGrayFix(tab.workingData);
              break;
            }

            TabImageViewerState.FlipY(tab.workingData, width, height);

          }

          //Set the preview image to opaque
          //this.PreviewAlphaFix(this.workingData);

          imageData.data.set(tab.workingData);
          ctx.putImageData(imageData, 0, 0);
        }
      });
    }
  }

  let tmpCanvasScale = 1;

  const onMouseWheel = (e: WheelEvent) => {
    // let tmpCanvasScale = canvasScale;
    if(e.ctrlKey){
      if(e.deltaY < 0){
        tmpCanvasScale -= 0.25;
      }else{
        tmpCanvasScale += 0.25;
      }
    }
    if(tmpCanvasScale < 0.25){
      tmpCanvasScale = 0.25;
    }
    if(tmpCanvasScale > 10){
      tmpCanvasScale = 10;
    }
    setCanvasScale(tmpCanvasScale);
  }

  const onEditorFileLoad = () => {
    setPixelData(tab.image);
  };

  useEffectOnce( () => {
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
    }
  });

  useEffect(() => {
    log.trace('containerRef', containerRef);
    if(containerRef.current){
      containerRef.current.addEventListener('wheel', onMouseWheel);
    }
    return () => {
      if(containerRef.current){
        containerRef.current.removeEventListener('wheel', onMouseWheel);
      }
    }
  }, [containerRef]);

  const formatTxiValue = (value: unknown): string => {
    if (value == null) return String(value);
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      return value.map((item: unknown) => {
        if (isVec3(item)) return `(${item.x}, ${item.y}, ${item.z})`;
        return typeof item === 'object' ? JSON.stringify(item) : String(item);
      }).join(', ');
    }
    if (isVec3(value)) return `(${value.x}, ${value.y}, ${value.z})`;
    return JSON.stringify(value);
  };

  const eastContent = (
    (tab.image instanceof KotOR.TPCObject) ? (
      <div className="txi-pane">
        {
          Object.entries(tab.image.txi).map( (element: [string, unknown]) => {
            return (
              <div className="txi-element" key={element[0]}>
                <span className="txi-property">{element[0]}</span>
                <span className="txi-value">{formatTxiValue(element[1])}</span>
              </div>
            )
          })
        }
      </div>
    ) : (
      <></>
    )
  );

  return (
    <>
      <LayoutContainer eastContent={eastContent}>
        <div ref={containerRef} style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'scroll', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <canvas ref={canvasRef} className="checkerboard" style={{width: `${canvasWidth}px`, height: `${canvasHeight}px`, transform: `scale(${canvasScale})`}} />
        </div>
      </LayoutContainer>
    </>
  );

}
