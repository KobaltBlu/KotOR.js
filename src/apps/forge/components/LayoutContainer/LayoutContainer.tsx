import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Draggable from 'react-draggable';
import { useEffectOnce } from "../../helpers/UseEffectOnce";
import './LayoutContainer.scss';

// Types for better type safety
interface LayoutBounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

interface LayoutStyle {
  position: 'absolute';
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  width?: number;
  height?: number;
  display?: 'block' | 'none' | 'flex';
  justifyContent?: string;
  alignItems?: string;
  cursor?: string;
}

interface LayoutState {
  northSize: number;
  southSize: number;
  eastSize: number;
  westSize: number;
  northOpen: boolean;
  southOpen: boolean;
  eastOpen: boolean;
  westOpen: boolean;
}

export interface LayoutContainerProps {
  northContent?: React.ReactNode;
  southContent?: React.ReactNode;
  eastContent?: React.ReactNode;
  westContent?: React.ReactNode;
  northSize?: number;
  southSize?: number;
  eastSize?: number;
  westSize?: number;
  children?: React.ReactNode;
}

// Constants
const DEFAULT_PANE_SIZE = 250;
const BAR_OPEN_SIZE = 8;
const BAR_CLOSED_SIZE = 14;
const MIN_PANE_SIZE = 8;

