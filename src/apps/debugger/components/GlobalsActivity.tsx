import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "@apps/debugger/context/AppContext";
import type { GlobalsSnapshotEntry } from "@engine/debug/inspect/runtimeSnapshots";

function formatValue(entry: GlobalsSnapshotEntry): string {
  if(entry.type === 'Location' && entry.value && typeof entry.value === 'object'){
    const loc = entry.value as { x: number; y: number; z: number; facing: number };
    return `(${loc.x.toFixed(2)}, ${loc.y.toFixed(2)}, ${loc.z.toFixed(2)}) facing ${loc.facing.toFixed(2)}`;
  }
  if(typeof entry.value === 'boolean'){
    return entry.value ? 'TRUE' : 'FALSE';
  }
  return String(entry.value ?? '');
}

export const GlobalsActivity: React.FC = () => {
  const { stateRef, globalsSnapshot } = useApp();
  const [rows, setRows] = useState<GlobalsSnapshotEntry[]>(globalsSnapshot);
  const [search, setSearch] = useState('');

  useEffect(() => { setRows(globalsSnapshot); }, [globalsSnapshot]);

  useEffect(() => {
    const state = stateRef.current;
    const refresh = () => state?.requestGlobalsSnapshot();
    refresh();
    const id = window.setInterval(refresh, 1000);
    const onSnap = (next: GlobalsSnapshotEntry[]) => setRows(next || []);
    state?.addEventListener('globals-snapshot', onSnap);
    return () => {
      window.clearInterval(id);
      state?.removeEventListener('globals-snapshot', onSnap);
    };
  }, [stateRef]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if(!q){ return rows; }
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q)
      || r.type.toLowerCase().includes(q)
      || formatValue(r).toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="inspector-activity globals-activity">
      <div className="inspector-activity-toolbar">
        <h2>Globals</h2>
        <input
          className="inspector-search"
          placeholder="Search globals"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="inspector-refresh" onClick={() => stateRef.current?.requestGlobalsSnapshot()}>
          Refresh
        </button>
      </div>
      <div className="globals-table-wrap">
        <table className="globals-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={`${row.type}:${row.name}`}>
                <td>{row.name}</td>
                <td>{row.type}</td>
                <td className="globals-value">{formatValue(row)}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={3} className="inspector-empty">No globals</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
