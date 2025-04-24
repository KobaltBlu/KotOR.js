import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import './cheat-console.scss';

export const CheatConsole = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [gameKey] = appContext.gameKey;
  const [showPerformanceMonitor] = appContext.showPerformanceMonitor;
  const [consoleInput, setConsoleInput] = useState('');

  const handleConsoleInput = (e: React.ChangeEvent<HTMLInputElement>) => {  
    setConsoleInput(e.target.value);
  }

  const handleConsoleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      appState.consoleCommand(consoleInput);
      setConsoleInput('');
    }
  }

  return (
    <div className={`console on ${gameKey}`}>
      <div className="console-buttons">
        <button className="console-btn" onClick={() => appState.togglePerformanceMonitor()}>Toggle Stats</button>
      </div>
      <input className="console-input" type="text" value={consoleInput} onChange={handleConsoleInput} onKeyDown={handleConsoleSubmit} />
    </div>
  );
};
