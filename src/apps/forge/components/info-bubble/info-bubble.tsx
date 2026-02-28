import React, { useState, useRef, useEffect } from 'react';
import "@/apps/forge/components/info-bubble/info-bubble.scss";

interface InfoBubbleProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
  className?: string;
  children: React.ReactNode;
}

export const InfoBubble: React.FC<InfoBubbleProps> = ({
  content,
  position = 'top',
  maxWidth = 300,
  className = '',
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !bubbleRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const bubbleRect = bubbleRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - bubbleRect.height - 8;
        left = triggerRect.left + (triggerRect.width / 2) - (bubbleRect.width / 2);
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width / 2) - (bubbleRect.width / 2);
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height / 2) - (bubbleRect.height / 2);
        left = triggerRect.left - bubbleRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height / 2) - (bubbleRect.height / 2);
        left = triggerRect.right + 8;
        break;
    }

    // Adjust for viewport boundaries
    if (left < 8) left = 8;
    if (left + bubbleRect.width > viewport.width - 8) {
      left = viewport.width - bubbleRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + bubbleRect.height > viewport.height - 8) {
      top = viewport.height - bubbleRect.height - 8;
    }

    setBubblePosition({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <div 
      ref={triggerRef}
      className={`info-bubble-trigger ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={bubbleRef}
          className={`info-bubble info-bubble--${position}`}
          style={{
            top: bubblePosition.top,
            left: bubblePosition.left,
            maxWidth: maxWidth
          }}
        >
          <div className="info-bubble__content">
            {content}
          </div>
          <div className={`info-bubble__arrow info-bubble__arrow--${position}`} />
        </div>
      )}
    </div>
  );
};
