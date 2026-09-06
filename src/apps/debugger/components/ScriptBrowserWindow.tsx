import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "@/apps/debugger/context/AppContext";
import * as KotOR from "@/apps/debugger/KotOR";

/**
 * Script Browser Window
 */

function shortUuid(uuid: string): string {
  return (uuid || "").slice(0, 8);
}

function instanceMatchesQuery(instance: KotOR.NWScriptInstance, q: string): boolean {
  if(!q){ return true; }
  const name = (instance.name || "").toLowerCase();
  const id = (instance.uuid || "").toLowerCase();
  return name.includes(q) || id.includes(q) || shortUuid(id).includes(q);
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
      // Only nest children that belong to this same script group.
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

const NWScriptListItem: React.FC<{
  script: KotOR.NWScript;
  parentMap: Map<string, Set<string>>;
  instanceMap: Map<string, KotOR.NWScriptInstance>;
  selectedInstance: KotOR.NWScriptInstance | undefined;
  onSelectInstance: (instance: KotOR.NWScriptInstance) => void;
  expanded: boolean;
  onToggle: () => void;
  query: string;
}> = ({
  script,
  parentMap,
  instanceMap,
  selectedInstance,
  onSelectInstance,
  expanded,
  onToggle,
  query,
}) => {
  const instances = script.instances || [];
  const { roots, childrenOf } = useMemo(
    () => buildChildMap(instances, parentMap, instanceMap),
    [instances, parentMap, instanceMap]
  );

  const nameMatch = !!query && script.name.toLowerCase().includes(query);
  const visibleRoots = query && !nameMatch
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

  const showGroup = !query
    || nameMatch
    || visibleRoots.length > 0
    || instances.some((inst) => instanceMatchesQuery(inst, query));

  if(!showGroup){
    return null;
  }

  return (
    <li className={`script-browser-list-item ${expanded ? "expanded" : "collapsed"}`}>
      <button
        type="button"
        className="script-browser-script-toggle"
        onClick={onToggle}
        title={script.name}
      >
        <span className="script-browser-chevron">{expanded ? "▼" : "▶"}</span>
        <span className="script-browser-script-name">{script.name}</span>
        <span className="script-browser-script-count">{instances.length}</span>
      </button>
      {expanded ? (
        <ul className="script-browser-list-instance-list">
          {visibleRoots.map((instance) => (
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
      ) : null}
    </li>
  );
};

export const ScriptBrowserWindow = (props: { nameFilter?: string[] } = {}) => {
  const { nameFilter = [] } = props;
  const appContext = useApp();
  const [scriptMap] = appContext.scriptMap;
  const [instanceMap] = appContext.instanceMap;
  const [parentMap] = appContext.parentMap;
  const [selectedInstance] = appContext.selectedInstance;
  const setSelectedInstanceHelper = appContext.setSelectedInstanceHelper;
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const onSelectInstance = (instance: KotOR.NWScriptInstance) => {
    setSelectedInstanceHelper(instance);
  };

  const query = search.trim().toLowerCase();

  const names = useMemo(() => {
    const filterSet = nameFilter.length
      ? new Set(nameFilter.map((n) => n.toLowerCase()))
      : null;
    return [...scriptMap.keys()]
      .sort((a, b) => (a > b ? 1 : b > a ? -1 : 0))
      .filter((name) => {
        if(!filterSet){ return true; }
        return filterSet.has(name.toLowerCase())
          || [...filterSet].some((f) => name.toLowerCase().includes(f) || f.includes(name.toLowerCase()));
      });
  }, [scriptMap, nameFilter]);

  // Auto-expand selected script and search hits.
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      let changed = false;
      if(selectedInstance?.name && names.includes(selectedInstance.name)){
        if(!next.has(selectedInstance.name)){
          next.add(selectedInstance.name);
          changed = true;
        }
      }
      if(query){
        for(const name of names){
          const script = scriptMap.get(name);
          if(!script){ continue; }
          const hit = name.toLowerCase().includes(query)
            || script.instances.some((inst) => instanceMatchesQuery(inst, query));
          if(hit && !next.has(name)){
            next.add(name);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [selectedInstance, query, names, scriptMap]);

  const toggleExpanded = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if(next.has(name)){ next.delete(name); }
      else { next.add(name); }
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
            placeholder="Filter scripts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ul className="script-browser-list">
          {names.map((scriptName) => {
            const script = scriptMap.get(scriptName);
            if(!script){ return <React.Fragment key={scriptName} />; }
            return (
              <NWScriptListItem
                key={scriptName}
                script={script}
                parentMap={parentMap}
                instanceMap={instanceMap}
                selectedInstance={selectedInstance}
                onSelectInstance={onSelectInstance}
                expanded={expanded.has(scriptName)}
                onToggle={() => toggleExpanded(scriptName)}
                query={query}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
};
