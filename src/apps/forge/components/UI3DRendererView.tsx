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

  useEffectOnce(() => {
    if(!(props.context instanceof UI3DRenderer)){
      props.context = new UI3DRenderer(canvasRef.current as any);
    }
    return () => {
      if(props.context){
        // props.context.destroy();
      }
    }
  });

  useEffect( () => {
    props.context.setCanvas(canvasRef.current as any);
    if(canvasRef.current){
      canvasRef.current.dataset.uuid = crypto.randomUUID();
    }
  }, [canvasRef.current]);

  return (
    <div className="UI3DRendererView-container" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,}}>
      <canvas ref={canvasRef} className="UI3DRendererView-canvas" tabIndex={1} />
      {props.children}
    </div>
  );

}
