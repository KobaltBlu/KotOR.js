import React, { useEffect, useMemo, useState } from "react";
import type { AssetIndexEntry } from "@/apps/forge/module-editor/assets/AssetIndexTypes";
import type { TabModuleEditorState } from "@/apps/forge/states/tabs/TabModuleEditorState";
import { GameObjectType } from "@/apps/forge/states/tabs/TabModuleEditorTypes";

export interface ModuleAssetBrowserPanelProps {
  tab: TabModuleEditorState;
}

const PLACEABLE_EXTS = ["utc", "utd", "ute", "uti", "utm", "utp", "uts", "utt", "utw"];

function gameObjectTypeForExt(ext: string): GameObjectType | undefined {
  switch (ext) {
    case "utc": return GameObjectType.CREATURE;
    case "utd": return GameObjectType.DOOR;
    case "ute": return GameObjectType.ENCOUNTER;
    case "uti": return GameObjectType.ITEM;
    case "utm": return GameObjectType.STORE;
    case "utp": return GameObjectType.PLACEABLE;
    case "uts": return GameObjectType.SOUND;
    case "utt": return GameObjectType.TRIGGER;
    case "utw": return GameObjectType.WAYPOINT;
    default: return undefined;
  }
}

export const ModuleAssetBrowserPanel: React.FC<ModuleAssetBrowserPanelProps> = ({ tab }) => {
  const [query, setQuery] = useState("");
  const [ext, setExt] = useState<string>("");
  const [entries, setEntries] = useState<AssetIndexEntry[]>(tab.assetIndex.getSnapshot().entries);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const refresh = () => setEntries(tab.assetIndex.getSnapshot().entries);
    tab.assetIndex.addEventListener("onIndexRebuilt", refresh);
    return () => {
      tab.assetIndex.removeEventListener("onIndexRebuilt", refresh);
    };
  }, [tab]);

  const filtered = useMemo(() => {
    return tab.assetIndex.search(query, ext ? [ext] : PLACEABLE_EXTS);
  }, [tab, query, ext, entries]);

  const onRefresh = () => {
    setBusy(true);
    void tab.assetIndex.rebuild().finally(() => setBusy(false));
  };

  const onDragStart = (event: React.DragEvent, entry: AssetIndexEntry) => {
    event.dataTransfer.setData("application/x-forge-asset", JSON.stringify({
      resref: entry.resref,
      extension: entry.extension,
      origin: entry.origin,
    }));
    event.dataTransfer.effectAllowed = "copy";
    tab.assetIndex.touchRecent(entry.resref);
  };

  const onPlace = (entry: AssetIndexEntry) => {
    const type = gameObjectTypeForExt(entry.extension);
    if (!type) return;
    tab.setGameObjectControlOptions(type, entry.resref, tab.getResourceTypeForGameObjectType(type));
    tab.assetIndex.touchRecent(entry.resref);
  };

  return (
    <div className="module-asset-browser" role="region" aria-label="Asset browser">
      <div className="module-asset-browser__header">
        <strong>Assets</strong>
        <button type="button" className="forge-btn forge-btn--sm" disabled={busy} onClick={onRefresh}>
          {busy ? "Indexing…" : "Refresh"}
        </button>
      </div>
      <div className="module-asset-browser__filters">
        <input
          className="forge-input"
          placeholder="Search ResRefs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search assets"
        />
        <select
          className="forge-input"
          value={ext}
          onChange={(e) => setExt(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="">All blueprints</option>
          {PLACEABLE_EXTS.map((item) => (
            <option key={item} value={item}>{item.toUpperCase()}</option>
          ))}
        </select>
      </div>
      <ul className="module-asset-browser__list">
        {filtered.slice(0, 200).map((entry) => (
          <li key={`${entry.origin}:${entry.extension}:${entry.resref}`}>
            <button
              type="button"
              className="module-asset-browser__item"
              draggable
              onDragStart={(e) => onDragStart(e, entry)}
              onDoubleClick={() => onPlace(entry)}
              title={`${entry.resref}.${entry.extension} (${entry.origin}) — drag into scene or double-click to place`}
            >
              <span className="module-asset-browser__ext">{entry.extension}</span>
              <span className="module-asset-browser__resref">{entry.resref}</span>
              <span className={`module-asset-browser__origin module-asset-browser__origin--${entry.origin}`}>
                {entry.origin}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {filtered.length === 0 ? (
        <div className="module-asset-browser__empty">No matching assets. Refresh after opening a project.</div>
      ) : null}
    </div>
  );
};
