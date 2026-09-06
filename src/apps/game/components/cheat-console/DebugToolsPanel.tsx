import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "@/apps/game/context/AppContext";
import { EngineDebugType } from "@/enums/engine/EngineDebugType";
import * as KotOR from "@/apps/game/KotOR";

type SectionId = 'tools' | 'warp' | 'general' | 'walkmesh' | 'lightingViz' | 'combat' | 'lighting';

const DEBUG_GROUPS: { id: SectionId; label: string; types: EngineDebugType[] }[] = [
  {
    id: 'general',
    label: 'General',
    types: [
      EngineDebugType.OBJECT_LABELS,
      EngineDebugType.PATH_FINDING,
    ],
  },
  {
    id: 'walkmesh',
    label: 'Walkmesh',
    types: [
      EngineDebugType.ROOM_WALKMESH,
      EngineDebugType.DOOR_WALKMESH,
      EngineDebugType.PLACEABLE_WALKMESH,
      EngineDebugType.COLLISION_HELPERS,
    ],
  },
  {
    id: 'lightingViz',
    label: 'Lighting Viz',
    types: [
      EngineDebugType.LIGHT_HELPERS,
      EngineDebugType.LIGHT_HELPERS_BOUND_ONLY,
      EngineDebugType.SHADOW_LIGHTS,
    ],
  },
];

const DEBUG_LABEL_OVERRIDES: Partial<Record<EngineDebugType, string>> = {
  [EngineDebugType.LIGHT_HELPERS_BOUND_ONLY]: 'Bound lights only',
};

const PC_DAMAGE_SCALE_PRESETS = [1, 0.5, 0.25, 0.1, 0];

const DEFAULT_OPEN: Record<SectionId, boolean> = {
  tools: true,
  warp: false,
  general: true,
  walkmesh: false,
  lightingViz: false,
  combat: false,
  lighting: false,
};

function formatDebugLabel(label: string) {
  return label.replace(/_/g, ' ');
}

function debugToggleLabel(type: EngineDebugType) {
  return DEBUG_LABEL_OVERRIDES[type] ?? formatDebugLabel(type);
}

interface ConsoleToggleProps {
  active: boolean;
  onClick: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

/** Boolean toggle with an explicit ON/OFF badge (distinct from action buttons). */
const ConsoleToggle: React.FC<ConsoleToggleProps> = ({
  active,
  onClick,
  title,
  className,
  children,
}) => (
  <button
    type="button"
    className={`console-btn console-btn-small console-toggle ${active ? 'on' : 'off'}${className ? ` ${className}` : ''}`}
    onClick={onClick}
    title={title}
    aria-pressed={active}
  >
    <span className="console-toggle-pip" aria-hidden="true" />
    <span className="console-toggle-label">{children}</span>
    <span className="console-toggle-state">{active ? 'ON' : 'OFF'}</span>
  </button>
);

interface CollapsibleSectionProps {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  open,
  onToggle,
  children,
}) => (
  <div className={`debug-tools-section ${open ? 'open' : ''}`}>
    <button
      type="button"
      className="debug-tools-section-header"
      onClick={() => onToggle(id)}
      aria-expanded={open}
    >
      <span className="debug-tools-section-title">{title}</span>
      <span className="debug-tools-section-chevron">{open ? '▼' : '▶'}</span>
    </button>
    {open && (
      <div className="debug-tools-section-body">
        {children}
      </div>
    )}
  </div>
);

