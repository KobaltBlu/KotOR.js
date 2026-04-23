import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as KotOR from '@kotor/KotOR';
import { UI3DRenderer } from '@forge/UI3DRenderer';

interface ModelViewerProps {
  fileData: Uint8Array;
  fileName: string;
  /** Optional MDX buffer; when omitted and file is .mdl, a zero-filled buffer is used (geometry may be incorrect). */
  mdxData?: Uint8Array | null;
}

interface ModelMetadata {
  modelName: string;
  nodeCount: number;
  names: string[];
  animationCount: number;
}

const MDL_HEADER_MDX_DATA_SIZE_OFFSET = 8;

/**
 * Reads the MDX data size from an MDL buffer (bytes 8–11, little-endian).
 * Used when only the MDL file is available to allocate a placeholder MDX buffer.
 */
function readMdxDataSizeFromMdlBuffer(mdlBuffer: Uint8Array): number {
  if (mdlBuffer.length < 12) return 0;
  const dataView = new DataView(mdlBuffer.buffer, mdlBuffer.byteOffset, mdlBuffer.byteLength);
  return dataView.getUint32(MDL_HEADER_MDX_DATA_SIZE_OFFSET, true);
}

/**
 * Builds an OdysseyModel from MDL and MDX buffers.
 * If mdxData is not provided and the file appears to be MDL, allocates a zero-filled MDX buffer of the size declared in the MDL header.
 */
function buildOdysseyModel(
  fileData: Uint8Array,
  fileName: string,
  mdxData: Uint8Array | null | undefined
): { odysseyModel: KotOR.OdysseyModel; usedPlaceholderMdx: boolean } {
  const isMdl = fileName.toLowerCase().endsWith('.mdl');
  const isMdx = fileName.toLowerCase().endsWith('.mdx');

  if (isMdx) {
    throw new Error('Opening an MDX file alone is not supported. Open the corresponding .mdl file to preview the model.');
  }

  if (!isMdl) {
    throw new Error('Unsupported model file extension. Use .mdl (with optional .mdx) for 3D preview.');
  }

  const mdlBuffer = new Uint8Array(fileData);
  let mdxBuffer: Uint8Array;
  let usedPlaceholderMdx = false;

  if (mdxData != null && mdxData.length > 0) {
    mdxBuffer = new Uint8Array(mdxData);
  } else {
    const mdxSize = readMdxDataSizeFromMdlBuffer(mdlBuffer);
    if (mdxSize <= 0) {
      throw new Error('Invalid MDL: could not read MDX data size from header.');
    }
    mdxBuffer = new Uint8Array(mdxSize);
    usedPlaceholderMdx = true;
  }

  const odysseyModel = KotOR.OdysseyModel.FromBuffers(mdlBuffer, mdxBuffer);
  return { odysseyModel, usedPlaceholderMdx };
}

/**
 * Extracts display metadata from a parsed OdysseyModel.
 */
function getMetadataFromOdysseyModel(odysseyModel: KotOR.OdysseyModel): ModelMetadata {
  return {
    modelName: odysseyModel.geometryHeader?.modelName ?? '',
    nodeCount: odysseyModel.geometryHeader?.nodeCount ?? 0,
    names: Array.isArray(odysseyModel.names) ? odysseyModel.names : [],
    animationCount: Array.isArray(odysseyModel.animations) ? odysseyModel.animations.length : 0,
  };
}

/**
 * 3D Model Viewer for MDL/MDX files.
 * Uses Forge's UI3DRenderer and KotOR OdysseyModel3D for canonical rendering.
 */
