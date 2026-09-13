import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "@/apps/debugger/context/AppContext";
import type { ScriptOwnerFilter } from "@/apps/debugger/states/DebuggerState";
import * as KotOR from "@/apps/debugger/KotOR";
import {
  OVERVIEW_KIND_COLORS,
  OVERVIEW_KIND_LABELS,
  type OverviewObjectKind,
} from "@/inspect/runtimeSnapshots";

const KIND_ORDER: OverviewObjectKind[] = [
  'party', 'creature', 'door', 'placeable', 'trigger', 'waypoint',
  'sound', 'store', 'encounter', 'item', 'area', 'module', 'other',
];

const UNASSIGNED_KEY = '__unassigned__';

function shortUuid(uuid: string): string {
  return (uuid || "").slice(0, 8);
}

function ownerBucketKey(instance: KotOR.NWScriptInstance): string {
  if(instance.ownerObjectId >= 0){
    return `id:${instance.ownerObjectId}`;
  }
  if(instance.ownerKind === 'module' || instance.ownerTag || instance.ownerLabel){
    return `meta:${instance.ownerKind || ''}:${instance.ownerTag || ''}:${instance.ownerLabel || ''}`;
  }
  return UNASSIGNED_KEY;
}

function slotKeyOf(instance: KotOR.NWScriptInstance): string {
  return instance.scriptKey || '—';
}

function instanceMatchesQuery(instance: KotOR.NWScriptInstance, q: string): boolean {
  if(!q){ return true; }
  const hay = [
    instance.name,
    instance.uuid,
    shortUuid(instance.uuid),
    instance.ownerTag,
    instance.ownerLabel,
    instance.ownerKind,
    String(instance.ownerObjectId >= 0 ? instance.ownerObjectId : ''),
    instance.scriptKey,
  ].join(' ').toLowerCase();
  return hay.includes(q);
}

function buildChildMap(
  instances: KotOR.NWScriptInstance[],
  parentMap: Map<string, Set<string>>,
  instanceMap: Map<string, KotOR.NWScriptInstance>
): { roots: KotOR.NWScriptInstance[]; childrenOf: Map<string, KotOR.NWScriptInstance[]> } {
  const byUuid = new Map(instances.map((inst) => [inst.uuid, inst]));
  const childrenOf = new Map<string, KotOR.NWScriptInstance[]>();

  for(const inst of instances){
    const childIds = parentMap.get(inst.uuid);
    if(!childIds?.size){ continue; }
    const kids: KotOR.NWScriptInstance[] = [];
    for(const childId of childIds){
      const child = byUuid.get(childId) || instanceMap.get(childId);
      if(child && byUuid.has(child.uuid)){
        kids.push(child);
      }
    }
    if(kids.length){
      kids.sort((a, b) => (a.uuid > b.uuid ? 1 : a.uuid < b.uuid ? -1 : 0));
      childrenOf.set(inst.uuid, kids);
    }
  }

  const childUuids = new Set<string>();
  for(const kids of childrenOf.values()){
    for(const kid of kids){ childUuids.add(kid.uuid); }
  }

  const roots = instances
    .filter((inst) => !childUuids.has(inst.uuid))
    .sort((a, b) => (a.uuid > b.uuid ? 1 : a.uuid < b.uuid ? -1 : 0));

  return { roots, childrenOf };
}

type OwnerGroup = {
  key: string;
  objectId: number;
  tag: string;
  label: string;
  kind: string;
  instances: KotOR.NWScriptInstance[];
};

type SlotGroup = {
  slot: string;
  resref: string;
  instances: KotOR.NWScriptInstance[];
};

