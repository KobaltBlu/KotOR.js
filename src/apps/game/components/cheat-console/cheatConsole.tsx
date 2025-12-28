import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import './cheat-console.scss';

export const CheatConsole = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [gameKey] = appContext.gameKey;
  const [showCheatConsole, setShowCheatConsole] = appContext.showCheatConsole;
  const [showPerformanceMonitor] = appContext.showPerformanceMonitor;
  const [consoleInput, setConsoleInput] = useState('');

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

  return (
    <div className={`console on ${gameKey}`}>
      <div className="console-buttons">
        <button className="console-btn" onClick={onToggleDebugger}>Debugger</button>
        <button className="console-btn" onClick={onTogglePerformanceMonitor}>Toggle Stats</button>
        <button className="console-btn" onClick={onReloadLastSave}>Reload Last Save</button>
      </div>
      <input className="console-input" type="text" value={consoleInput} onChange={onConsoleInput} onKeyDown={onConsoleSubmit} />
    </div>
  );
};
