import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { TabPTHEditorControlMode, TabPTHEditorState } from "@/apps/forge/states/tabs/TabPTHEditorState";
import {
  boundsFromPoints,
  fitViewportToBounds,
  gridLinesInView,
  isMajorGridLine,
  niceGridStep,
  PTH_MAP_LABEL_MIN_SCALE,
  PthMapViewport,
  screenToWorld,
  worldToScreen,
  zoomViewportAtScreen,
} from "@/apps/forge/helpers/pthMap2D";
import "@/apps/forge/components/tabs/tab-pth-editor/TabPTHMap2D.scss";

const POINT_HIT_PX = 10;
const POINT_RADIUS = 6;

function clientToLocal(el: HTMLElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function formatWorld(n: number): string {
  return n.toFixed(2);
}

export function TabPTHMap2D(props: { tab: TabPTHEditorState }) {
  const tab = props.tab;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [viewport, setViewport] = useState<PthMapViewport>({ centerX: 0, centerY: 0, scale: 20 });
  const [tick, setTick] = useState(0);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const panRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const dragRef = useRef<{ index: number; moved: boolean } | null>(null);
  const spaceDownRef = useRef(false);
  const [, setSpaceDown] = useState(false);

  const bump = useCallback(() => setTick((n) => n + 1), []);

  const fitToPoints = useCallback(() => {
    const el = wrapRef.current;
    const width = el?.clientWidth || size.width;
    const height = el?.clientHeight || size.height;
    if (width <= 1 || height <= 1) return;
    const points = tab.points.map((p) => ({ x: p.vector.x, y: p.vector.y }));
    setViewport(fitViewportToBounds(boundsFromPoints(points), width, height));
  }, [tab, size.width, size.height]);

  useEffect(() => {
    tab.fitPathMap = fitToPoints;
    return () => {
      if (tab.fitPathMap === fitToPoints) {
        tab.fitPathMap = undefined;
      }
    };
  }, [tab, fitToPoints]);

  useEffect(() => {
    tab.addEventListener("onPathChanged", bump);
    tab.addEventListener("onHistoryChanged", bump);
    tab.addEventListener("onControlModeChange", bump);
    return () => {
      tab.removeEventListener("onPathChanged", bump);
      tab.removeEventListener("onHistoryChanged", bump);
      tab.removeEventListener("onControlModeChange", bump);
    };
  }, [tab, bump]);

  useEffect(() => {
    const onFileLoad = () => {
      bump();
      requestAnimationFrame(() => fitToPoints());
    };
    tab.addEventListener("onEditorFileLoad", onFileLoad);
    return () => {
      tab.removeEventListener("onEditorFileLoad", onFileLoad);
    };
  }, [tab, bump, fitToPoints]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const width = Math.max(1, el.clientWidth);
      const height = Math.max(1, el.clientHeight);
      setSize((prev) => {
        if (prev.width === 1 && prev.height === 1) {
          const points = tab.points.map((p) => ({ x: p.vector.x, y: p.vector.y }));
          setViewport(fitViewportToBounds(boundsFromPoints(points), width, height));
        }
        return { width, height };
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDownRef.current = true;
        setSpaceDown(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDownRef.current = false;
        setSpaceDown(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const hitPoint = (sx: number, sy: number): number => {
    for (let i = tab.points.length - 1; i >= 0; i--) {
      const screen = worldToScreen(tab.points[i].vector.x, tab.points[i].vector.y, viewport, size.width, size.height);
      const dx = screen.x - sx;
      const dy = screen.y - sy;
      if (dx * dx + dy * dy <= POINT_HIT_PX * POINT_HIT_PX) {
        return i;
      }
    }
    return -1;
  };

  const worldAt = (sx: number, sy: number) => screenToWorld(sx, sy, viewport, size.width, size.height);

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = wrapRef.current;
    if (!el) return;
    const local = clientToLocal(el, e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setViewport(zoomViewportAtScreen(viewport, local.x, local.y, size.width, size.height, factor));
  };

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const local = clientToLocal(el, e.clientX, e.clientY);
    const pan =
      e.button === 1 ||
      (e.button === 0 && spaceDownRef.current) ||
      (e.button === 0 && tab.controlMode === TabPTHEditorControlMode.PAN);
    if (pan) {
      e.preventDefault();
      panRef.current = { lastX: e.clientX, lastY: e.clientY };
      return;
    }
    if (e.button !== 0) return;

    const index = hitPoint(local.x, local.y);
    if (tab.controlMode === TabPTHEditorControlMode.SELECT) {
      if (index >= 0) {
        tab.selectPoint(index);
        dragRef.current = { index, moved: false };
      } else {
        tab.selectPoint(-1);
      }
      return;
    }
    if (tab.controlMode === TabPTHEditorControlMode.ADD_POINT) {
      if (index < 0) {
        const world = worldAt(local.x, local.y);
        tab.addPathPoint(new THREE.Vector3(world.x, world.y, 0));
      }
      return;
    }
    if (tab.controlMode === TabPTHEditorControlMode.ADD_CONNECTION) {
      if (index < 0) {
        tab.selectedPointA = undefined as any;
        tab.selectedPointB = undefined as any;
        tab.selectPoint(-1);
        return;
      }
      const clicked = tab.points[index];
      if (!tab.selectedPointA) {
        tab.selectedPointA = clicked;
        tab.selectPoint(index);
      } else if (tab.selectedPointA !== clicked) {
        tab.connectPoints(tab.selectedPointA, clicked);
        tab.selectedPointA = undefined as any;
        tab.selectedPointB = undefined as any;
        tab.selectPoint(-1);
      } else {
        tab.selectedPointA = undefined as any;
        tab.selectPoint(-1);
      }
    }
  };

  const onMouseMoveLocal = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const local = clientToLocal(el, e.clientX, e.clientY);
    setCursorWorld(worldAt(local.x, local.y));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (panRef.current) {
        const dx = e.clientX - panRef.current.lastX;
        const dy = e.clientY - panRef.current.lastY;
        panRef.current = { lastX: e.clientX, lastY: e.clientY };
        setViewport((vp) => ({
          ...vp,
          centerX: vp.centerX - dx / vp.scale,
          centerY: vp.centerY + dy / vp.scale,
        }));
        return;
      }
      const drag = dragRef.current;
      if (!drag) return;
      const el = wrapRef.current;
      if (!el) return;
      const local = clientToLocal(el, e.clientX, e.clientY);
      const world = worldAt(local.x, local.y);
      drag.moved = true;
      tab.movePointXY(drag.index, world.x, world.y);
    };
    const onUp = () => {
      panRef.current = null;
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [tab, viewport, size.width, size.height]);

  const gridStep = niceGridStep(viewport.scale);
  const grid = gridLinesInView(viewport, size.width, size.height, gridStep);
  const showLabels = viewport.scale >= PTH_MAP_LABEL_MIN_SCALE;

  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];
  for (let i = 0; i < tab.points.length; i++) {
    const a = tab.points[i];
    const sa = worldToScreen(a.vector.x, a.vector.y, viewport, size.width, size.height);
    for (let j = 0; j < a.connections.length; j++) {
      const b = a.connections[j];
      const sb = worldToScreen(b.vector.x, b.vector.y, viewport, size.width, size.height);
      lines.push({ x1: sa.x, y1: sa.y, x2: sb.x, y2: sb.y, key: `${i}-${b.id}` });
    }
  }

  void tick;

  const selected = tab.selectedPointIndex >= 0 ? tab.points[tab.selectedPointIndex] : undefined;
  const isPanning = spaceDownRef.current || tab.controlMode === TabPTHEditorControlMode.PAN;

  return (
    <div
      ref={wrapRef}
      className="tab-pth-map-2d"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMoveLocal}
      onMouseLeave={() => setCursorWorld(null)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor: isPanning ? "grab" : "crosshair" }}
    >
      <svg width={size.width} height={size.height} style={{ display: "block" }}>
        {grid.vertical.map((wx) => {
          const a = worldToScreen(wx, 0, viewport, size.width, size.height);
          const major = isMajorGridLine(wx, gridStep);
          const isAxis = Math.abs(wx) < gridStep * 1e-6;
          return (
            <line
              key={`vx-${wx}`}
              x1={a.x}
              y1={0}
              x2={a.x}
              y2={size.height}
              stroke={isAxis ? "#5a8f5a" : major ? "#333" : "#262626"}
              strokeWidth={isAxis ? 1.5 : 1}
            />
          );
        })}
        {grid.horizontal.map((wy) => {
          const a = worldToScreen(0, wy, viewport, size.width, size.height);
          const major = isMajorGridLine(wy, gridStep);
          const isAxis = Math.abs(wy) < gridStep * 1e-6;
          return (
            <line
              key={`hy-${wy}`}
              x1={0}
              y1={a.y}
              x2={size.width}
              y2={a.y}
              stroke={isAxis ? "#5a8f5a" : major ? "#333" : "#262626"}
              strokeWidth={isAxis ? 1.5 : 1}
            />
          );
        })}
        {lines.map((line) => (
          <line key={line.key} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#00ffff" strokeWidth={2} />
        ))}
        {tab.points.map((point, index) => {
          const screen = worldToScreen(point.vector.x, point.vector.y, viewport, size.width, size.height);
          const isSelected = tab.selectedPointIndex === index;
          const connecting = tab.selectedPointA === point;
          return (
            <g key={point.id ?? index}>
              <circle
                cx={screen.x}
                cy={screen.y}
                r={POINT_RADIUS}
                fill={connecting ? "#ffe066" : isSelected ? "#7dff7d" : "#00cc00"}
                stroke={isSelected || connecting ? "#ffffff" : "#003300"}
                strokeWidth={isSelected || connecting ? 2 : 1}
              />
              {showLabels ? (
                <text className="tab-pth-map-2d__label" x={screen.x + 8} y={screen.y - 6}>
                  {index}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="tab-pth-map-2d__hud">
        <span>
          {cursorWorld
            ? `X ${formatWorld(cursorWorld.x)}, Y ${formatWorld(cursorWorld.y)}`
            : "X —, Y —"}
        </span>
        <span>
          {selected
            ? `P#${tab.selectedPointIndex} · ${formatWorld(selected.vector.x)}, ${formatWorld(selected.vector.y)}`
            : "No selection"}
        </span>
        <span>{viewport.scale.toFixed(1)} px/wu</span>
        <span>grid {gridStep}</span>
        <span>{tab.points.length} points</span>
      </div>
    </div>
  );
}
