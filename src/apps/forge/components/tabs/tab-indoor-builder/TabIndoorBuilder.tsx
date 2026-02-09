import React, { useEffect, useMemo, useRef, useState } from "react";
import { BaseTabProps } from "../../../interfaces/BaseTabProps";
import { LayoutContainer } from "../../LayoutContainer/LayoutContainer";
import { LayoutContainerProvider } from "../../../context/LayoutContainerContext";
import { TabIndoorBuilderState, IndoorBuilderViewMode } from "../../../states/tabs/TabIndoorBuilderState";
import { IndoorMapCanvasRenderer } from "../../../helpers/IndoorMapCanvasRenderer";
import { IndoorMapRoom } from "../../../data/IndoorMap";
import { Kit, KitComponent } from "../../../data/IndoorKit";
import { ensureComponentPreview } from "../../../data/IndoorKitPreview";
import { ForgeFileSystem } from "../../../ForgeFileSystem";
import { UI3DRendererView } from "../../UI3DRendererView";
import "./TabIndoorBuilder.scss";
import * as THREE from "three";

export const TabIndoorBuilder = function TabIndoorBuilder(props: BaseTabProps) {
  const tab = props.tab as TabIndoorBuilderState;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<IndoorMapCanvasRenderer | null>(null);
  const [kits, setKits] = useState<Kit[]>(tab.kits);
  const [selectedRooms, setSelectedRooms] = useState<IndoorMapRoom[]>([]);
  const [selectedKit, setSelectedKit] = useState<Kit | null>(tab.selectedKit);
  const [selectedComponent, setSelectedComponent] = useState<KitComponent | null>(tab.selectedComponent);
  const [viewMode, setViewMode] = useState<IndoorBuilderViewMode>(tab.viewMode);

  useEffect(() => {
    const onKitsLoaded = (loaded: Kit[]) => {
      setKits([...loaded]);
      setSelectedKit(tab.selectedKit);
    };
    const onSelectionChanged = (rooms: IndoorMapRoom[]) => {
      setSelectedRooms([...rooms]);
    };
    const onComponentSelected = (component: KitComponent | null) => {
      setSelectedComponent(component);
    };
    const onViewModeChanged = (mode: IndoorBuilderViewMode) => {
      setViewMode(mode);
    };
    const onMapLoaded = () => {
      rendererRef.current?.setMap(tab.map);
      rendererRef.current?.requestRender();
    };
    const onMapChanged = () => {
      rendererRef.current?.requestRender();
      tab.sync3D();
    };

    tab.addEventListener("onKitsLoaded", onKitsLoaded);
    tab.addEventListener("onSelectionChanged", onSelectionChanged);
    tab.addEventListener("onComponentSelected", onComponentSelected);
    tab.addEventListener("onViewModeChanged", onViewModeChanged);
    tab.addEventListener("onMapLoaded", onMapLoaded);
    tab.addEventListener("onMapChanged", onMapChanged);
    return () => {
      tab.removeEventListener("onKitsLoaded", onKitsLoaded);
      tab.removeEventListener("onSelectionChanged", onSelectionChanged);
      tab.removeEventListener("onComponentSelected", onComponentSelected);
      tab.removeEventListener("onViewModeChanged", onViewModeChanged);
      tab.removeEventListener("onMapLoaded", onMapLoaded);
      tab.removeEventListener("onMapChanged", onMapChanged);
    };
  }, [tab]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new IndoorMapCanvasRenderer();
    rendererRef.current = renderer;
    renderer.attach(canvasRef.current);
    renderer.setMap(tab.map);
    renderer.setCallbacks({
      onSelectionChanged: (rooms) => tab.setSelectedRooms(rooms),
      onRoomsMoved: () => {
        tab.map.rebuildRoomConnections();
        tab.updateFile();
        tab.sync3D();
      },
    });

    const canvas = canvasRef.current;
    const onMouseDown = (event: MouseEvent) => renderer.onMouseDown(event);
    const onMouseMove = (event: MouseEvent) => renderer.onMouseMove(event);
    const onMouseUp = (event: MouseEvent) => renderer.onMouseUp(event);
    const onWheel = (event: WheelEvent) => renderer.onWheel(event);

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("wheel", onWheel);
      renderer.detach();
      rendererRef.current = null;
    };
  }, [tab]);

  useEffect(() => {
    if (!containerRef.current || !rendererRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      rendererRef.current?.resize(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const onLoadKits = async () => {
    const response = await ForgeFileSystem.OpenDirectory();
    if (response.paths && response.paths.length) {
      await tab.loadKitsFromPath(response.paths[0]);
    }
  };

  const onAddRoomAtCursor = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !selectedComponent) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const screen = new THREE.Vector2(event.clientX - rect.left, event.clientY - rect.top);
    const world = rendererRef.current.getWorldPointFromScreen(screen);
    tab.addRoomAt(new THREE.Vector3(world.x, world.y, 0));
  };

  const kitComponents = useMemo(() => {
    if (!selectedKit) return [];
    return selectedKit.components;
  }, [selectedKit]);

  const westPanel = (
    <div className="indoor-panel">
      <div className="indoor-panel-section">
        <div className="indoor-panel-header">
          <span>Kits</span>
          <button className="indoor-button" onClick={onLoadKits}>Load Kits</button>
        </div>
        <select
          className="indoor-select"
          aria-label="Indoor kits"
          value={selectedKit?.id || ""}
          onChange={(event) => {
            const kit = kits.find((entry) => entry.id === event.target.value) || null;
            setSelectedKit(kit);
            tab.selectedKit = kit;
          }}
        >
          {kits.map((kit) => (
            <option key={kit.id} value={kit.id}>{kit.name}</option>
          ))}
        </select>
      </div>
      <div className="indoor-panel-section">
        <div className="indoor-panel-header">Components</div>
        <div className="indoor-component-grid">
          {kitComponents.map((component) => {
            const preview = ensureComponentPreview(component);
            return (
              <button
                key={component.id}
                className={`indoor-component-button ${selectedComponent?.id === component.id ? "active" : ""}`}
                onClick={() => tab.setSelectedComponent(component)}
                title={component.name}
              >
                <img src={preview.toDataURL()} alt={component.name} />
                <span>{component.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const eastPanel = (
    <div className="indoor-panel">
      <div className="indoor-panel-section">
        <div className="indoor-panel-header">Map</div>
        <div className="indoor-field">
          <label>Module ID</label>
          <input
            className="indoor-input"
            aria-label="Module ID"
            value={tab.map.moduleId}
            onChange={(event) => {
              tab.map.moduleId = event.target.value;
              tab.updateFile();
            }}
          />
        </div>
        <div className="indoor-field">
          <label>Skybox</label>
          <input
            className="indoor-input"
            aria-label="Skybox"
            value={tab.map.skybox}
            onChange={(event) => {
              tab.map.skybox = event.target.value;
              tab.updateFile();
            }}
          />
        </div>
      </div>
      <div className="indoor-panel-section">
        <div className="indoor-panel-header">Selection</div>
        <div className="indoor-field">
          <label>Selected Rooms</label>
          <div>{selectedRooms.length}</div>
        </div>
        <div className="indoor-button-row">
          <button className="indoor-button" onClick={() => tab.duplicateSelectedRooms()} disabled={!selectedRooms.length}>Duplicate</button>
          <button className="indoor-button" onClick={() => tab.deleteSelectedRooms()} disabled={!selectedRooms.length}>Delete</button>
        </div>
        <div className="indoor-button-row">
          <button className="indoor-button" onClick={() => tab.rotateSelectedRooms(15)} disabled={!selectedRooms.length}>Rotate +15</button>
          <button className="indoor-button" onClick={() => tab.rotateSelectedRooms(-15)} disabled={!selectedRooms.length}>Rotate -15</button>
        </div>
        <div className="indoor-button-row">
          <button className="indoor-button" onClick={() => tab.flipSelectedRooms(true, false)} disabled={!selectedRooms.length}>Flip X</button>
          <button className="indoor-button" onClick={() => tab.flipSelectedRooms(false, true)} disabled={!selectedRooms.length}>Flip Y</button>
        </div>
      </div>
    </div>
  );

  const centerToolbar = (
    <div className="indoor-toolbar">
      <button
        className={`indoor-button ${viewMode === IndoorBuilderViewMode.TwoD ? "active" : ""}`}
        onClick={() => tab.setViewMode(IndoorBuilderViewMode.TwoD)}
      >
        2D View
      </button>
      <button
        className={`indoor-button ${viewMode === IndoorBuilderViewMode.ThreeD ? "active" : ""}`}
        onClick={() => tab.setViewMode(IndoorBuilderViewMode.ThreeD)}
      >
        3D View
      </button>
    </div>
  );

  return (
    <LayoutContainerProvider>
      <LayoutContainer westContent={westPanel} eastContent={eastPanel} northContent={centerToolbar} westSize={320} eastSize={320} northSize={48}>
        <div className="indoor-canvas-container" ref={containerRef}>
          {viewMode === IndoorBuilderViewMode.TwoD ? (
            <canvas
              ref={canvasRef}
              className="indoor-canvas"
              onDoubleClick={onAddRoomAtCursor}
            />
          ) : (
            <UI3DRendererView context={tab.ui3DRenderer} showMenuBar={true} />
          )}
        </div>
      </LayoutContainer>
    </LayoutContainerProvider>
  );
};
