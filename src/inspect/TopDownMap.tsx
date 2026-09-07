import React, { useCallback, useEffect, useRef, useState } from "react";
import type { OverviewBounds, OverviewObjectKind, SceneMapPin } from "@/inspect/runtimeSnapshots";
import { OVERVIEW_PARTY_RING, OVERVIEW_PC_COLOR } from "@/inspect/runtimeSnapshots";

export interface TopDownMapProps {
  entries: SceneMapPin[];
  filters: Record<OverviewObjectKind, boolean>;
  bounds: OverviewBounds;
  selectedId: string | null;
  onSelect: (entry: SceneMapPin | null) => void;
  /** Optional area map texture stretched to `bounds` (FlipY-encoded; top at maxY). */
  mapImage?: CanvasImageSource | null;
}

const PAD = 12;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 16;
const ZOOM_STEP = 1.25;
const DRAG_THRESHOLD = 4;
const GRID_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
){
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
){
  const arm = r * 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy);
  ctx.lineTo(cx + arm, cy);
  ctx.moveTo(cx, cy - arm);
  ctx.lineTo(cx, cy + arm);
  ctx.stroke();
}

function pickGridStep(viewScaleCss: number): number {
  // Aim for ~55 CSS px between lines
  const targetWorld = 55 / Math.max(1e-6, viewScaleCss);
  let best = GRID_STEPS[0];
  for(const step of GRID_STEPS){
    best = step;
    if(step >= targetWorld){ break; }
  }
  return best;
}

function boundsKey(b: OverviewBounds): string {
  return `${b.minX.toFixed(2)},${b.minY.toFixed(2)},${b.maxX.toFixed(2)},${b.maxY.toFixed(2)}`;
}

