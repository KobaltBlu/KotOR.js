import React, { useCallback, useEffect, useRef, useState } from "react";
import { BaseTabProps } from "@/apps/forge/interfaces/BaseTabProps";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { TabImageViewerState } from "@/apps/forge/states/tabs";
import { LayoutContainer } from "@/apps/forge/components/LayoutContainer/LayoutContainer";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";

import * as KotOR from "@/apps/forge/KotOR";

export const TabImageViewer = function(props: BaseTabProps){

  const tab = props.tab as TabImageViewerState;
  const [render, rerender] = useState<boolean>(false);
  const [canvasScale, setCanvasScale] = useState<number>(1);
  const [canvasWidth, setCanvasWidth] = useState<number>(512);
  const [canvasHeight, setCanvasHeight] = useState<number>(512);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const clampScale = (value: number) => {
    if(value < 0.25) return 0.25;
    if(value > 10) return 10;
    return value;
  };

  const setPixelData = (image: KotOR.TPCObject|KotOR.TGAObject) => {
    rerender(!render);
    if(canvasRef.current){
      const canvas = canvasRef.current;
      tab.getPixelData().then( (pixelData) => {
        console.log('pixel data', pixelData);
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

  const onMouseWheel = useCallback((e: WheelEvent) => {
    if(!e.ctrlKey){
      return;
    }
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setCanvasScale((prev) => clampScale(prev + delta));
  }, []);

  const zoomIn = () => {
    setCanvasScale((prev) => clampScale(prev + 0.25));
  };

  const zoomOut = () => {
    setCanvasScale((prev) => clampScale(prev - 0.25));
  };

  const zoomReset = () => {
    setCanvasScale(1);
  };

  const zoomFit = () => {
    const el = containerRef.current;
    if(!el || canvasWidth <= 0 || canvasHeight <= 0){
      return;
    }
    const padding = 40;
    const fitWidth = Math.max(50, el.clientWidth - padding);
    const fitHeight = Math.max(50, el.clientHeight - padding);
    const next = Math.min(fitWidth / canvasWidth, fitHeight / canvasHeight);
    setCanvasScale(clampScale(next));
  };

  const onEditorFileLoad = () => {
    setPixelData(tab.image);
  };

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        {
          label: 'Export TGA',
          onClick: () => {
            void tab.exportAs('tga');
          }
        },
        {
          label: 'Export PNG',
          onClick: () => {
            void tab.exportAs('png');
          }
        },
        {
          label: 'Export TPC',
          onClick: () => {
            void tab.exportAs('tpc');
          }
        }
      ]
    }
  ];

  useEffectOnce( () => {
    tab.addEventListener('onEditorFileLoad', onEditorFileLoad);
    return () => {
      tab.removeEventListener('onEditorFileLoad', onEditorFileLoad);
    }
  });

  useEffect(() => {
    if(containerRef.current){
      containerRef.current.addEventListener('wheel', onMouseWheel, { passive: false });
    }
    return () => {
      if(containerRef.current){
        containerRef.current.removeEventListener('wheel', onMouseWheel);
      }
    }
  }, [onMouseWheel]);

  const eastContent = (
    (tab.image instanceof KotOR.TPCObject) ? (
      <div className="txi-pane">
        {
          Object.entries(tab.image.txi).map( (element: [string, any]) => {
            return (
              <div className="txi-element" key={element[0]}>
                <span className="txi-property">{element[0]}</span>
                <span className="txi-value">{element[1]}</span>
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
        <MenuBar items={menuItems} />
        <div className="tab-image-viewer-menubar">
          <div className="tab-image-viewer-menubar__group">
            <span className="tab-image-viewer-menubar__label">Zoom</span>
            <button type="button" className="tab-image-viewer-menubar__btn" onClick={zoomOut}>-</button>
            <button type="button" className="tab-image-viewer-menubar__btn" onClick={zoomIn}>+</button>
            <button type="button" className="tab-image-viewer-menubar__btn" onClick={zoomReset}>100%</button>
            <button type="button" className="tab-image-viewer-menubar__btn" onClick={zoomFit}>Fit</button>
            <span className="tab-image-viewer-menubar__readout">{Math.round(canvasScale * 100)}%</span>
          </div>
          <div className="tab-image-viewer-menubar__group">
            <span className="tab-image-viewer-menubar__meta">{canvasWidth}x{canvasHeight}</span>
          </div>
        </div>
        <div ref={containerRef} className="tab-image-viewer-viewport">
          <canvas ref={canvasRef} className="checkerboard tab-image-viewer-canvas" style={{width: `${canvasWidth}px`, height: `${canvasHeight}px`, transform: `scale(${canvasScale})`}} />
        </div>
      </LayoutContainer>
    </>
  );

}
