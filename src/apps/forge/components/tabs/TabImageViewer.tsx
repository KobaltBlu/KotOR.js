import React, { useEffect, useRef, useState } from "react";
import { BaseTabProps } from "../../interfaces/BaseTabProps";
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import { TabImageViewerState } from "../../states/tabs/TabImageViewerState";
import { TPCObject } from "../../../../resource/TPCObject";
import { TGAObject } from "../../../../resource/TGAObject";

declare const KotOR: any;

export const TabImageViewer = function(props: BaseTabProps){

  const [canvasScale, setCanvasScale] = useState<number>(1);
  const [canvasWidth, setCanvasWidth] = useState<number>(512);
  const [canvasHeight, setCanvasHeight] = useState<number>(512);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const setPixelData = (image: TPCObject|TGAObject) => {
    const tab = props.tab as TabImageViewerState;
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
          // this.$canvas.css({
          //   width: this.width,
          //   height: this.height,
          //   position: 'absolute',
          //   left: 'calc(50% - '+this.width+'px / 2)',
          //   top: 'calc(50% - '+this.height+'px / 2)',
          // });

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

  return (
    <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'scroll', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${canvasScale})` }}>
      <canvas ref={canvasRef} className="checkerboard" style={{width: `${canvasWidth}px`, height: `${canvasHeight}px`}} />
    </div>
  );

}