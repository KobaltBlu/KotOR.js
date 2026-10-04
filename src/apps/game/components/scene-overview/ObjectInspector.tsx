import React, { useCallback, useEffect, useState } from "react";
import type { ModuleObject } from "@engine/module/ModuleObject";
import {
  dumpLiveGff,
  flattenGffTemplate,
  INSPECTOR_DEFAULT_OPEN,
  OVERVIEW_KIND_COLORS,
  OVERVIEW_PC_COLOR,
  snapshotLiveObject,
  type GffTreeNode,
  type InspectorSection,
  type LiveObjectSnapshot,
} from "./object-overview-utils";

export interface ObjectInspectorProps {
  object: ModuleObject | null;
}

const GffNodeView: React.FC<{ node: GffTreeNode; depth?: number }> = ({ node, depth = 0 }) => {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = !!(node.children && node.children.length);
  return (
    <div className="scene-overview-gff-node" style={{ marginLeft: depth * 10 }}>
      <div
        className={`scene-overview-gff-row ${hasChildren ? 'has-children' : ''}`}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (open ? '▼ ' : '▶ ') : '• '}
        <span className="scene-overview-gff-label">{node.label}</span>
        <span className="scene-overview-gff-type">{node.typeName}</span>
        {node.valueText != null && node.valueText !== '' && (
          <span className="scene-overview-gff-value">{node.valueText}</span>
        )}
      </div>
      {hasChildren && open && node.children!.map((c) => (
        <GffNodeView key={c.key} node={c} depth={depth + 1} />
      ))}
    </div>
  );
};

const KvRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const onClick = useCallback(() => {
    try{
      void navigator.clipboard?.writeText(value);
    }catch{ /* ignore */ }
  }, [value]);

  return (
    <div className="scene-overview-kv" title="Click to copy" onClick={onClick}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
};

const CollapsibleSection: React.FC<{
  title: string;
  sectionId: string;
  defaultOpen?: boolean;
  note?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, sectionId, defaultOpen, note, headerExtra, children }) => {
  const [open, setOpen] = useState(
    defaultOpen ?? INSPECTOR_DEFAULT_OPEN[sectionId] ?? true
  );

  return (
    <div className={`scene-overview-section ${open ? 'open' : 'collapsed'}`}>
      <div className="scene-overview-section-head">
        <button
          type="button"
          className="scene-overview-section-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <span className="scene-overview-section-caret">{open ? '▼' : '▶'}</span>
          <span className="scene-overview-section-title">{title}</span>
        </button>
        {headerExtra}
      </div>
      {open && (
        <>
          {note && <div className="scene-overview-note">{note}</div>}
          {children}
        </>
      )}
    </div>
  );
};

const SectionRows: React.FC<{ section: InspectorSection }> = ({ section }) => (
  <CollapsibleSection title={section.title} sectionId={section.id}>
    {section.rows.map((row) => (
      <KvRow key={`${section.id}:${row.label}:${row.value}`} label={row.label} value={row.value} />
    ))}
  </CollapsibleSection>
);

export const ObjectInspector: React.FC<ObjectInspectorProps> = ({ object }) => {
  const [live, setLive] = useState<LiveObjectSnapshot | null>(null);
  const [gffTemplate, setGffTemplate] = useState<GffTreeNode[]>([]);
  const [gffLive, setGffLive] = useState<GffTreeNode[]>([]);
  const [liveGffError, setLiveGffError] = useState<string | null>(null);

  useEffect(() => {
    if(!object){
      setLive(null);
      setGffTemplate([]);
      setGffLive([]);
      setLiveGffError(null);
      return;
    }
    setGffTemplate(flattenGffTemplate(object));
    setGffLive([]);
    setLiveGffError(null);
    setLive(snapshotLiveObject(object));
    const id = window.setInterval(() => {
      setLive(snapshotLiveObject(object));
    }, 150);
    return () => window.clearInterval(id);
  }, [object]);

  const onDumpLiveGff = useCallback(() => {
    if(!object){ return; }
    try{
      const nodes = dumpLiveGff(object);
      setGffLive(nodes);
      setLiveGffError(nodes.length ? null : 'save() returned empty GFF');
      setGffTemplate(flattenGffTemplate(object));
    }catch(err){
      setGffLive([]);
      setLiveGffError(err instanceof Error ? err.message : String(err));
    }
  }, [object]);

  if(!object || !live){
    return (
      <div className="scene-overview-inspector empty">
        <div className="scene-overview-empty">Select an object on the map</div>
      </div>
    );
  }

  const isPc = !!(object as any).isPlayer || !!(object as any).getIsPC?.();
  const kindColor = isPc && live.kind === 'party'
    ? OVERVIEW_PC_COLOR
    : (OVERVIEW_KIND_COLORS[live.kind] || '#7f8c8d');

  return (
    <div className="scene-overview-inspector">
      <div className="scene-overview-inspector-header">
        <div className="scene-overview-inspector-title">{live.name || live.tag || 'Object'}</div>
        <div className="scene-overview-inspector-meta">
          <span
            className="scene-overview-kind-badge"
            style={{ borderColor: kindColor, color: kindColor }}
          >
            {live.type}
          </span>
          <span className="scene-overview-object-id">id {live.objectId}</span>
        </div>
      </div>

      {live.sections.map((section) => (
        <SectionRows key={section.id} section={section} />
      ))}

      <CollapsibleSection
        title="GFF Template"
        sectionId="gff-template"
        defaultOpen={false}
        note="Load-time template — may be stale vs runtime after gameplay changes"
      >
        {gffTemplate.length === 0 ? (
          <div className="scene-overview-empty">No template GFF on object</div>
        ) : (
          <div className="scene-overview-gff-tree">
            {gffTemplate.map((n) => <GffNodeView key={n.key} node={n} />)}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Live GFF"
        sectionId="gff-live"
        defaultOpen={false}
        note="Calls save() once — refreshes obj.template as a side effect"
        headerExtra={(
          <button
            type="button"
            className="scene-overview-dump-btn"
            onClick={onDumpLiveGff}
          >
            Dump
          </button>
        )}
      >
        {liveGffError && (
          <div className="scene-overview-empty">{liveGffError}</div>
        )}
        {!liveGffError && gffLive.length === 0 && (
          <div className="scene-overview-empty">Click Dump to capture live GFF</div>
        )}
        {gffLive.length > 0 && (
          <div className="scene-overview-gff-tree">
            {gffLive.map((n) => <GffNodeView key={n.key} node={n} />)}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};