export const ModelViewer: React.FC<ModelViewerProps> = ({
  fileData,
  fileName,
  mdxData = null,
}) => {
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placeholderMdxWarning, setPlaceholderMdxWarning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<UI3DRenderer | null>(null);
  const model3DRef = useRef<KotOR.OdysseyModel3D | null>(null);

  const destroyScene = useCallback(() => {
    const renderer = rendererRef.current;
    const model3d = model3DRef.current;
    if (model3d && renderer) {
      renderer.detachObject(model3d);
      model3d.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m: any) => m.dispose?.());
        }
      });
      model3DRef.current = null;
    }
    if (renderer) {
      renderer.destroy();
      rendererRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!fileData || fileData.length === 0) {
      setError('No file data.');
      return;
    }

    setError(null);
    setPlaceholderMdxWarning(false);
    setMetadata(null);

    let odysseyModel: KotOR.OdysseyModel;
    let usedPlaceholderMdx = false;

    try {
      const result = buildOdysseyModel(fileData, fileName, mdxData);
      odysseyModel = result.odysseyModel;
      usedPlaceholderMdx = result.usedPlaceholderMdx;
      setMetadata(getMetadataFromOdysseyModel(odysseyModel));
      if (usedPlaceholderMdx) {
        setPlaceholderMdxWarning(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load model: ${message}`);
      console.error('ModelViewer: parse error', err);
      return;
    }

    return () => {
      destroyScene();
    };
  }, [fileData, fileName, mdxData, destroyScene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !metadata || error) return;

    let odysseyModel: KotOR.OdysseyModel;
    let usedPlaceholderMdx = false;
    try {
      const result = buildOdysseyModel(fileData, fileName, mdxData);
      odysseyModel = result.odysseyModel;
      usedPlaceholderMdx = result.usedPlaceholderMdx;
    } catch {
      return;
    }

    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 480;

    const renderer = new UI3DRenderer(undefined, width, height);
    rendererRef.current = renderer;
    renderer.setCanvas(canvas);
    renderer.enabled = true;

    KotOR.OdysseyModel3D.FromMDL(odysseyModel, {
      context: renderer,
      castShadow: false,
      receiveShadow: false,
      manageLighting: true,
      parseChildren: true,
    })
      .then((model3d: KotOR.OdysseyModel3D) => {
        if (!rendererRef.current) return;
        model3DRef.current = model3d;
        renderer.attachObject(model3d, true);
        renderer.fitCameraToScene(1.5);
        renderer.render();
      })
      .catch((err) => {
        console.error('ModelViewer: OdysseyModel3D.FromMDL failed', err);
        setError(`Failed to build 3D model: ${err instanceof Error ? err.message : String(err)}`);
      });

    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (entry && rendererRef.current) {
        const { width: w, height: h } = entry.contentRect;
        rendererRef.current.setSize(w, h);
      }
    });
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      destroyScene();
    };
  }, [metadata, error, fileData, fileName, mdxData, destroyScene]);

  if (error) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e1e1e',
          color: '#f00',
        }}
      >
        <h2>Error Loading Model</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#1e1e1e',
      }}
    >
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid #333',
          background: '#252526',
        }}
      >
        <span style={{ color: '#fff', fontSize: '14px' }}>{fileName}</span>
        {metadata && (
          <span style={{ color: '#888', fontSize: '12px', marginLeft: '15px' }}>
            Nodes: {metadata.nodeCount} · Anims: {metadata.animationCount}
          </span>
        )}
      </div>

      <div
        style={{
          flex: 1,
          position: 'relative',
          background: '#2a2a2a',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            cursor: 'grab',
            display: 'block',
          }}
        />

        {placeholderMdxWarning && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(180, 120, 0, 0.9)',
              color: '#000',
              padding: '10px 16px',
              borderRadius: '4px',
              fontSize: '12px',
              maxWidth: '90%',
            }}
          >
            <strong>MDX not loaded.</strong>{' '}
            Preview uses placeholder geometry. For accurate display, ensure the .mdx file is available next to the .mdl.
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'rgba(0,0,0,0.7)',
            padding: '12px',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
          }}
        >
          <div>
            <strong>Controls</strong>
          </div>
          <div>Left drag: Rotate</div>
          <div>Right drag: Pan</div>
          <div>Scroll: Zoom</div>
          <div>F: Fit to scene</div>
          <div>0-7: Preset views</div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.7)',
            padding: '12px',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            minWidth: '200px',
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <strong>Model Info</strong>
          </div>
          {metadata && (
            <>
              <div>File: {fileName}</div>
              <div>Size: {fileData.length} bytes</div>
              <div>Model: {metadata.modelName || '-'}</div>
              <div>Nodes: {metadata.nodeCount}</div>
              <div>Animations: {metadata.animationCount}</div>
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #444' }}>
                {metadata.names.length > 0 ? (
                  <div>
                    <strong>Node names ({metadata.names.length})</strong>
                    <div style={{ maxHeight: '120px', overflow: 'auto', marginTop: '4px' }}>
                      {metadata.names.slice(0, 20).join(', ')}
                      {metadata.names.length > 20 && ` ... +${metadata.names.length - 20} more`}
                    </div>
                  </div>
                ) : (
                  <em style={{ color: '#888' }}>No node names</em>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelViewer;
