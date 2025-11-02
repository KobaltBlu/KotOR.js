import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface LightboxComponentProps {
  active: boolean;
  onClose: () => void;
  type: 'image' | 'ytvideo';
  // For images: full URL; For YouTube: video id or full embed URL
  src: string;
}

export const LightboxComponent = function(props: LightboxComponentProps){
  const { active, onClose, type, src } = props;

  const contentRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [intrinsicImageSize, setIntrinsicImageSize] = useState<{ width: number; height: number } | null>(null);

  const handleWindowResize = useCallback(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [handleWindowResize]);

  // Calculate desired aspect ratio
  const aspectRatio = useMemo(() => {
    if (type === 'ytvideo') {
      return 16 / 9;
    }
    if (intrinsicImageSize && intrinsicImageSize.width > 0) {
      return intrinsicImageSize.width / intrinsicImageSize.height;
    }
    // Fallback ratio for images if not yet loaded
    return 16 / 9;
  }, [type, intrinsicImageSize]);

  // Compute responsive lightbox dimensions
  const lightboxDimensions = useMemo(() => {
    const { width: windowWidth, height: windowHeight } = windowSize;
    const maxWidth = Math.min(windowWidth * 0.9, 1200);
    const maxHeight = Math.min(windowHeight * 0.8, 900);

    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    // Minimum size guard
    width = Math.max(width, 320);
    height = Math.max(height, 180);

    return { width, height };
  }, [windowSize, aspectRatio]);

  // Prepare YouTube embed URL
  const youTubeSrc = useMemo(() => {
    if (type !== 'ytvideo') return '';
    const isFullUrl = src.startsWith('http');
    const id = isFullUrl ? src : src; // assume id when not URL
    return isFullUrl ? src : `https://www.youtube.com/embed/${id}`;
  }, [type, src]);

  // Image onLoad to capture intrinsic size
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setIntrinsicImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

  return (
    <div id="lightbox" className={`lightbox ${active ? 'active' : ''}`}>
      <div 
        className="lightbox-content-wrapper"
        style={{
          width: `${lightboxDimensions.width}px`,
          height: `${lightboxDimensions.height}px`,
          maxWidth: '90vw',
          maxHeight: '80vh'
        }}
      >
        <div className="lightbox-close" onClick={onClose}><i className="fa-solid fa-circle-xmark"></i></div>
        <div className="lightbox-content">
          <div ref={contentRef} style={{ textAlign: 'center', width: '100%', height: '100%' }}>
            {type === 'ytvideo' ? (
              <iframe
                width={Math.round(lightboxDimensions.width)}
                height={Math.round(lightboxDimensions.height)}
                src={youTubeSrc}
                title="YouTube video player"
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <img
                ref={imgRef}
                src={src}
                alt=""
                onLoad={onImageLoad}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};