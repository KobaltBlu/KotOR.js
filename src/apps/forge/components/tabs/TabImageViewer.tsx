import React, { useEffect, useRef, useState } from "react";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { TabImageViewerState } from "../../states/tabs/TabImageViewerState";
import { LayoutContainer } from "../LayoutContainer";

import * as KotOR from "../../KotOR";

export const TabImageViewer = function(props: BaseTabProps){

  const tab = props.tab as TabImageViewerState;
  const [render, rerender] = useState<boolean>(false);
  const [canvasScale, setCanvasScale] = useState<number>(1);
  const [canvasWidth, setCanvasWidth] = useState<number>(512);
  const [canvasHeight, setCanvasHeight] = useState<number>(512);
  const [txiObject, setTXIObject] = useState<object>();
  const [txiPane, setTXIPane] = useState<JSX.Element>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const setPixelData = (image: KotOR.TPCObject|KotOR.TGAObject) => {
    const tab = props.tab as TabImageViewerState;
    rerender(!render);
    if(canvasRef.current){
      const canvas = canvasRef.current;
      image.getPixelData( (pixelData: any) => {
        let ctx = canvas.getContext('2d');
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
              height = image.header.height * ((image.header as any).faces || 1);
            }
          }

          setCanvasWidth(width);
          setCanvasHeight(height);

          tab.bitsPerPixel = image.header.bitsPerPixel;

          canvas.width = width;
          canvas.height = height;

          let imageData = ctx.getImageData(0, 0, width, height);
          let data = imageData.data;

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
    if(!!e.ctrlKey){
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

  useEffectOnce( () => {
    const tab = props.tab as TabImageViewerState;
    if(tab){
      tab.openFile().then( (image) => {
        setPixelData(image);
      });
    }

    return () => {
      
    }
  });

  useEffect(() => {
    console.log('containerRef', containerRef);
    if(containerRef.current){
      containerRef.current.addEventListener('wheel', onMouseWheel);
    }
    return () => {
      if(containerRef.current){
        containerRef.current.removeEventListener('wheel', onMouseWheel);
      }
    }
  }, [containerRef]);

  const eastContent = (
    (tab.image instanceof KotOR.TPCObject) ? (
      <div className="txi-pane">
        {
          Object.entries(tab.image.txi).map( (element: [string, any]) => {
            return (
              <div className="txi-element" key={element[0]}>{element[0]}: {element[1]}</div>
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