import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@apps/game/context/AppContext";
import { TopDownMap } from "./TopDownMap";
import { ObjectInspector } from "./ObjectInspector";
import {
  collectOverviewEntries,
  computeOverviewBounds,
  DEFAULT_KIND_FILTERS,
  OVERVIEW_KIND_COLORS,
  OVERVIEW_KIND_LABELS,
  overviewEntryToMapPin,
  snapshotModuleAreaInfo,
  type ModuleAreaSnapshot,
  type OverviewEntry,
  type OverviewObjectKind,
  type SceneMapPin,
} from "./object-overview-utils";
import { clearWorldMarkers, syncWorldMarkers } from "./world-markers";
import "./scene-overview.scss";

function InfoChip({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  if(value === '' || value == null){ return null; }
  return (
    <span className="scene-overview-info-chip">
      <span className="scene-overview-info-label">{label}</span>
      <span className={`scene-overview-info-value${mono ? ' mono' : ''}`}>{value}</span>
    </span>
  );
}

/**
 * Standalone Scene Overview (legacy). Prefer Dev Tools → Scene activity.
 * Kept for direct embedding / experiments.
 */
export const SceneOverviewPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const appContext = useApp();
  const [gameKey] = appContext.gameKey;

  const [entries, setEntries] = useState<OverviewEntry[]>([]);
  const [moduleInfo, setModuleInfo] = useState<ModuleAreaSnapshot>(() => snapshotModuleAreaInfo());
  const [filters, setFilters] = useState({ ...DEFAULT_KIND_FILTERS });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<OverviewEntry | null>(null);
  const [showWorldMarkers, setShowWorldMarkers] = useState(true);

  const refresh = useCallback(() => {
    setModuleInfo(snapshotModuleAreaInfo());
    const next = collectOverviewEntries();
    setEntries(next);
    setSelectedEntry((prev) => {
      if(!prev){ return null; }
      const still = next.find((e) => e.object === prev.object);
      if(!still){
        setSelectedId(null);
        return null;
      }
      setSelectedId(still.id);
      return still;
    });
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 250);
    return () => {
      window.clearInterval(id);
      clearWorldMarkers();
    };
  }, [refresh]);

  const visibleEntries = useMemo(
    () => entries.filter((e) => filters[e.kind] !== false),
    [entries, filters]
  );

  const pins = useMemo(() => entries.map(overviewEntryToMapPin), [entries]);
  const visiblePins = useMemo(
    () => pins.filter((p) => filters[p.kind] !== false),
    [pins, filters]
  );
  const bounds = useMemo(() => computeOverviewBounds(visiblePins), [visiblePins]);

  useEffect(() => {
    syncWorldMarkers(visiblePins, showWorldMarkers, selectedId);
  }, [visiblePins, showWorldMarkers, selectedId]);

  const onSelect = useCallback((pin: SceneMapPin | null) => {
    if(!pin){
      setSelectedEntry(null);
      setSelectedId(null);
      return;
    }
    const entry = entries.find((e) => e.id === pin.id) || null;
    setSelectedEntry(entry);
    setSelectedId(pin.id);
  }, [entries]);

  const handleClose = useCallback(() => {
    clearWorldMarkers();
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if(e.key === 'Escape'){
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const kinds = Object.keys(OVERVIEW_KIND_LABELS) as OverviewObjectKind[];
  const oc = moduleInfo.objectCounts;
  const subtitle = moduleInfo.loaded
    ? [
        moduleInfo.moduleFilename || 'module',
        moduleInfo.areaResRef || moduleInfo.areaTag,
      ].filter(Boolean).join(' · ')
    : 'No module loaded';

  return (
    <div className={`scene-overview ${gameKey}`}>
      <div className="scene-overview-chrome">
        <div className="scene-overview-chrome-text">
          <div className="scene-overview-title">Scene Overview</div>
          <div className="scene-overview-subtitle" title={subtitle}>{subtitle}</div>
        </div>
        <label className="scene-overview-check">
          <input
            type="checkbox"
            checked={showWorldMarkers}
            onChange={(e) => setShowWorldMarkers(e.target.checked)}
          />
          World markers
        </label>
        {onClose && (
          <button type="button" className="scene-overview-close" onClick={handleClose}>Close</button>
        )}
      </div>

      <div className="scene-overview-module-info">
        {!moduleInfo.loaded ? (
          <div className="scene-overview-empty">No module loaded</div>
        ) : (
          <>
            <div className="scene-overview-info-row">
              <InfoChip label="Module" value={moduleInfo.moduleFilename} mono />
              <InfoChip label="Name" value={moduleInfo.moduleName} />
              <InfoChip label="Tag" value={moduleInfo.moduleTag} mono />
              <InfoChip label="Entry" value={moduleInfo.entryArea} mono />
            </div>
            <div className="scene-overview-info-row">
              <InfoChip label="Area" value={moduleInfo.areaResRef} mono />
              <InfoChip label="Area Name" value={moduleInfo.areaName} />
              <InfoChip label="Area Tag" value={moduleInfo.areaTag} mono />
              <InfoChip label="Rooms" value={moduleInfo.rooms} />
              <InfoChip label="DayNight" value={moduleInfo.dayNightCycle ? 'yes' : 'no'} />
              <InfoChip label="NoRest" value={moduleInfo.noRest ? 'yes' : 'no'} />
            </div>
            <div className="scene-overview-info-row">
              <InfoChip label="Time" value={`${moduleInfo.time} ${moduleInfo.dayPhase}`.trim()} mono />
              <InfoChip label="Dawn/Dusk" value={`${padHour(moduleInfo.dawnHour)}/${padHour(moduleInfo.duskHour)}`} mono />
              <InfoChip label="Calendar" value={moduleInfo.calendar} mono />
              <InfoChip label="Weather" value={moduleInfo.weather} />
              <InfoChip label="Gold" value={moduleInfo.partyGold} mono />
              <InfoChip label="Party" value={moduleInfo.partySize} />
            </div>
            <div className="scene-overview-info-row counts">
              <InfoChip label="Creatures" value={oc.creatures} />
              <InfoChip label="Doors" value={oc.doors} />
              <InfoChip label="Placeables" value={oc.placeables} />
              <InfoChip label="Triggers" value={oc.triggers} />
              <InfoChip label="Waypoints" value={oc.waypoints} />
              <InfoChip label="Sounds" value={oc.sounds} />
              <InfoChip label="Stores" value={oc.stores} />
              <InfoChip label="Encounters" value={oc.encounters} />
              <InfoChip label="Items" value={oc.items} />
            </div>
          </>
        )}
      </div>

      <div className="scene-overview-filters">
        {kinds.map((kind) => (
          <label key={kind} className="scene-overview-filter">
            <input
              type="checkbox"
              checked={!!filters[kind]}
              onChange={(e) => setFilters((f) => ({ ...f, [kind]: e.target.checked }))}
            />
            <span className="scene-overview-swatch" style={{ background: OVERVIEW_KIND_COLORS[kind] }} />
            {OVERVIEW_KIND_LABELS[kind]}
            {kind === 'party' ? ' (PC ◆ / party ○)' : ''}
          </label>
        ))}
      </div>

      <div className="scene-overview-body">
        <div className="scene-overview-map">
          <TopDownMap
            entries={pins}
            filters={filters}
            bounds={bounds}
            selectedId={selectedId}
            onSelect={onSelect}
          />
          <div className="scene-overview-count">{visibleEntries.length} objects</div>
        </div>
        <ObjectInspector object={selectedEntry?.object ?? null} />
      </div>
    </div>
  );
};

function padHour(n: number): string {
  return (n | 0).toString().padStart(2, '0');
}
