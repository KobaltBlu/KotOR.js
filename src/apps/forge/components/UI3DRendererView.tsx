import React, { useEffect, useRef, useState } from "react";
import { useEffectOnce } from "../helpers/UseEffectOnce";
import { UI3DRenderer } from "../UI3DRenderer";

export interface UI3DRendererViewProps {
  context: UI3DRenderer;
  children?: any;
  onMouseWheel?: Function;
}

export const UI3DRendererView = function(props: UI3DRendererViewProps){
  const canvasRef: React.RefObject<HTMLCanvasElement> = useRef<HTMLCanvasElement>() as any;
  // const [canvasScale, setCanvasScale] = useState<number>(1);

  useEffectOnce(() => {
    if(!(props.context instanceof UI3DRenderer)){
      props.context = new UI3DRenderer(canvasRef.current as any);
    }
    return () => {
      if(props.context){
        props.context.controls.dispose();
      }
    }
  });

  useEffect( () => {
    props.context.setCanvas(canvasRef.current as any);
    if(canvasRef.current){
      canvasRef.current.dataset.uuid = crypto.randomUUID();
      canvasRef.current.addEventListener('wheel', onMouseWheel);
    }
    return () => {
      if(canvasRef.current){
        canvasRef.current.removeEventListener('wheel', onMouseWheel);
      }
    }
  }, [canvasRef.current]);

  const onMouseWheel = (e: WheelEvent) => {
    if(typeof props.onMouseWheel === 'function'){
      props.onMouseWheel(e);
    }
    // let tmpCanvasScale = canvasScale;
    // if(!!e.ctrlKey){
    //   if(e.deltaY < 0){
    //     tmpCanvasScale -= 0.25;
    //   }else{
    //     tmpCanvasScale += 0.25;
    //   }
    // }
    // if(tmpCanvasScale < -2.5){
    //   tmpCanvasScale = -2.5;
    // }
    // if(tmpCanvasScale > 2.5){
    //   tmpCanvasScale = 2.5;
    // }
    // setCanvasScale(tmpCanvasScale);
  }

  return (
    <div className="UI3DRendererView-container" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,}}>
      <canvas ref={canvasRef} className="UI3DRendererView-canvas" tabIndex={1} />
      {props.children}
    </div>
  );

}
