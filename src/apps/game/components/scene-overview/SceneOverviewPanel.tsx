import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/apps/game/context/AppContext";
import { TopDownMap } from "./TopDownMap";
import { ObjectInspector } from "./ObjectInspector";
import {
  collectOverviewEntries,
  computeOverviewBounds,
  DEFAULT_KIND_FILTERS,
  OVERVIEW_KIND_COLORS,
  OVERVIEW_KIND_LABELS,
  type OverviewEntry,
  type OverviewObjectKind,
} from "./object-overview-utils";
import { clearWorldMarkers, syncWorldMarkers } from "./world-markers";
import "./scene-overview.scss";

export const SceneOverviewPanel: React.FC = () => {
  const appContext = useApp();
  const [gameKey] = appContext.gameKey;
  const [, setShowSceneOverview] = appContext.showSceneOverview;

  const [entries, setEntries] = useState<OverviewEntry[]>([]);
  const [filters, setFilters] = useState({ ...DEFAULT_KIND_FILTERS });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<OverviewEntry | null>(null);
  const [showWorldMarkers, setShowWorldMarkers] = useState(true);

  const refresh = useCallback(() => {
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

  const bounds = useMemo(() => computeOverviewBounds(visibleEntries), [visibleEntries]);

  useEffect(() => {
    syncWorldMarkers(visibleEntries, showWorldMarkers, selectedId);
  }, [visibleEntries, showWorldMarkers, selectedId]);

  const onSelect = useCallback((entry: OverviewEntry | null) => {
    setSelectedEntry(entry);
    setSelectedId(entry?.id ?? null);
  }, []);

  const onClose = useCallback(() => {
    clearWorldMarkers();
    setShowSceneOverview(false);
  }, [setShowSceneOverview]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if(e.key === 'Escape'){
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const kinds = Object.keys(OVERVIEW_KIND_LABELS) as OverviewObjectKind[];

  return (
    <div className={`scene-overview ${gameKey}`}>
      <div className="scene-overview-chrome">
        <div className="scene-overview-title">Scene Overview</div>
        <label className="scene-overview-check">
          <input
            type="checkbox"
            checked={showWorldMarkers}
            onChange={(e) => setShowWorldMarkers(e.target.checked)}
          />
          World markers
        </label>
        <button type="button" className="scene-overview-close" onClick={onClose}>Close</button>
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
            entries={entries}
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