export const LayoutContainer = React.memo<LayoutContainerProps>(function LayoutContainer(props) {
  // Refs using a more organized approach
  const refs = useRef({
    container: null as HTMLDivElement | null,
    center: null as HTMLDivElement | null,
    north: null as HTMLDivElement | null,
    south: null as HTMLDivElement | null,
    east: null as HTMLDivElement | null,
    west: null as HTMLDivElement | null,
    northHandle: null as HTMLDivElement | null,
    southHandle: null as HTMLDivElement | null,
    eastHandle: null as HTMLDivElement | null,
    westHandle: null as HTMLDivElement | null,
  });

  // State management
  const [layoutState, setLayoutState] = useState<LayoutState>({
    northSize: props.northSize ?? DEFAULT_PANE_SIZE,
    southSize: props.southSize ?? DEFAULT_PANE_SIZE,
    eastSize: props.eastSize ?? DEFAULT_PANE_SIZE,
    westSize: props.westSize ?? DEFAULT_PANE_SIZE,
    northOpen: true,
    southOpen: true,
    eastOpen: true,
    westOpen: true,
  });

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Content availability
  const hasNorthContent = Boolean(props.northContent);
  const hasSouthContent = Boolean(props.southContent);
  const hasEastContent = Boolean(props.eastContent);
  const hasWestContent = Boolean(props.westContent);

  // Track drag start position to detect actual movement
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 3; // Minimum pixels of movement to trigger resize

  // Event handlers with proper memoization
  const handleStart = useCallback((e: any, handle: string) => {
    // Store the initial drag position
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleStop = useCallback((e: any, handle: string) => {
    if (!refs.current.container || !dragStartPos.current) return;

    // Calculate the distance moved
    const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
    const deltaY = Math.abs(e.clientY - dragStartPos.current.y);
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Only update layout if there was significant movement
    if (totalMovement < DRAG_THRESHOLD) {
      dragStartPos.current = null;
      return;
    }

    const rect = refs.current.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const barSizeHalf = BAR_OPEN_SIZE / 2;

    setLayoutState(prevState => {
      const newState = { ...prevState };
      
      switch (handle) {
        case 'north':
          if (!hasNorthContent || !prevState.northOpen) return prevState;
          newState.northSize = Math.max(MIN_PANE_SIZE, y - barSizeHalf);
          break;
        case 'south':
          if (!hasSouthContent || !prevState.southOpen) return prevState;
          newState.southSize = Math.max(MIN_PANE_SIZE, containerSize.height - (y - barSizeHalf));
          break;
        case 'east':
          if (!hasEastContent || !prevState.eastOpen) return prevState;
          newState.eastSize = Math.max(MIN_PANE_SIZE, containerSize.width - (x - barSizeHalf));
          break;
        case 'west':
          if (!hasWestContent || !prevState.westOpen) return prevState;
          newState.westSize = Math.max(MIN_PANE_SIZE, x - barSizeHalf);
          break;
        default:
          return prevState;
      }
      
      return newState;
    });

    // Reset drag start position
    dragStartPos.current = null;
  }, [hasNorthContent, hasSouthContent, hasEastContent, hasWestContent, containerSize]);

  const onPaneToggle = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    setLayoutState(prevState => ({
      ...prevState,
      [`${handle}Open`]: !prevState[`${handle}Open` as keyof LayoutState] as boolean
    }));
  }, []);

  const onWindowResize = useCallback(() => {
    if (refs.current.container) {
      setContainerSize({
        width: refs.current.container.offsetWidth,
        height: refs.current.container.offsetHeight
      });
    }
  }, []);

  // Update container size on mount and resize
  useEffect(() => {
    onWindowResize();
  }, [onWindowResize]);

  useEffectOnce(() => {
    window.addEventListener('resize', onWindowResize);
    return () => {
      window.removeEventListener('resize', onWindowResize);
    };
  });

  // Memoized layout calculation - no more direct DOM manipulation!
  const layoutStyles = useMemo(() => {
    const { width: tabWidth, height: tabHeight } = containerSize;
    
    if (tabWidth === 0 || tabHeight === 0) {
      return {
        center: { position: 'absolute' as const, width: '100%', height: '100%' },
        north: { position: 'absolute' as const, display: 'none' as const },
        south: { position: 'absolute' as const, display: 'none' as const },
        east: { position: 'absolute' as const, display: 'none' as const },
        west: { position: 'absolute' as const, display: 'none' as const },
        northHandle: { position: 'absolute' as const, display: 'none' as const },
        southHandle: { position: 'absolute' as const, display: 'none' as const },
        eastHandle: { position: 'absolute' as const, display: 'none' as const },
        westHandle: { position: 'absolute' as const, display: 'none' as const },
      };
    }

    // Calculate gutter sizes
    const northGutterSize = hasNorthContent ? (layoutState.northOpen ? BAR_OPEN_SIZE : BAR_CLOSED_SIZE) : 0;
    const southGutterSize = hasSouthContent ? (layoutState.southOpen ? BAR_OPEN_SIZE : BAR_CLOSED_SIZE) : 0;
    const eastGutterSize = hasEastContent ? (layoutState.eastOpen ? BAR_OPEN_SIZE : BAR_CLOSED_SIZE) : 0;
    const westGutterSize = hasWestContent ? (layoutState.westOpen ? BAR_OPEN_SIZE : BAR_CLOSED_SIZE) : 0;

    // Calculate bounds
    const westBounds: LayoutBounds = {
      top: 0,
      left: 0,
      width: (hasWestContent && layoutState.westOpen) ? layoutState.westSize - (westGutterSize / 2) : 0,
      height: (hasWestContent && layoutState.westOpen) ? tabHeight : 0,
      right: 0,
      bottom: 0,
    };

    const eastBounds: LayoutBounds = {
      top: 0,
      right: 0,
      width: (hasEastContent && layoutState.eastOpen) ? layoutState.eastSize - (eastGutterSize / 2) : 0,
      height: (hasEastContent && layoutState.eastOpen) ? tabHeight : 0,
      left: 0,
      bottom: 0,
    };

    const northBounds: LayoutBounds = {
      top: 0,
      right: (hasNorthContent && layoutState.northOpen) ? eastBounds.width + eastGutterSize : 0,
      left: (hasNorthContent && layoutState.northOpen) ? westBounds.width + westGutterSize : 0,
      width: (tabWidth - westBounds.width) - eastBounds.width,
      height: (hasNorthContent && layoutState.northOpen) ? layoutState.northSize - (northGutterSize / 2) : 0,
      bottom: 0,
    };

    const southBounds: LayoutBounds = {
      bottom: 0,
      right: (hasSouthContent && layoutState.southOpen) ? eastBounds.width + eastGutterSize : 0,
      left: (hasWestContent && layoutState.westOpen) ? westBounds.width + westGutterSize : 0,
      width: (tabWidth - westBounds.width) - eastBounds.width,
      height: (hasSouthContent && layoutState.southOpen) ? layoutState.southSize - (southGutterSize / 2) : 0,
      top: 0,
    };

    const centerBounds: LayoutBounds = {
      top: northBounds.height + northGutterSize,
      bottom: southBounds.height + southGutterSize,
      left: westBounds.width + westGutterSize,
      right: eastBounds.width + eastGutterSize,
      width: ((tabWidth - eastBounds.width) - westBounds.width) - westGutterSize - eastGutterSize,
      height: ((tabHeight - northBounds.height) - southBounds.height) - northGutterSize - southGutterSize,
    };

    // Generate styles
    const centerStyle: LayoutStyle = {
      position: 'absolute',
      top: centerBounds.top,
      bottom: centerBounds.bottom,
      left: centerBounds.left,
      right: centerBounds.right,
    };

    const northStyle: LayoutStyle = {
      position: 'absolute',
      top: 0,
      bottom: (hasNorthContent && layoutState.northOpen) ? tabHeight - northBounds.height : tabHeight,
      right: (hasNorthContent && layoutState.northOpen) ? eastBounds.width : 0,
      left: (hasNorthContent && layoutState.northOpen) ? westBounds.width : 0,
      display: (hasNorthContent && layoutState.northOpen) ? 'block' : 'none',
    };

    const southStyle: LayoutStyle = {
      position: 'absolute',
      top: (hasSouthContent && layoutState.southOpen) ? tabHeight - southBounds.height : tabHeight,
      bottom: 0,
      right: (hasSouthContent && layoutState.southOpen) ? eastBounds.width : 0,
      left: (hasSouthContent && layoutState.southOpen) ? westBounds.width : 0,
      display: (hasSouthContent && layoutState.southOpen) ? 'block' : 'none',
    };

    const eastStyle: LayoutStyle = {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 0,
      left: (hasEastContent && layoutState.eastOpen) ? tabWidth - eastBounds.width : tabWidth,
      display: (hasEastContent && layoutState.eastOpen) ? 'block' : 'none',
    };

    const westStyle: LayoutStyle = {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: (hasWestContent && layoutState.westOpen) ? tabWidth - westBounds.width : tabWidth,
      left: 0,
      display: (hasWestContent && layoutState.westOpen) ? 'block' : 'none',
    };

    // Handle styles
    const northHandleStyle: LayoutStyle = {
      position: 'absolute',
      top: layoutState.northOpen ? northBounds.height : 0,
      left: northBounds.left,
      right: northBounds.right,
      height: northGutterSize,
      display: northGutterSize > 0 ? 'flex' : 'none',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'n-resize',
    };

    const southHandleStyle: LayoutStyle = {
      position: 'absolute',
      top: layoutState.southOpen ? (tabHeight - southBounds.height - southGutterSize) : tabHeight - southGutterSize,
      left: southBounds.left,
      right: southBounds.right,
      height: southGutterSize,
      display: southGutterSize > 0 ? 'flex' : 'none',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 's-resize',
    };

    const eastHandleStyle: LayoutStyle = {
      position: 'absolute',
      bottom: 0,
      top: 0,
      left: layoutState.eastOpen ? (tabWidth - eastBounds.width - eastGutterSize) : (tabWidth - eastGutterSize),
      width: eastGutterSize,
      display: eastGutterSize > 0 ? 'flex' : 'none',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'e-resize',
    };

    const westHandleStyle: LayoutStyle = {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: westBounds.width,
      width: westGutterSize,
      display: westGutterSize > 0 ? 'flex' : 'none',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'w-resize',
    };

    return {
      center: centerStyle,
      north: northStyle,
      south: southStyle,
      east: eastStyle,
      west: westStyle,
      northHandle: northHandleStyle,
      southHandle: southHandleStyle,
      eastHandle: eastHandleStyle,
      westHandle: westHandleStyle,
    };
  }, [containerSize, layoutState, hasNorthContent, hasSouthContent, hasEastContent, hasWestContent]);

  // Memoized draggable components to prevent unnecessary re-renders
  const DraggableHandle = useCallback(({ 
    direction, 
    axis, 
    style, 
    className, 
    title 
  }: { 
    direction: string; 
    axis: 'x' | 'y'; 
    style: LayoutStyle; 
    className: string; 
    title: string; 
  }) => {
    // Create a ref for this specific handle to avoid findDOMNode warning
    const handleRef = useRef<HTMLDivElement>(null);
    
    return (
      <Draggable 
        nodeRef={handleRef}
        bounds="parent" 
        axis={axis} 
        onStart={(e) => handleStart(e, direction)} 
        onStop={(e) => handleStop(e, direction)}
      >
        <div 
          ref={(el) => {
            (handleRef as any).current = el;
            refs.current[`${direction}Handle` as keyof typeof refs.current] = el;
          }}
          className={className} 
          style={style} 
          title={title}
        >
          <div 
            onClick={(e) => onPaneToggle(e, direction)} 
            className={`ui-layout-toggler ui-layout-toggler-${direction} ui-layout-toggler-open ui-layout-toggler-${direction}-open`} 
            title="Toggle"
            style={{
              height: axis === 'y' ? '100%' : '50px',
              width: axis === 'x' ? '100%' : '50px',
            }}
          />
        </div>
      </Draggable>
    );
  }, [handleStart, handleStop, onPaneToggle]);

  return (
    <div ref={(el) => { refs.current.container = el; }} className="layout-container">
      <div ref={(el) => { refs.current.north = el; }} className="ui-layout-north" style={layoutStyles.north}>
        {props.northContent}
      </div>
      <div ref={(el) => { refs.current.west = el; }} className="ui-layout-west" style={layoutStyles.west}>
        {props.westContent}
      </div>
      <div ref={(el) => { refs.current.center = el; }} className="ui-layout-center" style={layoutStyles.center}>
        {props.children}
      </div>
      <div ref={(el) => { refs.current.east = el; }} className="ui-layout-east" style={layoutStyles.east}>
        {props.eastContent}
      </div>
      <div ref={(el) => { refs.current.south = el; }} className="ui-layout-south" style={layoutStyles.south}>
        {props.southContent}
      </div>
      
      {hasNorthContent && (
        <DraggableHandle
          direction="north"
          axis="y"
          style={layoutStyles.northHandle}
          className="ui-layout-resizer ui-layout-resizer-north ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-north-open"
          title="Resize North"
        />
      )}
      
      {hasSouthContent && (
        <DraggableHandle
          direction="south"
          axis="y"
          style={layoutStyles.southHandle}
          className="ui-layout-resizer ui-layout-resizer-south ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-south-open"
          title="Resize South"
        />
      )}
      
      {hasEastContent && (
        <DraggableHandle
          direction="east"
          axis="x"
          style={layoutStyles.eastHandle}
          className="ui-layout-resizer ui-layout-resizer-east ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-east-open"
          title="Resize East"
        />
      )}
      
      {hasWestContent && (
        <DraggableHandle
          direction="west"
          axis="x"
          style={layoutStyles.westHandle}
          className="ui-layout-resizer ui-layout-resizer-west ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-west-open"
          title="Resize West"
        />
      )}
    </div>
  );
});
