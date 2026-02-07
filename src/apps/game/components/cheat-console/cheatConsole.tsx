import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { EngineDebugType } from "../../../../enums/engine/EngineDebugType";
import './cheat-console.scss';
import * as KotOR from "../../KotOR";

export const CheatConsole = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [gameKey] = appContext.gameKey;
  const [showCheatConsole, setShowCheatConsole] = appContext.showCheatConsole;
  const [showPerformanceMonitor] = appContext.showPerformanceMonitor;
  const [consoleInput, setConsoleInput] = useState('');
  const [debugTick, setDebugTick] = useState(0);
  const [showDebugMenu, setShowDebugMenu] = useState(false);

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
    setShowDebugMenu(!showDebugMenu);
  }

  const formatDebugLabel = (label: string) => label.replace(/_/g, ' ');

  return (
    <div className={`console on ${gameKey}`}>
      <div className="console-buttons">
        <button className="console-btn" onClick={onToggleDebugger}>Debugger</button>
        <button className="console-btn" onClick={onTogglePerformanceMonitor}>Toggle Stats</button>
        <button className="console-btn" onClick={onReloadLastSave}>Reload Last Save</button>
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
            </div>
          )}
        </div>
      </div>
      <input className="console-input" type="text" value={consoleInput} onChange={onConsoleInput} onKeyDown={onConsoleSubmit} />
    </div>
  );
};
