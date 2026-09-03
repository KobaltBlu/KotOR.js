import React, { useLayoutEffect, useRef } from "react";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import { CAMERA_VIEW_PRESETS, UI3DRenderer } from "@/apps/forge/UI3DRenderer";
import { MenuBar, MenuItem } from "@/apps/forge/components/common/MenuBar";

// Re-export MenuItem for backward compatibility
export type { MenuItem };

export interface UI3DRendererViewProps {
  context: UI3DRenderer;
  children?: any;
  onMouseWheel?: Function;
  menuItems?: MenuItem[];
  showMenuBar?: boolean;
}

export const UI3DRendererView = function(props: UI3DRendererViewProps){
  const canvasRef: React.RefObject<HTMLCanvasElement> = useRef<HTMLCanvasElement>() as any;
  const context = props.context;

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

  // Refs do not trigger re-renders; [canvasRef.current] in deps never re-fires after the canvas mounts.
  // useLayoutEffect runs after DOM commit so the canvas ref is set before parent useEffect (e.g. openFile/loadHead).
  useLayoutEffect( () => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    props.context.setCanvas(canvas);
    if(!canvas.dataset.uuid){
      canvas.dataset.uuid = crypto.randomUUID();
    }
  }, [props.context]);

  // Default menu items if none provided
  const defaultMenuItems: MenuItem[] = [
    {
      label: 'View',
      children: [
        {
          label: 'Camera',
          children: [
            { label: 'Fit Camera to Scene', onClick: () => context.fitCameraToScene() },
            { separator: true },
            ...CAMERA_VIEW_PRESETS.map((preset) => ({
              label: `${preset.label} View`,
              onClick: () => context.reorientCamera(preset.view),
            })),
          ],
        },
      ],
    }
  ];

  const menuItems = props.menuItems || defaultMenuItems;

  return (
    <div className="UI3DRendererView-container" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,}}>
      {props.showMenuBar && <MenuBar items={menuItems} variant="overlay" />}
      <canvas 
        ref={canvasRef} 
        className="UI3DRendererView-canvas" 
        tabIndex={1} 
        style={{ 
          position: 'absolute',
          top: props.showMenuBar ? 'var(--forge-menubar-height)' : 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: props.showMenuBar ? 'calc(100% - var(--forge-menubar-height))' : '100%',
        }} 
      />
      {props.children}
    </div>
  );

}