export const TopDownMap: React.FC<TopDownMapProps> = ({
  entries,
  filters,
  bounds,
  selectedId,
  onSelect,
  mapImage = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef<SceneMapPin[]>([]);
  const viewRef = useRef<ViewState>({ zoom: 1, panX: 0, panY: 0 });
  const boundsRef = useRef(bounds);
  const mapImageRef = useRef<CanvasImageSource | null>(mapImage);
  const drawRef = useRef<() => void>(() => {});
  const spaceDownRef = useRef(false);
  const draggingRef = useRef(false);
  const panStartedRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const downPointerRef = useRef({ x: 0, y: 0 });
  const lastBoundsKeyRef = useRef('');
  const rafRef = useRef(0);

  const [zoomUi, setZoomUi] = useState(1);
  const [grabbing, setGrabbing] = useState(false);

  boundsRef.current = bounds;
  mapImageRef.current = mapImage;

  const scheduleDraw = useCallback(() => {
    if(rafRef.current){ return; }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      drawRef.current();
      setZoomUi(viewRef.current.zoom);
    });
  }, []);

  const getBaseScale = useCallback((w: number, h: number, b: OverviewBounds) => {
    return Math.min(
      (w - PAD * 2) / Math.max(1e-6, b.width),
      (h - PAD * 2) / Math.max(1e-6, b.height)
    );
  }, []);

  const fitView = useCallback((w: number, h: number, b: OverviewBounds) => {
    const base = getBaseScale(w, h, b);
    viewRef.current.zoom = 1;
    viewRef.current.panX = (w - b.width * base) / 2;
    viewRef.current.panY = (h - b.height * base) / 2;
  }, [getBaseScale]);

  const clampPan = useCallback((w: number, h: number, b: OverviewBounds) => {
    const v = viewRef.current;
    const base = getBaseScale(w, h, b);
    const viewScale = base * v.zoom;
    const contentW = b.width * viewScale;
    const contentH = b.height * viewScale;
    const marginX = Math.max(40, w * 0.1);
    const marginY = Math.max(40, h * 0.1);
    // Keep at least margin of content on-screen
    const minPanX = marginX - contentW;
    const maxPanX = w - marginX;
    const minPanY = marginY - contentH;
    const maxPanY = h - marginY;
    v.panX = Math.min(maxPanX, Math.max(minPanX, v.panX));
    v.panY = Math.min(maxPanY, Math.max(minPanY, v.panY));
  }, [getBaseScale]);

  const applyZoomAt = useCallback((screenX: number, screenY: number, factor: number, w: number, h: number) => {
    const b = boundsRef.current;
    const v = viewRef.current;
    const base = getBaseScale(w, h, b);
    const oldZoom = v.zoom;
    const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, oldZoom * factor));
    if(newZoom === oldZoom){ return; }

    const oldScale = base * oldZoom;
    const newScale = base * newZoom;
    // World point under screen before zoom
    const worldX = b.minX + (screenX - v.panX) / oldScale;
    const worldY = b.maxY - (screenY - v.panY) / oldScale;
    v.zoom = newZoom;
    v.panX = screenX - (worldX - b.minX) * newScale;
    v.panY = screenY - (b.maxY - worldY) * newScale;
    clampPan(w, h, b);
    scheduleDraw();
  }, [clampPan, getBaseScale, scheduleDraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if(!canvas){ return; }

    const resize = () => {
      const parent = canvas.parentElement;
      if(!parent){ return; }
      const cssW = Math.max(64, parent.clientWidth);
      const cssH = Math.max(64, parent.clientHeight);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      const key = boundsKey(boundsRef.current);
      if(key !== lastBoundsKeyRef.current){
        lastBoundsKeyRef.current = key;
        fitView(canvas.width, canvas.height, boundsRef.current);
      }else{
        clampPan(canvas.width, canvas.height, boundsRef.current);
      }
      draw();
      setZoomUi(viewRef.current.zoom);
    };

    const worldToScreen = (x: number, y: number, w: number, h: number) => {
      const b = boundsRef.current;
      const v = viewRef.current;
      const base = getBaseScale(w, h, b);
      const scale = base * v.zoom;
      const sx = v.panX + (x - b.minX) * scale;
      const sy = v.panY + (b.maxY - y) * scale;
      return { sx, sy, scale };
    };

    const drawEntry = (
      ctx: CanvasRenderingContext2D,
      e: SceneMapPin,
      w: number,
      h: number
    ) => {
      const { sx, sy, scale } = worldToScreen(e.x, e.y, w, h);
      // Skip off-screen nodes (with margin)
      if(sx < -40 || sy < -40 || sx > w + 40 || sy > h + 40){ return; }

      const selected = e.id === selectedId;
      const baseR = Math.max(3.5, 3.2 * Math.min(2.5, scale));
      const dpr = window.devicePixelRatio || 1;
      const fontPx = Math.max(10, 11 * dpr);

      if(e.isPlayer){
        const r = baseR * 2.1;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 235, 59, 0.45)';
        ctx.lineWidth = 3;
        ctx.stroke();

        drawDiamond(ctx, sx, sy, r);
        ctx.fillStyle = OVERVIEW_PC_COLOR;
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.strokeStyle = OVERVIEW_PC_COLOR;
        ctx.lineWidth = 1.5;
        drawCrosshair(ctx, sx, sy, r);

        ctx.fillStyle = OVERVIEW_PC_COLOR;
        ctx.font = `bold ${fontPx}px Lucida Sans Unicode, sans-serif`;
        ctx.fillText(`PC · ${e.label}`, sx + r + 5, sy + 4);
        return;
      }

      if(e.isParty || e.kind === 'party'){
        const r = baseR * 1.65;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.4)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.globalAlpha = 1;
        ctx.fill();
        ctx.strokeStyle = OVERVIEW_PARTY_RING;
        ctx.lineWidth = selected ? 3 : 2.25;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(2, r * 0.35), 0, Math.PI * 2);
        ctx.fillStyle = '#0a1620';
        ctx.fill();

        ctx.fillStyle = OVERVIEW_PARTY_RING;
        ctx.font = `bold ${fontPx}px Lucida Sans Unicode, sans-serif`;
        ctx.fillText(e.label, sx + r + 5, sy + 4);
        return;
      }

      const r = baseR * (selected ? 1.35 : 1);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.globalAlpha = selected ? 1 : 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
      if(selected){
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffe08a';
        ctx.font = `${fontPx}px Lucida Sans Unicode, sans-serif`;
        ctx.fillText(e.label, sx + r + 4, sy + 3);
      }
    };

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if(!ctx){ return; }
      const w = canvas.width;
      const h = canvas.height;
      const b = boundsRef.current;
      const v = viewRef.current;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = mapImageRef.current ? 'rgba(8,10,14,0.85)' : 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, w, h);

      const base = getBaseScale(w, h, b);
      const viewScale = base * v.zoom;
      const viewScaleCss = viewScale / dpr;

      // Area map texture — FlipY-encoded so top is at bitmap top / maxY.
      const overlay = mapImageRef.current;
      if(overlay){
        const imgX = v.panX;
        const imgY = v.panY;
        const imgW = b.width * viewScale;
        const imgH = b.height * viewScale;
        ctx.save();
        ctx.globalAlpha = 1;
        try{
          ctx.drawImage(overlay, imgX, imgY, imgW, imgH);
        }catch{ /* broken image */ }
        ctx.restore();
      }

      const gridStep = pickGridStep(viewScaleCss);

      // Visible world rect
      const worldLeft = b.minX + (0 - v.panX) / viewScale;
      const worldRight = b.minX + (w - v.panX) / viewScale;
      const worldTop = b.maxY - (0 - v.panY) / viewScale;
      const worldBottom = b.maxY - (h - v.panY) / viewScale;
      const gMinX = Math.max(b.minX, Math.min(worldLeft, worldRight));
      const gMaxX = Math.min(b.maxX, Math.max(worldLeft, worldRight));
      const gMinY = Math.max(b.minY, Math.min(worldBottom, worldTop));
      const gMaxY = Math.min(b.maxY, Math.max(worldBottom, worldTop));

      ctx.strokeStyle = 'rgba(230, 179, 92, 0.15)';
      ctx.lineWidth = 1;
      const startX = Math.floor(gMinX / gridStep) * gridStep;
      const startY = Math.floor(gMinY / gridStep) * gridStep;
      for(let gx = startX; gx <= gMaxX + 1e-6; gx += gridStep){
        const a = worldToScreen(gx, gMinY, w, h);
        const c = worldToScreen(gx, gMaxY, w, h);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(c.sx, c.sy);
        ctx.stroke();
      }
      for(let gy = startY; gy <= gMaxY + 1e-6; gy += gridStep){
        const a = worldToScreen(gMinX, gy, w, h);
        const c = worldToScreen(gMaxX, gy, w, h);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(c.sx, c.sy);
        ctx.stroke();
      }

      const visible = entries.filter((e) => filters[e.kind] !== false);
      visibleRef.current = visible;

      const ambience = visible.filter((e) => !e.isParty && !e.isPlayer && e.kind !== 'party');
      const party = visible.filter((e) => (e.isParty || e.kind === 'party') && !e.isPlayer);
      const pcs = visible.filter((e) => e.isPlayer);

      for(const e of ambience){ drawEntry(ctx, e, w, h); }
      for(const e of party){ drawEntry(ctx, e, w, h); }
      for(const e of pcs){ drawEntry(ctx, e, w, h); }
    };

    drawRef.current = draw;

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const sx = (ev.clientX - rect.left) * dpr;
      const sy = (ev.clientY - rect.top) * dpr;
      const factor = ev.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      applyZoomAt(sx, sy, factor, canvas.width, canvas.height);
    };

    const onPointerDown = (ev: PointerEvent) => {
      if(ev.button !== 0 && ev.button !== 1){ return; }
      canvas.setPointerCapture(ev.pointerId);
      draggingRef.current = true;
      panStartedRef.current = false;
      downPointerRef.current = { x: ev.clientX, y: ev.clientY };
      lastPointerRef.current = { x: ev.clientX, y: ev.clientY };
      if(ev.button === 1 || spaceDownRef.current){
        panStartedRef.current = true;
        setGrabbing(true);
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      if(!draggingRef.current){ return; }
      const dx = ev.clientX - lastPointerRef.current.x;
      const dy = ev.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: ev.clientX, y: ev.clientY };

      const moved = Math.hypot(
        ev.clientX - downPointerRef.current.x,
        ev.clientY - downPointerRef.current.y
      );
      if(!panStartedRef.current && moved > DRAG_THRESHOLD){
        panStartedRef.current = true;
        setGrabbing(true);
      }
      if(!panStartedRef.current){ return; }

      const dpr = window.devicePixelRatio || 1;
      viewRef.current.panX += dx * dpr;
      viewRef.current.panY += dy * dpr;
      clampPan(canvas.width, canvas.height, boundsRef.current);
      scheduleDraw();
    };

    const onPointerUp = (ev: PointerEvent) => {
      if(!draggingRef.current){ return; }
      draggingRef.current = false;
      setGrabbing(false);
      try{ canvas.releasePointerCapture(ev.pointerId); }catch{ /* */ }

      if(panStartedRef.current){
        panStartedRef.current = false;
        return;
      }

      // Click select
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cx = (ev.clientX - rect.left) * dpr;
      const cy = (ev.clientY - rect.top) * dpr;
      const w = canvas.width;
      const h = canvas.height;
      const b = boundsRef.current;
      const v = viewRef.current;
      const base = getBaseScale(w, h, b);
      const scale = base * v.zoom;

      let best: SceneMapPin | null = null;
      let bestScore = Infinity;
      for(const e of visibleRef.current){
        const sx = v.panX + (e.x - b.minX) * scale;
        const sy = v.panY + (b.maxY - e.y) * scale;
        const d = Math.hypot(sx - cx, sy - cy);
        const hitR = (e.isPlayer ? 22 : e.isParty || e.kind === 'party' ? 18 : 12) * dpr;
        if(d > hitR){ continue; }
        const bias = e.isPlayer ? -8 : (e.isParty || e.kind === 'party' ? -4 : 0);
        const score = d + bias;
        if(score < bestScore){
          bestScore = score;
          best = e;
        }
      }
      onSelect(best);
    };

    const onDblClick = (ev: MouseEvent) => {
      ev.preventDefault();
      fitView(canvas.width, canvas.height, boundsRef.current);
      scheduleDraw();
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if(ev.code === 'Space'){ spaceDownRef.current = true; }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if(ev.code === 'Space'){ spaceDownRef.current = false; }
    };

    resize();
    const ro = new ResizeObserver(resize);
    if(canvas.parentElement){ ro.observe(canvas.parentElement); }

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('dblclick', onDblClick);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if(rafRef.current){ cancelAnimationFrame(rafRef.current); }
    };
  }, [entries, filters, selectedId, onSelect, mapImage, applyZoomAt, clampPan, fitView, getBaseScale, scheduleDraw]);

  // Re-fit when bounds jump (module change); redraw when bounds/entries update
  useEffect(() => {
    const canvas = canvasRef.current;
    if(!canvas || !canvas.width){ return; }
    const key = boundsKey(bounds);
    if(key !== lastBoundsKeyRef.current){
      lastBoundsKeyRef.current = key;
      fitView(canvas.width, canvas.height, bounds);
    }else{
      clampPan(canvas.width, canvas.height, bounds);
    }
    scheduleDraw();
  }, [bounds, entries, filters, selectedId, mapImage, fitView, clampPan, scheduleDraw]);

  const zoomByButton = (direction: 1 | -1) => {
    const canvas = canvasRef.current;
    if(!canvas){ return; }
    const factor = direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    applyZoomAt(canvas.width / 2, canvas.height / 2, factor, canvas.width, canvas.height);
  };

  const onFitClick = () => {
    const canvas = canvasRef.current;
    if(!canvas){ return; }
    fitView(canvas.width, canvas.height, boundsRef.current);
    scheduleDraw();
  };

  const atMin = zoomUi <= ZOOM_MIN + 1e-6;
  const atMax = zoomUi >= ZOOM_MAX - 1e-6;

  return (
    <div ref={wrapRef} className="scene-overview-map-wrap">
      <canvas
        ref={canvasRef}
        className={`scene-overview-map-canvas ${grabbing ? 'grabbing' : ''}`}
      />
      <div className="scene-overview-map-toolbar">
        <button
          type="button"
          className="scene-overview-map-btn"
          title="Zoom out"
          disabled={atMin}
          onClick={() => zoomByButton(-1)}
        >
          −
        </button>
        <span className="scene-overview-map-zoom">{Math.round(zoomUi * 100)}%</span>
        <button
          type="button"
          className="scene-overview-map-btn"
          title="Zoom in"
          disabled={atMax}
          onClick={() => zoomByButton(1)}
        >
          +
        </button>
        <button
          type="button"
          className="scene-overview-map-btn"
          title="Fit to bounds"
          onClick={onFitClick}
        >
          Fit
        </button>
      </div>
    </div>
  );
};