const InstanceTreeItem: React.FC<{
  instance: KotOR.NWScriptInstance;
  depth: number;
  childrenOf: Map<string, KotOR.NWScriptInstance[]>;
  selectedInstance: KotOR.NWScriptInstance | undefined;
  onSelect: (instance: KotOR.NWScriptInstance) => void;
  query: string;
}> = ({ instance, depth, childrenOf, selectedInstance, onSelect, query }) => {
  const kids = childrenOf.get(instance.uuid) || [];
  const selected = instance.uuid === selectedInstance?.uuid;
  const selfMatch = instanceMatchesQuery(instance, query);
  const visibleKids = query
    ? kids.filter((kid) => {
        const stack = [kid];
        while(stack.length){
          const cur = stack.pop()!;
          if(instanceMatchesQuery(cur, query)){ return true; }
          const nested = childrenOf.get(cur.uuid);
          if(nested){ stack.push(...nested); }
        }
        return false;
      })
    : kids;

  if(query && !selfMatch && !visibleKids.length){
    return null;
  }

  return (
    <>
      <li
        className={`script-browser-list-instance-item ${selected ? "selected" : ""}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        title={instance.uuid}
        onClick={() => onSelect(instance)}
      >
        {depth > 0 ? <span className="script-browser-nest-mark">└</span> : null}
        <span className="script-browser-instance-id">{shortUuid(instance.uuid)}</span>
      </li>
      {visibleKids.map((kid) => (
        <InstanceTreeItem
          key={kid.uuid}
          instance={kid}
          depth={depth + 1}
          childrenOf={childrenOf}
          selectedInstance={selectedInstance}
          onSelect={onSelect}
          query={query}
        />
      ))}
    </>
  );
};

const SlotGroupItem: React.FC<{
  group: SlotGroup;
  parentMap: Map<string, Set<string>>;
  instanceMap: Map<string, KotOR.NWScriptInstance>;
  selectedInstance: KotOR.NWScriptInstance | undefined;
  onSelectInstance: (instance: KotOR.NWScriptInstance) => void;
  query: string;
  focused?: boolean;
}> = ({ group, parentMap, instanceMap, selectedInstance, onSelectInstance, query, focused }) => {
  const { roots, childrenOf } = useMemo(
    () => buildChildMap(group.instances, parentMap, instanceMap),
    [group.instances, parentMap, instanceMap]
  );

  const visibleRoots = query
    ? roots.filter((root) => {
        const stack = [root];
        while(stack.length){
          const cur = stack.pop()!;
          if(instanceMatchesQuery(cur, query)){ return true; }
          const nested = childrenOf.get(cur.uuid);
          if(nested){ stack.push(...nested); }
        }
        return false;
      })
    : roots;

  if(query && !visibleRoots.length){
    const slotHit = group.slot.toLowerCase().includes(query)
      || group.resref.toLowerCase().includes(query);
    if(!slotHit){ return null; }
  }

  return (
    <li className={`script-browser-slot-item ${focused ? 'focused' : ''}`}>
      <div className="script-browser-slot-header" title={`${group.slot} · ${group.resref}`}>
        <span className="script-browser-slot-key">{group.slot}</span>
        <span className="script-browser-slot-resref">{group.resref}</span>
      </div>
      <ul className="script-browser-list-instance-list">
        {(query && visibleRoots.length ? visibleRoots : roots).map((instance) => (
          <InstanceTreeItem
            key={instance.uuid}
            instance={instance}
            depth={0}
            childrenOf={childrenOf}
            selectedInstance={selectedInstance}
            onSelect={onSelectInstance}
            query={query}
          />
        ))}
      </ul>
    </li>
  );
};

const OwnerGroupItem: React.FC<{
  owner: OwnerGroup;
  parentMap: Map<string, Set<string>>;
  instanceMap: Map<string, KotOR.NWScriptInstance>;
  selectedInstance: KotOR.NWScriptInstance | undefined;
  onSelectInstance: (instance: KotOR.NWScriptInstance) => void;
  expanded: boolean;
  onToggle: () => void;
  query: string;
  focusScriptKey?: string;
  focusResref?: string;
}> = ({
  owner,
  parentMap,
  instanceMap,
  selectedInstance,
  onSelectInstance,
  expanded,
  onToggle,
  query,
  focusScriptKey,
  focusResref,
}) => {
  const slots = useMemo(() => {
    const map = new Map<string, SlotGroup>();
    for(const inst of owner.instances){
      const slot = slotKeyOf(inst);
      const resref = inst.name || '(unnamed)';
      const key = `${slot}::${resref}`;
      let g = map.get(key);
      if(!g){
        g = { slot, resref, instances: [] };
        map.set(key, g);
      }
      g.instances.push(inst);
    }
    return [...map.values()].sort((a, b) => {
      const sa = a.slot.localeCompare(b.slot);
      if(sa) return sa;
      return a.resref.localeCompare(b.resref);
    });
  }, [owner.instances]);

  const kind = (owner.kind || 'other') as OverviewObjectKind;
  const kindColor = OVERVIEW_KIND_COLORS[kind] || OVERVIEW_KIND_COLORS.other;
  const kindLabel = owner.key === UNASSIGNED_KEY
    ? 'Unassigned'
    : (OVERVIEW_KIND_LABELS[kind] || kind || 'Other').replace(/s$/, '') || kind;

  const titlePrimary = owner.key === UNASSIGNED_KEY
    ? 'Unassigned'
    : `${kindLabel} · ${owner.label || owner.tag || 'object'}`;

  const focusKeyLower = (focusScriptKey || '').toLowerCase();
  const focusResrefLower = (focusResref || '').toLowerCase();
  const isFocusedSlot = (slot: SlotGroup) => {
    if(!focusKeyLower && !focusResrefLower){ return false; }
    const slotMatch = focusKeyLower
      ? slot.slot.toLowerCase() === focusKeyLower
      : true;
    const resrefMatch = focusResrefLower
      ? slot.resref.toLowerCase() === focusResrefLower
      : true;
    return slotMatch && resrefMatch;
  };

  return (
    <li className={`script-browser-list-item script-browser-owner-item ${expanded ? "expanded" : "collapsed"}`}>
      <button
        type="button"
        className="script-browser-script-toggle script-browser-owner-toggle"
        onClick={onToggle}
        title={
          owner.key === UNASSIGNED_KEY
            ? 'No owner'
            : `${titlePrimary}${owner.tag ? ` · tag ${owner.tag}` : ''}${owner.objectId >= 0 ? ` · id ${owner.objectId}` : ''}`
        }
      >
        <span className="script-browser-chevron">{expanded ? "▼" : "▶"}</span>
        <span className="script-browser-owner-swatch" style={{ background: kindColor }} />
        <span className="script-browser-script-name script-browser-owner-title">
          <span className="script-browser-owner-primary">{titlePrimary}</span>
          {owner.key !== UNASSIGNED_KEY && owner.tag ? (
            <span className="script-browser-owner-tag">tag {owner.tag}</span>
          ) : null}
          {owner.key !== UNASSIGNED_KEY && owner.objectId >= 0 ? (
            <span className="script-browser-owner-id">id {owner.objectId}</span>
          ) : null}
        </span>
        <span className="script-browser-script-count">{owner.instances.length}</span>
      </button>
      {expanded ? (
        <ul className="script-browser-slot-list">
          {slots.map((slot) => (
            <SlotGroupItem
              key={`${slot.slot}::${slot.resref}`}
              group={slot}
              parentMap={parentMap}
              instanceMap={instanceMap}
              selectedInstance={selectedInstance}
              onSelectInstance={onSelectInstance}
              query={query}
              focused={isFocusedSlot(slot)}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
};

export const ScriptBrowserWindow = (props: {
  ownerFilter?: ScriptOwnerFilter | null;
} = {}) => {
  const { ownerFilter = null } = props;
  const appContext = useApp();
  const [instanceMap] = appContext.instanceMap;
  const [parentMap] = appContext.parentMap;
  const [selectedInstance] = appContext.selectedInstance;
  const setSelectedInstanceHelper = appContext.setSelectedInstanceHelper;
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<OverviewObjectKind | 'all'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const onSelectInstance = (instance: KotOR.NWScriptInstance) => {
    setSelectedInstanceHelper(instance);
  };

  const query = search.trim().toLowerCase();

  const owners = useMemo(() => {
    const all = [...instanceMap.values()];
    const filtered = all.filter((inst) => {
      if(ownerFilter && ownerFilter.objectId >= 0){
        return inst.ownerObjectId === ownerFilter.objectId;
      }
      if(ownerFilter && ownerFilter.objectId < 0){
        const tagMatch = ownerFilter.tag
          ? (inst.ownerTag || '').toLowerCase() === ownerFilter.tag.toLowerCase()
          : true;
        const kindMatch = ownerFilter.kind
          ? (inst.ownerKind || '') === ownerFilter.kind
          : true;
        return tagMatch && kindMatch;
      }
      if(kindFilter !== 'all'){
        const k = (inst.ownerKind || 'other') as OverviewObjectKind;
        if(ownerBucketKey(inst) === UNASSIGNED_KEY){
          return kindFilter === 'other';
        }
        return k === kindFilter;
      }
      return true;
    });

    const map = new Map<string, OwnerGroup>();
    for(const inst of filtered){
      const key = ownerBucketKey(inst);
      let g = map.get(key);
      if(!g){
        g = {
          key,
          objectId: inst.ownerObjectId,
          tag: inst.ownerTag || '',
          label: inst.ownerLabel || '',
          kind: inst.ownerKind || (key === UNASSIGNED_KEY ? '' : 'other'),
          instances: [],
        };
        map.set(key, g);
      }
      g.instances.push(inst);
    }

    let list = [...map.values()];
    if(query){
      list = list.filter((owner) => {
        const ownerHay = [
          owner.label,
          owner.tag,
          owner.kind,
          String(owner.objectId >= 0 ? owner.objectId : ''),
          owner.key === UNASSIGNED_KEY ? 'unassigned' : '',
        ].join(' ').toLowerCase();
        if(ownerHay.includes(query)){ return true; }
        return owner.instances.some((inst) => instanceMatchesQuery(inst, query));
      });
    }

    list.sort((a, b) => {
      if(a.key === UNASSIGNED_KEY) return 1;
      if(b.key === UNASSIGNED_KEY) return -1;
      const ka = KIND_ORDER.indexOf((a.kind || 'other') as OverviewObjectKind);
      const kb = KIND_ORDER.indexOf((b.kind || 'other') as OverviewObjectKind);
      if(ka !== kb) return (ka < 0 ? 999 : ka) - (kb < 0 ? 999 : kb);
      const la = (a.label || a.tag || '').localeCompare(b.label || b.tag || '');
      if(la) return la;
      return a.objectId - b.objectId;
    });
    return list;
  }, [instanceMap, ownerFilter, kindFilter, query]);

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      if(selectedInstance){
        const key = ownerBucketKey(selectedInstance);
        if(!next.has(key)){
          next.add(key);
          changed = true;
        }
      }
      if(ownerFilter){
        const match = owners.find((o) =>
          ownerFilter.objectId >= 0
            ? o.objectId === ownerFilter.objectId
            : o.tag === ownerFilter.tag
        );
        if(match && !next.has(match.key)){
          next.add(match.key);
          changed = true;
        }
      }
      if(query){
        for(const owner of owners){
          if(!next.has(owner.key)){
            next.add(owner.key);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [selectedInstance, ownerFilter, query, owners]);

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if(next.has(key)){ next.delete(key); }
      else { next.add(key); }
      return next;
    });
  };

  return (
    <div className="script-debugger-scripts">
      <div className="title">
        <span>Scripts</span>
      </div>
      <div className="content">
        <div className="script-browser-toolbar">
          <input
            className="inspector-search script-browser-search"
            type="search"
            placeholder="Filter tag / name / id / slot…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="script-browser-kind-chips">
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
                title={OVERVIEW_KIND_LABELS[kind]}
              >
                {OVERVIEW_KIND_LABELS[kind].replace(/s$/, '')}
              </button>
            ))}
          </div>
        </div>
        {owners.length === 0 ? (
          <div className="script-browser-empty">No matching scripts</div>
        ) : (
          <ul className="script-browser-list">
            {owners.map((owner) => (
              <OwnerGroupItem
                key={owner.key}
                owner={owner}
                parentMap={parentMap}
                instanceMap={instanceMap}
                selectedInstance={selectedInstance}
                onSelectInstance={onSelectInstance}
                expanded={expanded.has(owner.key)}
                onToggle={() => toggleExpanded(owner.key)}
                query={query}
                focusScriptKey={ownerFilter?.scriptKey}
                focusResref={ownerFilter?.resref}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
