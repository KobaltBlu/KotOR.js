import React, { useLayoutEffect, useRef } from 'react';
import { useEffectOnce } from '@/apps/forge/helpers/UseEffectOnce';
import { CameraView, UI3DRenderer } from '@/apps/forge/UI3DRenderer';
import { MenuBar, MenuItem } from '@/apps/forge/components/common/MenuBar';

// Re-export MenuItem for backward compatibility
export type { MenuItem };

export interface UI3DRendererViewProps {
  context: UI3DRenderer;
  children?: any;
  onMouseWheel?: Function;
  menuItems?: MenuItem[];
  showMenuBar?: boolean;
}

export const UI3DRendererView = function (props: UI3DRendererViewProps) {
  const canvasRef: React.RefObject<HTMLCanvasElement> = useRef<HTMLCanvasElement>() as any;
  const context = props.context;

  useEffectOnce(() => {
    if (!(props.context instanceof UI3DRenderer)) {
      props.context = new UI3DRenderer(canvasRef.current as any);
    }
    return () => {
      if (props.context) {
        // props.context.destroy();
      }
    };
  });

  // Refs do not trigger re-renders; [canvasRef.current] in deps never re-fires after the canvas mounts.
  // useLayoutEffect runs after DOM commit so the canvas ref is set before parent useEffect (e.g. openFile/loadHead).
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    props.context.setCanvas(canvas);
    if (!canvas.dataset.uuid) {
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
            { label: 'Top View', onClick: () => context.reorientCamera(CameraView.Top) },
            { label: 'Bottom View', onClick: () => context.reorientCamera(CameraView.Bottom) },
            { label: 'Left View', onClick: () => context.reorientCamera(CameraView.Left) },
            { label: 'Right View', onClick: () => context.reorientCamera(CameraView.Right) },
            { label: 'Front View', onClick: () => context.reorientCamera(CameraView.Front) },
            { label: 'Back View', onClick: () => context.reorientCamera(CameraView.Back) },
            { label: 'Isometric View', onClick: () => context.reorientCamera(CameraView.Orthogonal) },
            { label: 'Default View', onClick: () => context.reorientCamera(CameraView.Default) },
          ],
        },
      ],
    },
  ];

  const menuItems = props.menuItems || defaultMenuItems;

  return (
    <div className="UI3DRendererView-container" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {props.showMenuBar && <MenuBar items={menuItems} />}
      <canvas
        ref={canvasRef}
        className="UI3DRendererView-canvas"
        tabIndex={1}
        style={{
          position: 'absolute',
          top: props.showMenuBar ? '24px' : 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 'calc(100% - ' + (props.showMenuBar ? '24px' : '0') + ')',
        }}
      />
      {props.children}
    </div>
  );
};