export const DebugToolsPanel: React.FC = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [, setShowCheatConsole] = appContext.showCheatConsole;
  const [debugTick, setDebugTick] = useState(0);
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>(DEFAULT_OPEN);
  const [modules, setModules] = useState<string[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [warpFilter, setWarpFilter] = useState('');

  useEffect(() => {
    if(modulesLoaded){ return; }
    let cancelled = false;
    setModulesLoading(true);
    KotOR.CheatConsoleManager.listModules().then((list) => {
      if(cancelled){ return; }
      setModules(list);
      setModulesLoaded(true);
      setModulesLoading(false);
    }).catch((e) => {
      console.error(e);
      if(cancelled){ return; }
      setModulesLoaded(true);
      setModulesLoading(false);
    });
    return () => { cancelled = true; };
  }, [modulesLoaded]);

  const filteredModules = useMemo(() => {
    const query = warpFilter.trim().toLowerCase();
    if(!query){ return modules; }
    return modules.filter((name) => name.includes(query));
  }, [modules, warpFilter]);

  const currentModule = (KotOR.GameState.module?.filename || '').toLowerCase();
  const moduleSubtitle = KotOR.GameState.module?.filename
    || KotOR.GameState.module?.area?.name
    || 'No module loaded';

  const bumpDebug = () => setDebugTick((t) => t + 1);

  const onToggleSection = (id: SectionId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const onClose = () => {
    setShowCheatConsole(false);
  };

  const onToggleDebugger = () => {
    appState.toggleDebugger();
    setShowCheatConsole(false);
  };

  const onTogglePerformanceMonitor = () => {
    appState.togglePerformanceMonitor();
    setShowCheatConsole(false);
  };

  const onReloadLastSave = () => {
    appState.reloadLastSave();
    setShowCheatConsole(false);
  };

  const onToggleDebugState = (type: EngineDebugType) => {
    KotOR.GameState.ToggleDebugState(type);
    bumpDebug();
  };

  const onWarpModule = (name: string) => {
    appState.consoleCommand(`warp ${name}`);
    setShowCheatConsole(false);
  };

  const onSetPcDamageScale = (value: number) => {
    const next = Number.isFinite(value) ? Math.max(0, value) : 1;
    KotOR.GameState.DEBUG_PC_DAMAGE_SCALE = next;
    bumpDebug();
  };

  const onSetLightingDebug = (key: KotOR.OdysseyLightingDebugKey, value: number) => {
    if(!Number.isFinite(value)){ return; }
    KotOR.OdysseyLightingDebug.set(key, value);
    bumpDebug();
  };

  const onResetLightingDebug = () => {
    KotOR.OdysseyLightingDebug.reset();
    bumpDebug();
  };

  const onToggleFloatyAllAttackers = () => {
    KotOR.GameState.DEBUG_COMBAT_FLOATY_ALL_ATTACKERS = !KotOR.GameState.DEBUG_COMBAT_FLOATY_ALL_ATTACKERS;
    bumpDebug();
  };

  const onToggleShipBuild = () => {
    KotOR.CheatConsoleManager.shipBuild();
    bumpDebug();
  };

  // Touch debugTick so toggles re-render.
  void debugTick;

  const pcDamageScale = KotOR.GameState.DEBUG_PC_DAMAGE_SCALE;
  const floatyAllAttackers = KotOR.GameState.DEBUG_COMBAT_FLOATY_ALL_ATTACKERS;
  const shipBuild = KotOR.GameState.shipBuild;

  return (
    <div className="debug-tools-panel">
      <div className="debug-tools-chrome">
        <div className="debug-tools-chrome-text">
          <div className="debug-tools-title">Debug Console</div>
          <div className="debug-tools-subtitle" title={moduleSubtitle}>{moduleSubtitle}</div>
        </div>
        <button type="button" className="debug-tools-close" onClick={onClose}>Close</button>
      </div>

      <div className="debug-tools-body">
        <CollapsibleSection
          id="tools"
          title="Tools"
          open={openSections.tools}
          onToggle={onToggleSection}
        >
          <div className="debug-tools-btn-row">
            <button type="button" className="console-btn console-btn-small" onClick={onToggleDebugger}>
              Dev Tools
            </button>
            <button type="button" className="console-btn console-btn-small" onClick={onTogglePerformanceMonitor}>
              Toggle Stats
            </button>
            <button type="button" className="console-btn console-btn-small" onClick={onReloadLastSave}>
              Reload Last Save
            </button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="warp"
          title="Warp"
          open={openSections.warp}
          onToggle={onToggleSection}
        >
          <input
            className="console-filter-input"
            type="text"
            placeholder="Filter modules..."
            value={warpFilter}
            onChange={(e) => setWarpFilter(e.target.value)}
          />
          <div className="console-warp-list">
            {modulesLoading && (
              <div className="console-warp-empty">Loading modules...</div>
            )}
            {!modulesLoading && filteredModules.length === 0 && (
              <div className="console-warp-empty">No modules found</div>
            )}
            {!modulesLoading && filteredModules.map((name) => (
              <button
                key={name}
                type="button"
                className={`console-btn console-btn-small console-warp-item console-choice ${currentModule === name ? 'on' : 'off'}`}
                onClick={() => onWarpModule(name)}
                title={`warp ${name}`}
                aria-pressed={currentModule === name}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="console-warp-count">
            {modulesLoading ? '…' : `${filteredModules.length} / ${modules.length}`}
          </div>
        </CollapsibleSection>

        {DEBUG_GROUPS.map((group) => (
          <CollapsibleSection
            key={group.id}
            id={group.id}
            title={group.label}
            open={openSections[group.id]}
            onToggle={onToggleSection}
          >
            <div className="debug-tools-btn-row">
              {group.types.map((type) => (
                <ConsoleToggle
                  key={type}
                  active={KotOR.GameState.GetDebugState(type)}
                  onClick={() => onToggleDebugState(type)}
                >
                  {debugToggleLabel(type)}
                </ConsoleToggle>
              ))}
            </div>
            {group.id === 'general' && (
              <div className="debug-tools-btn-row">
                <ConsoleToggle
                  active={shipBuild}
                  onClick={onToggleShipBuild}
                  className="flex-1"
                  title="When on (default), NWScript ShipBuild() returns TRUE (retail shipping). Off = debug-capable build."
                >
                  Ship Build
                </ConsoleToggle>
              </div>
            )}
          </CollapsibleSection>
        ))}

        <CollapsibleSection
          id="combat"
          title="Combat"
          open={openSections.combat}
          onToggle={onToggleSection}
        >
          <div className="console-submenu-row">
            <label className="console-submenu-label" htmlFor="pc-damage-scale">
              PC Damage Scale
            </label>
            <input
              id="pc-damage-scale"
              className="console-number-input"
              type="number"
              min={0}
              max={10}
              step={0.05}
              value={pcDamageScale}
              onChange={(e) => onSetPcDamageScale(parseFloat(e.target.value))}
            />
          </div>
          <div className="debug-tools-btn-row">
            {PC_DAMAGE_SCALE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`console-btn console-btn-small console-choice ${pcDamageScale === preset ? 'on' : 'off'}`}
                onClick={() => onSetPcDamageScale(preset)}
                aria-pressed={pcDamageScale === preset}
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="debug-tools-btn-row">
            <ConsoleToggle
              active={floatyAllAttackers}
              onClick={onToggleFloatyAllAttackers}
              className="flex-1"
              title="When on, combat floaties show for any attacker (pre-retail). Off = player attacker only."
            >
              Floaty All Attackers
            </ConsoleToggle>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="lighting"
          title="Lighting Tunables"
          open={openSections.lighting}
          onToggle={onToggleSection}
        >
          <div className="console-lighting-tunables">
            {KotOR.ODYSSEY_LIGHTING_DEBUG_KEYS.map((key) => (
              <div key={key} className="console-submenu-row">
                <label className="console-submenu-label" htmlFor={`lighting-${key}`} title={key}>
                  {key}
                </label>
                <input
                  id={`lighting-${key}`}
                  className="console-number-input console-number-input-wide"
                  type="number"
                  step="any"
                  value={KotOR.OdysseyLightingDebug.get(key)}
                  onChange={(e) => onSetLightingDebug(key, parseFloat(e.target.value))}
                />
              </div>
            ))}
          </div>
          <div className="debug-tools-btn-row">
            <button
              type="button"
              className="console-btn console-btn-small flex-1"
              onClick={onResetLightingDebug}
              title="Reset all lighting knobs to defaults (lightreset)"
            >
              Reset Lighting
            </button>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};
