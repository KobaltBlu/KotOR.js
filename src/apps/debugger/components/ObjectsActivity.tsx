import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "@/apps/debugger/context/AppContext";
import {
  INSPECTOR_DEFAULT_OPEN,
  OVERVIEW_KIND_COLORS,
  OVERVIEW_KIND_LABELS,
  type InspectorSection,
  type LiveObjectSnapshot,
  type ObjectListEntry,
  type OverviewObjectKind,
} from "@/inspect/runtimeSnapshots";

const KIND_ORDER: OverviewObjectKind[] = [
  'party', 'creature', 'door', 'placeable', 'trigger', 'waypoint',
  'sound', 'store', 'encounter', 'item', 'area', 'module', 'other',
];

const KvRow: React.FC<{
  label: string;
  value: string;
  title?: string;
  onActivate?: () => void;
}> = ({ label, value, title, onActivate }) => (
  <div
    className={`inspector-kv ${onActivate ? 'inspector-kv-action' : ''}`}
    title={title || (onActivate ? 'Open in Scripts' : 'Click to copy')}
    onClick={() => {
      if(onActivate){
        onActivate();
        return;
      }
      try{ void navigator.clipboard?.writeText(value); }catch{ /* ignore */ }
    }}
  >
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const SectionView: React.FC<{
  section: InspectorSection;
  onScriptRow?: (slot: string, resref: string) => void;
}> = ({ section, onScriptRow }) => {
  const [open, setOpen] = useState(INSPECTOR_DEFAULT_OPEN[section.id] ?? true);
  const isScripts = section.id === 'scripts';
  return (
    <div className={`inspector-section ${open ? 'open' : 'collapsed'}`}>
      <button type="button" className="inspector-section-toggle" onClick={() => setOpen(!open)}>
        <span>{open ? '▼' : '▶'}</span>
        <span>{section.title}</span>
      </button>
      {open && section.rows.map((row) => {
        const canOpenScript = isScripts
          && onScriptRow
          && row.value
          && row.value.toLowerCase() !== 'none';
        return (
          <KvRow
            key={`${section.id}:${row.label}:${row.value}`}
            label={row.label}
            value={row.value}
            onActivate={canOpenScript ? () => onScriptRow!(row.label, row.value) : undefined}
          />
        );
      })}
    </div>
  );
};

export const ObjectsActivity: React.FC = () => {
  const { stateRef, objectList, selectedObjectDetail, navigateHelper } = useApp();
  const [list, setList] = useState<ObjectListEntry[]>(objectList);
  const [detail, setDetail] = useState<LiveObjectSnapshot | null>(selectedObjectDetail);
  const [kindFilter, setKindFilter] = useState<OverviewObjectKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => { setList(objectList); }, [objectList]);
  useEffect(() => { setDetail(selectedObjectDetail); }, [selectedObjectDetail]);

  useEffect(() => {
    const state = stateRef.current;
    const refresh = () => state?.requestObjectList(kindFilter === 'all' ? undefined : kindFilter);
    refresh();
    const id = window.setInterval(refresh, 1000);
    const onList = (next: ObjectListEntry[]) => setList(next || []);
    const onDetail = (next: LiveObjectSnapshot | null) => setDetail(next);
    const onNavigate = (target: { objectId?: number; activity?: string }) => {
      if(typeof target.objectId === 'number' && target.objectId >= 0){
        setSelectedId(target.objectId);
      }
    };
    state?.addEventListener('object-list', onList);
    state?.addEventListener('object-detail', onDetail);
    state?.addEventListener('navigate', onNavigate);
    return () => {
      window.clearInterval(id);
      state?.removeEventListener('object-list', onList);
      state?.removeEventListener('object-detail', onDetail);
      state?.removeEventListener('navigate', onNavigate);
    };
  }, [stateRef, kindFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if(!q){ return list; }
    return list.filter((e) =>
      String(e.id).includes(q)
      || (e.tag || '').toLowerCase().includes(q)
      || (e.label || '').toLowerCase().includes(q)
      || (e.templateResRef || '').toLowerCase().includes(q)
      || e.kind.includes(q)
    );
  }, [list, search]);

  const onSelect = (entry: ObjectListEntry) => {
    setSelectedId(entry.id);
    stateRef.current?.requestObjectDetail(entry.id);
  };

  const openScripts = () => {
    if(!detail){ return; }
    navigateHelper({
      activity: 'scripts',
      objectId: detail.objectId,
      ownerTag: detail.tag || '',
      ownerLabel: detail.name || detail.tag || 'object',
      ownerKind: detail.kind,
    });
  };

  const openScriptRow = (slot: string, resref: string) => {
    if(!detail){ return; }
    navigateHelper({
      activity: 'scripts',
      objectId: detail.objectId,
      scriptKey: slot,
      resref,
      ownerTag: detail.tag || '',
      ownerLabel: detail.name || detail.tag || 'object',
      ownerKind: detail.kind,
    });
  };

  return (
    <div className="inspector-activity objects-activity">
      <aside className="objects-filters">
        <input
          className="inspector-search"
          placeholder="Search tag / name / id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="objects-kind-chips">
          <button
            type="button"
            className={`kind-chip ${kindFilter === 'all' ? 'active' : ''}`}
            onClick={() => setKindFilter('all')}
          >
            All
          </button>
          {KIND_ORDER.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`kind-chip ${kindFilter === kind ? 'active' : ''}`}
              style={{ borderColor: OVERVIEW_KIND_COLORS[kind] }}
              onClick={() => setKindFilter(kind)}
            >
              {OVERVIEW_KIND_LABELS[kind]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="inspector-refresh"
          onClick={() => stateRef.current?.requestObjectList(kindFilter === 'all' ? undefined : kindFilter)}
        >
          Refresh
        </button>
      </aside>
      <div className="objects-list-pane">
        <table className="objects-table">
          <thead>
            <tr>
              <th>Id</th>
              <th>Kind</th>
              <th>Label</th>
              <th>Tag</th>
              <th>Template</th>
              <th>XYZ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr
                key={`${e.kind}:${e.id}:${e.tag}`}
                className={selectedId === e.id ? 'selected' : ''}
                onClick={() => onSelect(e)}
              >
                <td>{e.id}</td>
                <td style={{ color: OVERVIEW_KIND_COLORS[e.kind] }}>{e.kind}</td>
                <td>{e.label}</td>
                <td>{e.tag}</td>
                <td>{e.templateResRef}</td>
                <td>{`${e.x.toFixed(1)}, ${e.y.toFixed(1)}, ${e.z.toFixed(1)}`}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={6} className="inspector-empty">No objects</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <aside className="objects-detail-pane">
        {!detail ? (
          <div className="inspector-empty">Select an object</div>
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
              <SectionView key={section.id} section={section} onScriptRow={openScriptRow} />
            ))}
          </>
        )}
      </aside>
    </div>
  );
};
