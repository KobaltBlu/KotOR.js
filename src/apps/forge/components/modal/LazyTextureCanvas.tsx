import React, { useState, useEffect, useRef } from "react";
import { TextureCanvas } from "../tabs/tab-utc-editor/TextureCanvas";

interface LazyTextureCanvasProps {
  texture: string;
  width?: number;
  height?: number;
  className?: string;
}

export const LazyTextureCanvas: React.FC<LazyTextureCanvasProps> = ({
  texture,
  width,
  height,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Unobserve once visible to avoid re-checking
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // Start loading when item is 100px away from viewport
        rootMargin: '100px'
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ 
        width: width || 64, 
        height: height || 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {isVisible ? (
        <TextureCanvas
          texture={texture}
          width={width}
          height={height}
        />
      ) : (
        <div 
          className="item-browser-icon-placeholder" 
          style={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '1.5rem'
          }}
        >
          ...
        </div>
      )}
    </div>
  );
};

