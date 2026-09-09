import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "@/apps/debugger/context/AppContext";
import { TopDownMap } from "@/inspect/TopDownMap";
import {
  DEFAULT_KIND_FILTERS,
  INSPECTOR_DEFAULT_OPEN,
  OVERVIEW_KIND_COLORS,
  OVERVIEW_KIND_LABELS,
  computeOverviewBounds,
  objectListToMapPins,
  type InspectorSection,
  type LiveObjectSnapshot,
  type ObjectListEntry,
  type OverviewBounds,
  type OverviewObjectKind,
  type SceneMapPin,
} from "@/inspect/runtimeSnapshots";
import {
  type AreaMapOverlaySnapshot,
  worldToOverlayMapPoint,
} from "@/inspect/areaMapOverlay";

const KvRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="inspector-kv" title="Click to copy" onClick={() => {
    try{ void navigator.clipboard?.writeText(value); }catch{ /* ignore */ }
  }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const SectionView: React.FC<{ section: InspectorSection }> = ({ section }) => {
  const [open, setOpen] = useState(INSPECTOR_DEFAULT_OPEN[section.id] ?? true);
  return (
    <div className={`inspector-section ${open ? 'open' : 'collapsed'}`}>
      <button type="button" className="inspector-section-toggle" onClick={() => setOpen(!open)}>
        <span>{open ? '▼' : '▶'}</span>
        <span>{section.title}</span>
      </button>
      {open && section.rows.map((row) => (
        <KvRow key={`${section.id}:${row.label}:${row.value}`} label={row.label} value={row.value} />
      ))}
    </div>
  );
};

/**
 * World pins → map texture pixel space for TopDownMap.
 * GetMapPixel is in logical pixels (440×256 / 588×294); lbl_map* is often
 * 512×256. Scene draws the texture at native size and scales pins by UV so we do
 * not squash X (logical aspect 1.72 vs texture 2.0), which reads as an X shift.
 */
function pinsToMapSpace(
  pins: SceneMapPin[],
  overlay: AreaMapOverlaySnapshot
): { pins: SceneMapPin[]; bounds: OverviewBounds } {
  const logicalW = overlay.logicalWidth;
  const logicalH = overlay.logicalHeight;
  const texW = overlay.textureWidth > 0 ? overlay.textureWidth : logicalW;
  const texH = overlay.textureHeight > 0 ? overlay.textureHeight : logicalH;
  const mapped: SceneMapPin[] = [];
  for(const p of pins){
    const pix = worldToOverlayMapPoint(overlay, p.x, p.y);
    const u = logicalW > 0 ? pix.x / logicalW : 0;
    const v = logicalH > 0 ? pix.y / logicalH : 0;
    mapped.push({
      ...p,
      x: u * texW,
      // Same Y flip as AreaMap.toMapCoordinates: uv.y = 1 - odysseyV
      y: (1 - v) * texH,
    });
  }
  return {
    pins: mapped,
    bounds: {
      minX: 0,
      minY: 0,
      maxX: texW,
      maxY: texH,
      width: Math.max(1, texW),
      height: Math.max(1, texH),
    },
  };
}

export const SceneActivity: React.FC = () => {
  const { stateRef, objectList, selectedObjectDetail, setActivity } = useApp();
  const [list, setList] = useState<ObjectListEntry[]>(objectList);
  const [detail, setDetail] = useState<LiveObjectSnapshot | null>(selectedObjectDetail);
  const [filters, setFilters] = useState({ ...DEFAULT_KIND_FILTERS });
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null);
  const [showWorldMarkers, setShowWorldMarkers] = useState(true);
  const [overlay, setOverlay] = useState<AreaMapOverlaySnapshot | null>(null);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => { setList(objectList); }, [objectList]);
  useEffect(() => { setDetail(selectedObjectDetail); }, [selectedObjectDetail]);

  useEffect(() => {
    const state = stateRef.current;
    const refresh = () => {
      state?.requestObjectList();
      state?.requestAreaMapOverlay();
    };
    refresh();
    const id = window.setInterval(() => state?.requestObjectList(), 500);
    const onList = (next: ObjectListEntry[]) => setList(next || []);
    const onDetail = (next: LiveObjectSnapshot | null) => setDetail(next);
    const onOverlay = (next: AreaMapOverlaySnapshot | null) => setOverlay(next);
    state?.addEventListener('object-list', onList);
    state?.addEventListener('object-detail', onDetail);
    state?.addEventListener('area-map-overlay', onOverlay);
    if(state?.areaMapOverlay){
      setOverlay(state.areaMapOverlay);
    }
    return () => {
      window.clearInterval(id);
      state?.removeEventListener('object-list', onList);
      state?.removeEventListener('object-detail', onDetail);
      state?.removeEventListener('area-map-overlay', onOverlay);
      state?.setSceneWorldMarkers({ enabled: false, entries: [], selectedId: null });
    };
  }, [stateRef]);

  useEffect(() => {
    if(!overlay?.available || !overlay.textureDataUrl){
      setMapImage(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if(!cancelled){ setMapImage(img); }
    };
    img.onerror = () => {
      if(!cancelled){ setMapImage(null); }
    };
    img.src = overlay.textureDataUrl;
    return () => { cancelled = true; };
  }, [overlay?.available, overlay?.textureDataUrl, overlay?.areaResRef]);

  const worldPins = useMemo(() => objectListToMapPins(list), [list]);

  const { mapPins, mapBounds } = useMemo(() => {
    if(overlay?.available && overlay.logicalWidth > 0 && overlay.logicalHeight > 0){
      const mapped = pinsToMapSpace(worldPins, overlay);
      return { mapPins: mapped.pins, mapBounds: mapped.bounds };
    }
    return {
      mapPins: worldPins,
      mapBounds: computeOverviewBounds(worldPins),
    };
  }, [worldPins, overlay]);

  const visibleWorldPins = useMemo(
    () => worldPins.filter((p) => filters[p.kind] !== false),
    [worldPins, filters]
  );

  const visibleMapPins = useMemo(
    () => mapPins.filter((p) => filters[p.kind] !== false),
    [mapPins, filters]
  );

  useEffect(() => {
    // World markers still use world-space pins
    stateRef.current?.setSceneWorldMarkers({
      enabled: showWorldMarkers,
      selectedId: selectedMapId,
      entries: visibleWorldPins,
    });
  }, [stateRef, showWorldMarkers, selectedMapId, visibleWorldPins]);

  const onSelectPin = (pin: SceneMapPin | null) => {
    if(!pin){
      setSelectedMapId(null);
      setSelectedObjectId(null);
      return;
    }
    setSelectedMapId(pin.id);
    const entry = list.find((e) => e.mapId === pin.id);
    const oid = entry?.id ?? null;
    setSelectedObjectId(oid);
    if(oid != null){
      stateRef.current?.requestObjectDetail(oid);
    }
  };

  const openScripts = () => {
    if(!detail){ return; }
    stateRef.current?.setScriptOwnerFilter({
      objectId: detail.objectId,
      tag: detail.tag || '',
      label: detail.name || detail.tag || 'object',
      kind: detail.kind,
    });
    setActivity('scripts');
  };

  const kinds = Object.keys(OVERVIEW_KIND_LABELS) as OverviewObjectKind[];
  const mapLabel = overlay?.available
    ? `lbl_map${overlay.areaResRef || ''}`
    : 'No area map';

  return (
    <div className="inspector-activity scene-activity">
      <div className="scene-activity-toolbar">
        <label className="scene-activity-check">
          <input
            type="checkbox"
            checked={showWorldMarkers}
            onChange={(e) => setShowWorldMarkers(e.target.checked)}
          />
          World markers
        </label>
        <span className="scene-activity-map-meta" title={mapLabel}>{mapLabel}</span>
        <button
          type="button"
          className="inspector-refresh"
          onClick={() => {
            stateRef.current?.requestObjectList();
            stateRef.current?.requestAreaMapOverlay();
          }}
        >
          Refresh
        </button>
      </div>
      <div className="scene-activity-filters">
        {kinds.map((kind) => (
          <label key={kind} className="scene-activity-filter">
            <input
              type="checkbox"
              checked={!!filters[kind]}
              onChange={(e) => setFilters((f) => ({ ...f, [kind]: e.target.checked }))}
            />
            <span className="scene-activity-swatch" style={{ background: OVERVIEW_KIND_COLORS[kind] }} />
            {OVERVIEW_KIND_LABELS[kind]}
          </label>
        ))}
      </div>
      <div className="scene-activity-body">
        <div className="scene-activity-map">
          <TopDownMap
            entries={mapPins}
            filters={filters}
            bounds={mapBounds}
            selectedId={selectedMapId}
            onSelect={onSelectPin}
            mapImage={mapImage}
          />
          <div className="scene-activity-count">{visibleMapPins.length} objects</div>
        </div>
        <aside className="scene-activity-detail">
          {!detail || selectedObjectId == null ? (
            <div className="inspector-empty">Select an object on the map</div>
          ) : (
            <>
              <div className="objects-detail-header">
                <div>
                  <div className="objects-detail-title">{detail.name || detail.tag || `id:${detail.objectId}`}</div>
                  <div className="objects-detail-sub">{detail.type} · {detail.templateResRef || '—'}</div>
                </div>
                <button type="button" className="inspector-refresh" onClick={openScripts}>
                  Open scripts
                </button>
              </div>
              {detail.sections.map((section) => (
                <SectionView key={section.id} section={section} />
              ))}
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
