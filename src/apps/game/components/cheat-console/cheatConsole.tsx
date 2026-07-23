import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "@/apps/game/context/AppContext";
import { EngineDebugType } from "@/enums/engine/EngineDebugType";
import "@/apps/game/components/cheat-console/cheat-console.scss";
import * as KotOR from "@/apps/game/KotOR";

export const CheatConsole = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [gameKey] = appContext.gameKey;
  const [showCheatConsole, setShowCheatConsole] = appContext.showCheatConsole;
  const [showPerformanceMonitor] = appContext.showPerformanceMonitor;
  const [consoleInput, setConsoleInput] = useState('');
  const [debugTick, setDebugTick] = useState(0);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [showWarpMenu, setShowWarpMenu] = useState(false);
  const [modules, setModules] = useState<string[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [warpFilter, setWarpFilter] = useState('');

  const debugGroups = [
    {
      label: 'General',
      types: [
        // EngineDebugType.CONTROLS,
        // EngineDebugType.SELECTED_OBJECT,
        EngineDebugType.OBJECT_LABELS,
        EngineDebugType.PATH_FINDING
      ]
    },
    {
      label: 'Walkmesh',
      types: [
        EngineDebugType.ROOM_WALKMESH,
        EngineDebugType.DOOR_WALKMESH,
        EngineDebugType.PLACEABLE_WALKMESH,
        EngineDebugType.COLLISION_HELPERS
      ]
    },
    {
      label: 'Lighting',
      types: [
        EngineDebugType.LIGHT_HELPERS,
        EngineDebugType.SHADOW_LIGHTS
      ]
    }
  ];

  const pcDamageScalePresets = [1, 0.5, 0.25, 0.1, 0];

  useEffect(() => {
    if(!showWarpMenu || modulesLoaded){ return; }
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
  }, [showWarpMenu, modulesLoaded]);

  const filteredModules = useMemo(() => {
    const query = warpFilter.trim().toLowerCase();
    if(!query){ return modules; }
    return modules.filter((name) => name.includes(query));
  }, [modules, warpFilter]);

  const currentModule = (KotOR.GameState.module?.filename || '').toLowerCase();

  const onConsoleInput = (e: React.ChangeEvent<HTMLInputElement>) => {  
    setConsoleInput(e.target.value);
  }

  const onConsoleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      appState.consoleCommand(consoleInput);
      setConsoleInput('');
      setShowCheatConsole(false);
    }
  }

  const onToggleDebugger = () => {
    appState.toggleDebugger();
    setShowCheatConsole(false);
  }

  const onTogglePerformanceMonitor = () => {
    appState.togglePerformanceMonitor();
    setShowCheatConsole(false);
  }

  const onReloadLastSave = () => {
    appState.reloadLastSave();
    setShowCheatConsole(false);
  }

  const onToggleDebugState = (type: EngineDebugType) => {
    KotOR.GameState.ToggleDebugState(type);
    setDebugTick(debugTick + 1);
  }
  
  const onToggleDebugMenu = () => {
    setShowWarpMenu(false);
    setShowDebugMenu(!showDebugMenu);
  }

  const onToggleWarpMenu = () => {
    setShowDebugMenu(false);
    setShowWarpMenu(!showWarpMenu);
  }

  const onWarpModule = (name: string) => {
    appState.consoleCommand(`warp ${name}`);
    setShowCheatConsole(false);
  }

  const onSetPcDamageScale = (value: number) => {
    const next = Number.isFinite(value) ? Math.max(0, value) : 1;
    KotOR.GameState.DEBUG_PC_DAMAGE_SCALE = next;
    setDebugTick(debugTick + 1);
  }

  const formatDebugLabel = (label: string) => label.replace(/_/g, ' ');
  const pcDamageScale = KotOR.GameState.DEBUG_PC_DAMAGE_SCALE;

  return (
    <div className={`console on ${gameKey}`}>
      <div className="console-buttons">
        <button className="console-btn" onClick={onToggleDebugger}>Debugger</button>
        <button className="console-btn" onClick={onTogglePerformanceMonitor}>Toggle Stats</button>
        <button className="console-btn" onClick={onReloadLastSave}>Reload Last Save</button>
        <div className="console-menu-anchor">
          <button className="console-btn" onClick={onToggleWarpMenu}>
            Warp {showWarpMenu ? '▲' : '▼'}
          </button>
          {showWarpMenu && (
            <div className="console-submenu console-warp-browser">
              <div className="console-submenu-title">Module Warp</div>
              <input
                className="console-filter-input"
                type="text"
                placeholder="Filter modules..."
                value={warpFilter}
                onChange={(e) => setWarpFilter(e.target.value)}
                autoFocus
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
                    className={`console-btn console-btn-small console-warp-item ${currentModule === name ? 'on' : 'off'}`}
                    onClick={() => onWarpModule(name)}
                    title={`warp ${name}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="console-warp-count">
                {modulesLoading ? '…' : `${filteredModules.length} / ${modules.length}`}
              </div>
            </div>
          )}
        </div>
        <div className="console-menu-anchor">
          <button className="console-btn" onClick={onToggleDebugMenu}>
            Debug {showDebugMenu ? '▲' : '▼'}
          </button>
          {showDebugMenu && (
            <div className="console-submenu">
              {debugGroups.map((group) => (
                <div key={group.label} className="console-submenu-group">
                  <div className="console-submenu-title">{group.label}</div>
                  <div className="console-submenu-buttons">
                    {group.types.map((type) => (
                      <button
                        key={type}
                        className={`console-btn console-btn-small flex-1 ${KotOR.GameState.GetDebugState(type) ? 'on' : 'off'}`}
                        onClick={() => onToggleDebugState(type)}
                      >
                        {formatDebugLabel(type)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="console-submenu-group">
                <div className="console-submenu-title">Combat</div>
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
                <div className="console-submenu-buttons">
                  {pcDamageScalePresets.map((preset) => (
                    <button
                      key={preset}
                      className={`console-btn console-btn-small ${pcDamageScale === preset ? 'on' : 'off'}`}
                      onClick={() => onSetPcDamageScale(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <input className="console-input" type="text" value={consoleInput} onChange={onConsoleInput} onKeyDown={onConsoleSubmit} />
    </div>
  );
};
