import React, { useEffect, useState } from "react";
import { useApp } from "@apps/debugger/context/AppContext";
import type { ModuleAreaSnapshot } from "@engine/debug/inspect/runtimeSnapshots";

function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="inspector-card">
      <div className="inspector-card-label">{label}</div>
      <div className="inspector-card-value">{value ?? '—'}</div>
    </div>
  );
}

export const ModuleActivity: React.FC = () => {
  const { stateRef, moduleSnapshot } = useApp();
  const [snap, setSnap] = useState<ModuleAreaSnapshot | null>(moduleSnapshot);

  useEffect(() => {
    setSnap(moduleSnapshot);
  }, [moduleSnapshot]);

  useEffect(() => {
    const state = stateRef.current;
    state?.requestModuleSnapshot();
    const onSnap = (next: ModuleAreaSnapshot | null) => setSnap(next);
    state?.addEventListener('module-snapshot', onSnap);
    return () => state?.removeEventListener('module-snapshot', onSnap);
  }, [stateRef]);

  if(!snap || !snap.loaded){
    return (
      <div className="inspector-activity module-activity">
        <div className="inspector-empty">No module loaded</div>
        <button type="button" className="inspector-refresh" onClick={() => stateRef.current?.requestModuleSnapshot()}>
          Refresh
        </button>
      </div>
    );
  }

  const counts = snap.objectCounts;

  return (
    <div className="inspector-activity module-activity">
      <div className="inspector-activity-toolbar">
        <h2>Module / Area</h2>
        <button type="button" className="inspector-refresh" onClick={() => stateRef.current?.requestModuleSnapshot()}>
          Refresh
        </button>
      </div>
      <div className="inspector-card-grid">
        <Card label="Module file" value={snap.moduleFilename} />
        <Card label="Module name" value={snap.moduleName} />
        <Card label="Module tag" value={snap.moduleTag} />
        <Card label="Entry area" value={snap.entryArea} />
        <Card label="Area resref" value={snap.areaResRef} />
        <Card label="Area name" value={snap.areaName} />
        <Card label="Area tag" value={snap.areaTag} />
        <Card label="Time" value={snap.time} />
        <Card label="Day phase" value={snap.dayPhase} />
        <Card label="Dawn / Dusk" value={`${snap.dawnHour} / ${snap.duskHour}`} />
        <Card label="Calendar" value={snap.calendar} />
        <Card label="Weather" value={snap.weather || '—'} />
        <Card label="Rooms" value={snap.rooms} />
        <Card label="Day/Night cycle" value={snap.dayNightCycle ? 'Yes' : 'No'} />
        <Card label="No rest" value={snap.noRest ? 'Yes' : 'No'} />
        <Card label="Party gold" value={snap.partyGold} />
        <Card label="Party size" value={snap.partySize} />
      </div>
      <h3 className="inspector-section-title">Object counts</h3>
      <div className="inspector-card-grid counts">
        <Card label="Creatures" value={counts.creatures} />
        <Card label="Doors" value={counts.doors} />
        <Card label="Placeables" value={counts.placeables} />
        <Card label="Triggers" value={counts.triggers} />
        <Card label="Waypoints" value={counts.waypoints} />
        <Card label="Sounds" value={counts.sounds} />
        <Card label="Stores" value={counts.stores} />
        <Card label="Encounters" value={counts.encounters} />
        <Card label="Items" value={counts.items} />
      </div>
    </div>
  );
};
