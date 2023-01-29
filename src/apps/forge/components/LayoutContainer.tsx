import React, { useEffect, useRef, useState } from "react";
import Draggable from 'react-draggable';
import { useLayoutContext } from "../context/LayoutContainerContext";

declare const KotOR: any;

export interface LayoutContainerProps {
  northContent?: JSX.Element;
  southContent?: JSX.Element;
  eastContent?: JSX.Element;
  westContent?: JSX.Element;
  northSize?: number;
  southSize?: number;
  eastSize?: number;
  westSize?: number;
  children?: React.ReactNode;
}

export const LayoutContainer = function(props: LayoutContainerProps) {
  const layoutContext = useLayoutContext();
  console.log('ctx', layoutContext);
  const containerRef = useRef<HTMLDivElement>();
  const centerRef = useRef<HTMLDivElement>();
  const northRef = useRef<HTMLDivElement>();
  const northHandleRef = useRef<HTMLDivElement>();
  const northHandleToggleRef = useRef<HTMLDivElement>();
  const southRef = useRef<HTMLDivElement>();
  const southHandleRef = useRef<HTMLDivElement>();
  const southHandleToggleRef = useRef<HTMLDivElement>();
  const eastRef = useRef<HTMLDivElement>();
  const eastHandleRef = useRef<HTMLDivElement>();
  const eastHandleToggleRef = useRef<HTMLDivElement>();
  const westRef = useRef<HTMLDivElement>();
  const westHandleRef = useRef<HTMLDivElement>();
  const westHandleToggleRef = useRef<HTMLDivElement>();

  const northContent: JSX.Element = props.northContent;
  const southContent: JSX.Element = props.southContent;
  const eastContent: JSX.Element = props.eastContent;
  const westContent: JSX.Element = props.westContent;
  
  let layout_south_size: number = (typeof props?.southSize === 'number') ? props.southSize : 250;
  let layout_east_size: number = (typeof props?.eastSize === 'number') ? props.eastSize : 250;
  let layout_west_size: number = (typeof props?.westSize === 'number') ? props.westSize : 250;
  let layout_north_size: number = (typeof props?.northSize === 'number') ? props.northSize : 250;
  let layout_north_enabled: boolean = northContent ? true : false;
  let layout_south_enabled: boolean = southContent ? true : false;
  let layout_east_enabled: boolean = eastContent ? true : false;
  let layout_west_enabled: boolean = westContent ? true : false;
  let layout_bar_open_size: number = 8;
  let layout_bar_closed_size: number = 14;
  let layout_north_open: boolean = true;
  let layout_south_open: boolean = true;
  let layout_east_open: boolean = true;
  let layout_west_open: boolean = true;

  let centerStyle: any = {};//{ position: string; top: number; bottom: number; left: number; right: number; };
  let eastStyle: any = {};//{ position: string; top: number; bottom: number; right: number; left: number; };
  let westStyle: any = {};//{ position: string; top: number; bottom: number; right: number; left: number; };
  let northStyle: any = {};//{ position: string; top: number; bottom: number; right: number; left: number; };
  let southStyle: any = {};//{ position: string; top: number; bottom: number; right: number; left: number; };
  let northHandleStyle: any = {};//{ position: string; top: number; left: number; right: number; height: number; display: string; justifyContent: string; alignContent: string; cursor: string; };
  let northHandleToggleStyle: any = {};//{ width: number; height: string; };
  let southHandleStyle: any = {};//{ position: string; top: number; left: number; right: number; height: number; display: string; justifyContent: string; alignContent: string; cursor: string; };
  let southHandleToggleStyle: any = {};//{ width: number; height: string; };
  let eastHandleStyle: any = {};//{ position: string; bottom: number; top: number; left: number; width: number; display: string; justifyContent: string; alignContent: string; alignItems: string; cursor: string; };
  let eastHandleToggleStyle: any = {};//{ height: number; width: string; };
  let westHandleStyle: any = {};//{ position: string; bottom: number; top: number; left: number; width: number; display: string; justifyContent: string; alignContent: string; alignItems: string; cursor: string; };
  let westHandleToggleStyle: any = {};//{ height: number; width: string; };

  const handleStart = (e: any, handle: string) => {
    // console.log('start', handle, e);
  }

  const handleStop = (e: any, handle: string) => {
    let offsetLeft = 0;
    let offsetTop = 0;

    if(containerRef.current){
      offsetLeft = containerRef.current.offsetLeft;
      offsetTop = containerRef.current.offsetTop;

      const rect: DOMRect = containerRef.current.getBoundingClientRect();
      offsetLeft = rect.left;
      offsetTop = rect.top;

    }

    let x = e.clientX - offsetLeft;
    let y = e.clientY - offsetTop;
    if(y < 0) y = 0;

    let barSizeHalf = layout_bar_open_size/2;

    switch(handle){
      case 'north':
        if(!(layout_north_enabled && layout_north_open)) return;
        layout_north_size = y - barSizeHalf;
        if(layout_north_size < barSizeHalf) layout_north_size = barSizeHalf
      break;
      case 'south':
        if(!(layout_south_enabled && layout_south_open)) return;
        layout_south_size = (containerRef.current?.clientHeight || 0) - (y - barSizeHalf);
        if(layout_south_size < barSizeHalf) layout_south_size = barSizeHalf
      break;
      case 'east':
        if(!(layout_east_enabled && layout_east_open)) return;
        layout_east_size = (containerRef.current?.clientWidth || 0) - (x - barSizeHalf);
        if(layout_east_size < barSizeHalf) layout_east_size = barSizeHalf
      break;
      case 'west':
        if(!(layout_west_enabled && layout_west_open)) return;
        layout_west_size = x - barSizeHalf;
        if(layout_west_size < barSizeHalf) layout_west_size = barSizeHalf
      break;
    }
    calculateLayout();
  }

  const onPaneToggle = (e: any, handle: string) => {
    e.preventDefault();
    switch(handle){
      case 'north':
        layout_north_open = !layout_north_open;
      break;
      case 'south':
        layout_south_open = !layout_south_open;
      break;
      case 'east':
        layout_east_open = !layout_east_open;
      break;
      case 'west':
        layout_west_open = !layout_west_open;
      break;
    }
    calculateLayout();
  }

  const onWindowResize =  function() {
    calculateLayout();
  }

  useEffect(() => {
    // console.log('containerRef', containerRef);
    calculateLayout();
  }, [containerRef.current]);

  const [render, rerender] = useState<boolean>(false);
  useEffect( () => {
    rerender(!render);
    window.addEventListener('resize', onWindowResize);
    return () => {
      window.removeEventListener('resize', onWindowResize);
    }
  }, []);

  const calculateLayout = (width: number = 0, height: number = 0) => {
    // if(!enableLayoutContainers) return;
    let tabWidth = width;
    let tabHeight = height;

    if(containerRef.current){
      tabWidth = containerRef.current.offsetWidth;
      tabHeight = containerRef.current.offsetHeight;
    }else{
      return;
    }

    let north_gutter_size = 
      layout_north_enabled ? (layout_north_open ? layout_bar_open_size : layout_bar_closed_size) : 0;
      
    let south_gutter_size = 
      layout_south_enabled ? (layout_south_open ? layout_bar_open_size : layout_bar_closed_size) : 0;

    let east_gutter_size = 
      layout_east_enabled ? (layout_east_open ? layout_bar_open_size : layout_bar_closed_size) : 0;

    let west_gutter_size = 
      layout_west_enabled ? (layout_west_open ? layout_bar_open_size : layout_bar_closed_size) : 0;

    let west_bounds = {
      top: 0,
      left: 0,
      width: (layout_west_enabled && layout_west_open) ? layout_west_size - (west_gutter_size/2) : 0,
      height: (layout_west_enabled && layout_west_open) ? tabHeight : 0,
    };

    let east_bounds = {
      top: 0,
      right: 0,
      width: (layout_east_enabled && layout_east_open) ? layout_east_size - (east_gutter_size/2) : 0,
      height: (layout_east_enabled && layout_east_open) ? tabHeight : 0,
    };

    let north_bounds = {
      top: 0,
      right: (layout_north_enabled && layout_north_open) ? east_bounds.width + east_gutter_size : 0,
      left: (layout_north_enabled && layout_north_open) ? west_bounds.width + west_gutter_size : 0,
      width: (layout_north_enabled && layout_north_open) ? (tabWidth - west_bounds.width) - east_bounds.width : 0,
      height: (layout_north_enabled && layout_north_open) ? layout_north_size - (north_gutter_size/2) : 0,
    };

    let south_bounds = {
      bottom: 0,
      right: (layout_south_enabled && layout_south_open) ? east_bounds.width + east_gutter_size : 0,
      left: (layout_south_enabled && layout_south_open) ? west_bounds.width + west_gutter_size : 0,
      width: (layout_south_enabled && layout_south_open) ? (tabWidth - west_bounds.width) - east_bounds.width : 0,
      height: (layout_south_enabled && layout_south_open) ? layout_south_size  - (south_gutter_size/2) : 0,
    };

    let center_bounds = {
      top: north_bounds.height + north_gutter_size,
      bottom: south_bounds.height + south_gutter_size,
      left: west_bounds.width + west_gutter_size,
      right: east_bounds.width + east_gutter_size,

      width: ((tabWidth - east_bounds.width) - west_bounds.width) - west_gutter_size - east_gutter_size,
      height: ((tabHeight - north_bounds.height) - north_bounds.height) - north_gutter_size - south_gutter_size,
    };

    centerStyle ={
      position: 'absolute',
      top: center_bounds.top,
      bottom: center_bounds.bottom,
      left: center_bounds.left,
      right: center_bounds.right,
    };

    eastStyle = {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 0,
      left: (layout_east_enabled && layout_east_open) ? tabWidth - east_bounds.width : tabWidth,
      display: (layout_east_enabled && layout_east_open) ? 'block' : 'none',
    };

    westStyle = {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: (layout_west_enabled && layout_west_open) ?  tabWidth - west_bounds.width: tabWidth,
      left: 0,
      display: (layout_west_enabled && layout_west_open) ? 'block' : 'none',
    };

    northStyle = {
      position: 'absolute',
      top: 0,
      bottom: (layout_north_enabled && layout_north_open) ? tabHeight - north_bounds.height : tabHeight,
      right: (layout_north_enabled && layout_north_open) ? east_bounds.width : 0,
      left: (layout_north_enabled && layout_north_open) ? west_bounds.width : 0,
      display: (layout_north_enabled && layout_north_open) ? 'block' : 'none',
    };

    southStyle = {
      position: 'absolute',
      top: (layout_south_enabled && layout_south_open) ? tabHeight - south_bounds.height : tabHeight,
      bottom: 0,
      right: (layout_south_enabled && layout_south_open) ? east_bounds.width: 0,
      left: (layout_south_enabled && layout_south_open) ? west_bounds.width: 0,
      display: (layout_south_enabled && layout_south_open) ? 'block' : 'none',
    };

    if(northRef.current){
      northRef.current.style.position = 'absolute'
      northRef.current.style.top = northStyle.top+'px';
      northRef.current.style.bottom = northStyle.bottom+'px';
      northRef.current.style.left = northStyle.left+'px';
      northRef.current.style.right = northStyle.right+'px';
    }

    if(southRef.current){
      southRef.current.style.position = 'absolute'
      southRef.current.style.top = southStyle.top+'px';
      southRef.current.style.bottom = southStyle.bottom+'px';
      southRef.current.style.left = southStyle.left+'px';
      southRef.current.style.right = southStyle.right+'px';
    }

    if(centerRef.current){
      centerRef.current.style.position = 'absolute'
      centerRef.current.style.top = centerStyle.top+'px';
      centerRef.current.style.bottom = centerStyle.bottom+'px';
      centerRef.current.style.left = centerStyle.left+'px';
      centerRef.current.style.right = centerStyle.right+'px';
    }

    if(eastRef.current){
      eastRef.current.style.position = 'absolute'
      eastRef.current.style.top = eastStyle.top+'px';
      eastRef.current.style.bottom = eastStyle.bottom+'px';
      eastRef.current.style.left = eastStyle.left+'px';
      eastRef.current.style.right = eastStyle.right+'px';
    }

    if(westRef.current){
      westRef.current.style.position = 'absolute'
      westRef.current.style.top = westStyle.top+'px';
      westRef.current.style.bottom = westStyle.bottom+'px';
      westRef.current.style.left = westStyle.left+'px';
      westRef.current.style.right = westStyle.right+'px';
    }

    if(!north_gutter_size){
      if(northHandleRef.current){
        northHandleRef.current.style.display = 'none';
      }
    }else{
      if(northHandleRef.current){
        northHandleRef.current.style.display = '';
      }
      northHandleStyle = {
        position: 'absolute',
        top: layout_north_open ? north_bounds.height : 0,
        left: north_bounds.left,
        right: north_bounds.right,
        height: north_gutter_size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'n-resize'
      };

      if(northHandleRef.current){
        northHandleRef.current.style.position = northHandleStyle.position
        northHandleRef.current.style.top = northHandleStyle.top+'px';
        northHandleRef.current.style.left = northHandleStyle.left+'px';
        northHandleRef.current.style.right = northHandleStyle.right+'px';
        northHandleRef.current.style.height = northHandleStyle.height+'px';
        northHandleRef.current.style.display = northHandleStyle.display;
        northHandleRef.current.style.justifyContent = northHandleStyle.justifyContent;
        northHandleRef.current.style.alignItems = northHandleStyle.alignItems;
        northHandleRef.current.style.cursor = northHandleStyle.cursor;
      }

      if(northHandleToggleRef.current){
        northHandleToggleRef.current.style.height = '100%';
        northHandleToggleRef.current.style.width = '50px';
      }
    }

    if(!south_gutter_size){
      if(southHandleRef.current){
        southHandleRef.current.style.display = 'none';
      }
    }else{
      if(southHandleRef.current){
        southHandleRef.current.style.display = '';
      }
      southHandleStyle = {
        position: 'absolute',
        top: layout_south_open ? (tabHeight - south_bounds.height - south_gutter_size) : 0,
        left: south_bounds.left,
        right: south_bounds.right,
        height: south_gutter_size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 's-resize'
      };

      if(southHandleRef.current){
        southHandleRef.current.style.position = southHandleStyle.position
        southHandleRef.current.style.top = southHandleStyle.top+'px';
        southHandleRef.current.style.left = southHandleStyle.left+'px';
        southHandleRef.current.style.right = southHandleStyle.right+'px';
        southHandleRef.current.style.height = southHandleStyle.height+'px';
        southHandleRef.current.style.display = southHandleStyle.display;
        southHandleRef.current.style.justifyContent = southHandleStyle.justifyContent;
        southHandleRef.current.style.alignItems = southHandleStyle.alignItems;
        southHandleRef.current.style.cursor = southHandleStyle.cursor;
      }

      if(southHandleToggleRef.current){
        southHandleToggleRef.current.style.height = '100%';
        southHandleToggleRef.current.style.width = '50px';
      }
    }

    if(!east_gutter_size){
      if(eastHandleRef.current){
        eastHandleRef.current.style.display = 'none';
      }
    }else{
      if(eastHandleRef.current){
        eastHandleRef.current.style.display = '';
      }
      eastHandleStyle = {
        position: 'absolute',
        bottom: 0,
        top: 0,
        left: layout_east_open ? (tabWidth - east_bounds.width - east_gutter_size) : 0,
        width: east_gutter_size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'e-resize'
      };

      if(eastHandleRef.current){
        eastHandleRef.current.style.position = eastHandleStyle.position
        eastHandleRef.current.style.bottom = eastHandleStyle.bottom+'px';
        eastHandleRef.current.style.top = eastHandleStyle.top+'px';
        eastHandleRef.current.style.left = eastHandleStyle.left+'px';
        eastHandleRef.current.style.width = eastHandleStyle.width+'px';
        eastHandleRef.current.style.display = eastHandleStyle.display;
        eastHandleRef.current.style.justifyContent = eastHandleStyle.justifyContent;
        eastHandleRef.current.style.alignItems = eastHandleStyle.alignItems;
        eastHandleRef.current.style.cursor = eastHandleStyle.cursor;
      }

      if(eastHandleToggleRef.current){
        eastHandleToggleRef.current.style.height = '50px';
        eastHandleToggleRef.current.style.width = '100%';
      }
    }

    if(!west_gutter_size){
      if(westHandleRef.current){
        westHandleRef.current.style.display = 'none';
      }
    }else{
      if(westHandleRef.current){
        westHandleRef.current.style.display = '';
      }
      westHandleStyle = {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: west_bounds.width,
        width: west_gutter_size,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'w-resize'
      };

      if(westHandleRef.current){
        westHandleRef.current.style.position = westHandleStyle.position
        westHandleRef.current.style.top = westHandleStyle.top+'px';
        westHandleRef.current.style.bottom = westHandleStyle.bottom+'px';
        westHandleRef.current.style.left = westHandleStyle.left+'px';
        westHandleRef.current.style.width = westHandleStyle.width+'px';
        westHandleRef.current.style.display = westHandleStyle.display;
        westHandleRef.current.style.justifyContent = westHandleStyle.justifyContent;
        westHandleRef.current.style.alignItems = westHandleStyle.alignItems;
        westHandleRef.current.style.cursor = westHandleStyle.cursor;
      }

      if(westHandleToggleRef.current){
        westHandleToggleRef.current.style.height = '50px';
        westHandleToggleRef.current.style.width = '100%';
      }
    }
  }

  calculateLayout();
  return (
    <div ref={containerRef} className="layout-container">
      <div ref={northRef} className="ui-layout-north" style={northStyle}>
        {northContent}
      </div>
      <div ref={westRef} className="ui-layout-west" style={westStyle}>
        {westContent}
      </div>
      <div ref={centerRef} className="ui-layout-center" style={centerStyle}>
        {props.children}
      </div>
      <div ref={eastRef} className="ui-layout-east" style={eastStyle}>
        {eastContent}
      </div>
      <div ref={southRef} className="ui-layout-south" style={southStyle}>
        {southContent}
      </div>
      <Draggable bounds="parent" axis="y" onStart={(e) => handleStart(e, 'north') } onStop={(e) => handleStop(e, 'north') }>
        <div ref={northHandleRef} className="ui-layout-resizer ui-layout-resizer-north ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-north-open" title="Resize"><div ref={northHandleToggleRef} onClick={(e) => onPaneToggle(e, 'north') } className="ui-layout-toggler ui-layout-toggler-north ui-layout-toggler-open ui-layout-toggler-north-open" title="Close"></div></div>
      </Draggable>
      <Draggable bounds="parent" axis="y" onStart={(e) => handleStart(e, 'south') } onStop={(e) => handleStop(e, 'south') }>
        <div ref={southHandleRef} className="ui-layout-resizer ui-layout-resizer-south ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-south-open" title="Resize"><div ref={southHandleToggleRef} onClick={(e) => onPaneToggle(e, 'south') } className="ui-layout-toggler ui-layout-toggler-south ui-layout-toggler-open ui-layout-toggler-south-open" title="Close"></div></div>
      </Draggable>
      <Draggable bounds="parent" axis="x" onStart={(e) => handleStart(e, 'east') } onStop={(e) => handleStop(e, 'east') }>
        <div ref={eastHandleRef} className="ui-layout-resizer ui-layout-resizer-east ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-east-open" title="Resize"><div ref={eastHandleToggleRef} onClick={(e) => onPaneToggle(e, 'east') } className="ui-layout-toggler ui-layout-toggler-east ui-layout-toggler-open ui-layout-toggler-east-open" title="Close"></div></div>
      </Draggable>
      <Draggable bounds="parent" axis="x" onStart={(e) => handleStart(e, 'west') } onStop={(e) => handleStop(e, 'west') }>
        <div ref={westHandleRef} className="ui-layout-resizer ui-layout-resizer-west ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-west-open" title="Resize"><div ref={westHandleToggleRef} onClick={(e) => onPaneToggle(e, 'west') } className="ui-layout-toggler ui-layout-toggler-west ui-layout-toggler-open ui-layout-toggler-west-open" title="Close"></div></div>
      </Draggable>
    </div>
  );

}
