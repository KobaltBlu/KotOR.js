import React, { useEffect, useRef, useState } from "react";
import Draggable from 'react-draggable';
import { useEffectOnce } from "../../forge/helpers/UseEffectOnce";

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

  barOpenSize?: number;
  barClosedSize?: number;
}

export const LayoutContainer = function(props: LayoutContainerProps) {
  const containerRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const centerRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const northRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const northHandleRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const northHandleToggleRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const southRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const southHandleRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const southHandleToggleRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const eastRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const eastHandleRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const eastHandleToggleRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const westRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const westHandleRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;
  const westHandleToggleRef = useRef<HTMLDivElement>() as React.MutableRefObject<HTMLDivElement>;

  const layoutNorthSize = useRef<number>() as React.MutableRefObject<number>;
  const layoutSouthSize = useRef<number>() as React.MutableRefObject<number>;
  const layoutEastSize = useRef<number>() as React.MutableRefObject<number>;
  const layoutWestSize = useRef<number>() as React.MutableRefObject<number>;

  const layoutNorthOpen = useRef<boolean>() as React.MutableRefObject<boolean>;
  const layoutSouthOpen = useRef<boolean>() as React.MutableRefObject<boolean>;
  const layoutEastOpen = useRef<boolean>() as React.MutableRefObject<boolean>;
  const layoutWestOpen = useRef<boolean>() as React.MutableRefObject<boolean>;

  const layoutBarOpenSize = useRef<number>() as React.MutableRefObject<number>;
  const layoutBarClosedSize = useRef<number>() as React.MutableRefObject<number>;

  const northContent: JSX.Element = props.northContent as JSX.Element;
  const southContent: JSX.Element = props.southContent as JSX.Element;
  const eastContent: JSX.Element = props.eastContent as JSX.Element;
  const westContent: JSX.Element = props.westContent as JSX.Element;

  let layout_north_enabled: boolean = northContent ? true : false;
  let layout_south_enabled: boolean = southContent ? true : false;
  let layout_east_enabled: boolean = eastContent ? true : false;
  let layout_west_enabled: boolean = westContent ? true : false;

  let centerStyle: any = {width: `100%`, height: `100%`};//{ position: string; top: number; bottom: number; left: number; right: number; };
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

    let barSizeHalf = layoutBarOpenSize.current/2;

    switch(handle){
      case 'north':
        if(!(layout_north_enabled && layoutNorthOpen.current)) return;
        layoutNorthSize.current = y - barSizeHalf;
        if(layoutNorthSize.current < barSizeHalf) layoutNorthSize.current = barSizeHalf
      break;
      case 'south':
        if(!(layout_south_enabled && layoutSouthOpen.current)) return;
        layoutSouthSize.current = (containerRef.current?.clientHeight || 0) - (y - barSizeHalf);
        if(layoutSouthSize.current < barSizeHalf) layoutSouthSize.current = barSizeHalf
      break;
      case 'east':
        if(!(layout_east_enabled && layoutEastOpen.current)) return;
        layoutEastSize.current = (containerRef.current?.clientWidth || 0) - (x - barSizeHalf);
        if(layoutEastSize.current < barSizeHalf) layoutEastSize.current = barSizeHalf
      break;
      case 'west':
        if(!(layout_west_enabled && layoutWestOpen.current)) return;
        layoutWestSize.current = x - barSizeHalf;
        if(layoutWestSize.current < barSizeHalf) layoutWestSize.current = barSizeHalf
      break;
    }
    calculateLayout();
  }

  const onPaneToggle = (e: any, handle: string) => {
    e.preventDefault();
    switch(handle){
      case 'north':
        layoutNorthOpen.current = !layoutNorthOpen.current;
      break;
      case 'south':
        layoutSouthOpen.current = !layoutSouthOpen.current;
      break;
      case 'east':
        layoutEastOpen.current = !layoutEastOpen.current;
      break;
      case 'west':
        layoutWestOpen.current = !layoutWestOpen.current;
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
  useEffectOnce( () => {
    if(typeof layoutNorthSize.current === 'undefined'){
      layoutNorthSize.current = (typeof props?.northSize === 'number') ? props.northSize : 250;
    }
    if(typeof layoutSouthSize.current === 'undefined'){
      layoutSouthSize.current = (typeof props?.southSize === 'number') ? props.southSize : 250;
    }
    if(typeof layoutEastSize.current === 'undefined'){
      layoutEastSize.current = (typeof props?.eastSize === 'number') ? props.eastSize : 250;
    }
    if(typeof layoutWestSize.current === 'undefined'){
      layoutWestSize.current = (typeof props?.westSize === 'number') ? props.westSize : 250;
    }
    if(typeof layoutNorthOpen.current === 'undefined'){
      layoutNorthOpen.current = true;
    }
    if(typeof layoutSouthOpen.current === 'undefined'){
      layoutSouthOpen.current = true;
    }
    if(typeof layoutEastOpen.current === 'undefined'){
      layoutEastOpen.current = true;
    }
    if(typeof layoutWestOpen.current === 'undefined'){
      layoutWestOpen.current = true;
    }
    if(typeof layoutBarOpenSize.current === 'undefined'){
      layoutBarOpenSize.current = (typeof props?.barOpenSize === 'number') ? props.barOpenSize : 8;
    }
    if(typeof layoutBarClosedSize.current === 'undefined'){
      layoutBarClosedSize.current = (typeof props?.barClosedSize === 'number') ? props.barClosedSize : 14;
    }
    
    rerender(!render);
    window.addEventListener('resize', onWindowResize);
    return () => {
      window.removeEventListener('resize', onWindowResize);
    }
  });

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
      layout_north_enabled ? (layoutNorthOpen.current ? layoutBarOpenSize.current : layoutBarClosedSize.current) : 0;
      
    let south_gutter_size = 
      layout_south_enabled ? (layoutSouthOpen.current ? layoutBarOpenSize.current : layoutBarClosedSize.current) : 0;

    let east_gutter_size = 
      layout_east_enabled ? (layoutEastOpen.current ? layoutBarOpenSize.current : layoutBarClosedSize.current) : 0;

    let west_gutter_size = 
      layout_west_enabled ? (layoutWestOpen.current ? layoutBarOpenSize.current : layoutBarClosedSize.current) : 0;

    let west_bounds = {
      top: 0,
      left: 0,
      width: (layout_west_enabled && layoutWestOpen.current) ? layoutWestSize.current - (west_gutter_size/2) : 0,
      height: (layout_west_enabled && layoutWestOpen.current) ? tabHeight : 0,
    };

    let east_bounds = {
      top: 0,
      right: 0,
      width: (layout_east_enabled && layoutEastOpen.current) ? layoutEastSize.current - (east_gutter_size/2) : 0,
      height: (layout_east_enabled && layoutEastOpen.current) ? tabHeight : 0,
    };

    let north_bounds = {
      top: 0,
      right: (layout_north_enabled && layoutNorthOpen.current) ? east_bounds.width + east_gutter_size : 0,
      left: (layout_north_enabled && layoutNorthOpen.current) ? west_bounds.width + west_gutter_size : 0,
      width: (tabWidth - west_bounds.width) - east_bounds.width,
      height: (layout_north_enabled && layoutNorthOpen.current) ? layoutNorthSize.current - (north_gutter_size/2) : 0,
    };

    let south_bounds = {
      bottom: 0,
      right: (layout_east_enabled && layoutEastOpen.current) ? east_bounds.width + east_gutter_size : 0,
      left: (layout_west_enabled && layoutWestOpen.current) ? west_bounds.width + west_gutter_size : 0,
      width: (tabWidth - west_bounds.width) - east_bounds.width,
      height: (layout_south_enabled && layoutSouthOpen.current) ? layoutSouthSize.current  - (south_gutter_size/2) : 0,
    };

    let center_bounds = {
      top: north_bounds.height + north_gutter_size,
      bottom: south_bounds.height + south_gutter_size,
      left: west_bounds.width + west_gutter_size,
      right: east_bounds.width + east_gutter_size,

      width: ((tabWidth - east_bounds.width) - west_bounds.width) - west_gutter_size - east_gutter_size,
      height: ((tabHeight - north_bounds.height) - south_bounds.height) - north_gutter_size - south_gutter_size,
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
      left: (layout_east_enabled && layoutEastOpen.current) ? tabWidth - east_bounds.width : tabWidth,
      display: (layout_east_enabled && layoutEastOpen.current) ? 'block' : 'none',
    };

    westStyle = {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: (layout_west_enabled && layoutWestOpen.current) ?  tabWidth - west_bounds.width: tabWidth,
      left: 0,
      display: (layout_west_enabled && layoutWestOpen.current) ? 'block' : 'none',
    };

    northStyle = {
      position: 'absolute',
      top: 0,
      bottom: (layout_north_enabled && layoutNorthOpen.current) ? tabHeight - north_bounds.height : tabHeight,
      right: (layout_north_enabled && layoutNorthOpen.current) ? east_bounds.width : 0,
      left: (layout_north_enabled && layoutNorthOpen.current) ? west_bounds.width : 0,
      display: (layout_north_enabled && layoutNorthOpen.current) ? 'block' : 'none',
    };

    southStyle = {
      position: 'absolute',
      top: (layout_south_enabled && layoutSouthOpen.current) ? tabHeight - south_bounds.height : tabHeight,
      bottom: 0,
      right: (layout_south_enabled && layoutSouthOpen.current) ? east_bounds.width: 0,
      left: (layout_south_enabled && layoutSouthOpen.current) ? west_bounds.width: 0,
      display: (layout_south_enabled && layoutSouthOpen.current) ? 'block' : 'none',
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

      centerRef.current.style.width = center_bounds.width + 'px';
      centerRef.current.style.height = center_bounds.height +'px';
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
        top: layoutNorthOpen.current ? north_bounds.height : 0,
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
        top: layoutSouthOpen.current ? (tabHeight - south_bounds.height - south_gutter_size) : tabHeight - south_gutter_size,
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
        left: layoutEastOpen.current ? (tabWidth - east_bounds.width - east_gutter_size) : 0,
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
        if(!layoutEastOpen.current){
          eastHandleRef.current.style.right = '0px';
          eastHandleRef.current.style.left = 'initial';
        }else{
          eastHandleRef.current.style.left = eastHandleStyle.left+'px';
        }
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
      <Draggable bounds="parent" axis="y" onStart={(e) => handleStart(e, 'north') } onStop={(e) => handleStop(e, 'north') } defaultPosition={{x: 0, y: northHandleStyle.top}}>
        <div ref={northHandleRef} className="ui-layout-resizer ui-layout-resizer-north ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-north-open" title="Resize">
          <div ref={northHandleToggleRef} onClick={(e) => onPaneToggle(e, 'north') } className="ui-layout-toggler ui-layout-toggler-north ui-layout-toggler-open ui-layout-toggler-north-open" title="Close"></div>
        </div>
      </Draggable>
      <Draggable bounds="parent" axis="y" onStart={(e) => handleStart(e, 'south') } onStop={(e) => handleStop(e, 'south') } defaultPosition={{x: 0, y: southHandleStyle.top}}>
        <div ref={southHandleRef} className="ui-layout-resizer ui-layout-resizer-south ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-south-open" title="Resize">
          <div ref={southHandleToggleRef} onClick={(e) => onPaneToggle(e, 'south') } className="ui-layout-toggler ui-layout-toggler-south ui-layout-toggler-open ui-layout-toggler-south-open" title="Close"></div>
        </div>
      </Draggable>
      <Draggable bounds="parent" axis="x" onStart={(e) => handleStart(e, 'east') } onStop={(e) => handleStop(e, 'east') } defaultPosition={{x: eastHandleStyle.left, y: 0}}>
        <div ref={eastHandleRef} className="ui-layout-resizer ui-layout-resizer-east ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-east-open" title="Resize">
          <div ref={eastHandleToggleRef} onClick={(e) => onPaneToggle(e, 'east') } className="ui-layout-toggler ui-layout-toggler-east ui-layout-toggler-open ui-layout-toggler-east-open" title="Close"></div>
        </div>
      </Draggable>
      <Draggable bounds="parent" axis="x" onStart={(e) => handleStart(e, 'west') } onStop={(e) => handleStop(e, 'west') } defaultPosition={{x: westHandleStyle.left, y: 0}}>
        <div ref={westHandleRef} className="ui-layout-resizer ui-layout-resizer-west ui-draggable-handle ui-layout-resizer-open ui-layout-resizer-west-open" title="Resize">
          <div ref={westHandleToggleRef} onClick={(e) => onPaneToggle(e, 'west') } className="ui-layout-toggler ui-layout-toggler-west ui-layout-toggler-open ui-layout-toggler-west-open" title="Close"></div>
        </div>
      </Draggable>
    </div>
  );

}
