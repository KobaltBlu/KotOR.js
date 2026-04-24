import React, { useState } from 'react';
import { useApp } from '@/apps/game/context/AppContext';
import { EngineDebugType } from '@/enums/engine/EngineDebugType';
import '@/apps/game/components/cheat-console/cheat-console.scss';
import * as KotOR from '@/apps/game/KotOR';

export const CheatConsole = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [gameKey] = appContext.gameKey;
  const [showCheatConsole, setShowCheatConsole] = appContext.showCheatConsole;
  const [showPerformanceMonitor] = appContext.showPerformanceMonitor;
  const [consoleInput, setConsoleInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCheatConsole) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [showCheatConsole]);

  const onConsoleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConsoleInput(e.target.value);
  };

  const onConsoleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      appState.consoleCommand(consoleInput);
      setConsoleInput('');
      setShowCheatConsole(false);
    }
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

  return (
    <div className={`console on ${gameKey}`}>
      <div className="console-buttons">
        <button type="button" className="console-btn" onClick={onToggleDebugger}>
          Debugger
        </button>
        <button type="button" className="console-btn" onClick={onTogglePerformanceMonitor}>
          Toggle Stats
        </button>
        <button type="button" className="console-btn" onClick={onReloadLastSave}>
          Reload Last Save
        </button>
      </div>
      <label htmlFor="console-input" className="visually-hidden">
        Console Command Input
      </label>
      <input
        id="console-input"
        ref={inputRef}
        className="console-input"
        type="text"
        value={consoleInput}
        onChange={onConsoleInput}
        onKeyDown={onConsoleSubmit}
        title="Enter a console command"
        placeholder="Enter a console command"
        aria-label="Console Command Input"
      />
    </div>
  );
};
