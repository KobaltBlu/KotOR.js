import React, { useEffect, useState, useRef } from 'react';
import * as KotOR from '@kotor/KotOR';

interface ImageViewerProps {
  fileData: Uint8Array;
  fileName: string;
}

/**
 * Image Viewer for TPC/TGA textures
 */
export const ImageViewer: React.FC<ImageViewerProps> = ({ fileData, fileName }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const ext = fileName.split('.').pop()?.toLowerCase();
      
      if (ext === 'tpc') {
        const tpc = new KotOR.TPCObject(fileData.buffer);
        // TODO: Convert TPC to canvas/blob
        // For now, show placeholder
        setError('TPC decoding not yet implemented in webview');
      } else if (ext === 'tga') {
        const tga = new KotOR.TGAObject(fileData.buffer);
        // TODO: Convert TGA to canvas/blob
        setError('TGA decoding not yet implemented in webview');
      } else {
        // Try to load as standard image
        const blob = new Blob([fileData], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      }
    } catch (err) {
      setError(`Failed to load image: ${err}`);
      console.error('Error loading image:', err);
    }

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [fileData, fileName]);

  if (error) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e1e1e',
        color: '#f00'
      }}>
        <h2>Error Loading Image</h2>
        <p>{error}</p>
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
          File: {fileName} ({fileData.length} bytes)
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#1e1e1e'
    }}>
      {/* Toolbar */}
      <div style={{
        padding: '10px 20px',
        borderBottom: '1px solid #333',
        background: '#252526',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <span style={{ color: '#fff', fontSize: '14px' }}>{fileName}</span>
          <span style={{ color: '#888', fontSize: '12px', marginLeft: '15px' }}>
            {fileData.length} bytes
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setZoom(Math.max(10, zoom - 10))}
            style={{
              background: '#0e639c',
              border: 'none',
              color: '#fff',
              padding: '5px 10px',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            −
          </button>
          <span style={{ color: '#fff', fontSize: '13px', minWidth: '50px', textAlign: 'center' }}>
            {zoom}%
          </span>
          <button
            onClick={() => setZoom(Math.min(500, zoom + 10))}
            style={{
              background: '#0e639c',
              border: 'none',
              color: '#fff',
              padding: '5px 10px',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            +
          </button>
          <button
            onClick={() => setZoom(100)}
            style={{
              background: '#0e639c',
              border: 'none',
              color: '#fff',
              padding: '5px 10px',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            100%
          </button>
        </div>
      </div>

      {/* Image Display */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px'
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={fileName}
            style={{
              maxWidth: 'none',
              maxHeight: 'none',
              transform: `scale(${zoom / 100})`,
              imageRendering: zoom > 200 ? 'pixelated' : 'auto'
            }}
          />
        ) : (
          <canvas
            ref={canvasRef}
            style={{
              transform: `scale(${zoom / 100})`
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ImageViewer;
