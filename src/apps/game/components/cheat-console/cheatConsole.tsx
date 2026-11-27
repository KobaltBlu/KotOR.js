import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/apps/game/context/AppContext";
import { EngineDebugType } from "@/enums/engine/EngineDebugType";
import type { CheatCommandDefinition } from "@/managers/CheatConsoleManager";
import "@/apps/game/components/cheat-console/cheat-console.scss";
import * as KotOR from "@/apps/game/KotOR";

type StatusTone = 'info' | 'success' | 'error';

interface StatusToast {
  id: number;
  tone: StatusTone;
  message: string;
}

interface DumpProgressState extends KotOR.GameResourceDumpProgress {
  percentLabel: string;
}

interface DumpOptionsState extends KotOR.GameResourceDumpOptions {
  skipAudio: boolean;
  skipLip: boolean;
  skipModels: boolean;
  skipTextures: boolean;
}

type SuggestionMode =
  | { kind: 'commands'; items: CheatCommandDefinition[] }
  | { kind: 'args'; command: CheatCommandDefinition; items: string[] }
  | null;

export const CheatConsole = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [gameKey] = appContext.gameKey;
  const [, setShowCheatConsole] = appContext.showCheatConsole;
  const [showPerformanceMonitor, setShowPerformanceMonitor] = appContext.showPerformanceMonitor;
  const [consoleInput, setConsoleInput] = useState('');
  const [statusToast, setStatusToast] = useState<StatusToast | null>(null);
  const [debugTick, setDebugTick] = useState(0);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [forceShowAll, setForceShowAll] = useState(false);
  const [isDumpingGameFiles, setIsDumpingGameFiles] = useState(false);
  const [showDumpOptions, setShowDumpOptions] = useState(false);
  const [dumpProgress, setDumpProgress] = useState<DumpProgressState | null>(null);
  const [dumpOptions, setDumpOptions] = useState<DumpOptionsState>({
    skipAudio: false,
    skipLip: false,
    skipModels: false,
    skipTextures: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetGameInputState = () => {
    const keyboard = KotOR.GameState.controls?.keyboard;
    if (keyboard) {
      Object.values(keyboard.action).forEach((input) => {
        if (!input) return;
        input.down = false;
        input.pDown = false;
        input.pressed = false;
        input.repeating = false;
        input.repeatTimer = 0;
        input.repeatPulseTimer = 0;
      });
    }

    KotOR.Mouse.leftDown = false;
    KotOR.Mouse.leftClick = false;
    KotOR.Mouse.rightDown = false;
    KotOR.Mouse.rightClick = false;
    KotOR.Mouse.downItem = undefined;
    KotOR.Mouse.clickItem = undefined;
  };

  const commandDefinitions = useMemo(() => KotOR.GameState.CheatConsoleManager.getCommandDefinitions(), []);

  const debugGroups = [
    {
      label: 'General',
      types: [EngineDebugType.OBJECT_LABELS, EngineDebugType.PATH_FINDING]
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
      types: [EngineDebugType.LIGHT_HELPERS, EngineDebugType.SHADOW_LIGHTS]
    }
  ];

  const showToast = (tone: StatusTone, message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const id = Date.now();
    setStatusToast({ id, tone, message });
    toastTimer.current = setTimeout(() => {
      setStatusToast((cur) => (cur?.id === id ? null : cur));
    }, 4000);
  };

  const focusInput = () => {
    window.requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    });
  };

  useEffect(() => {
    resetGameInputState();
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      resetGameInputState();
    };
  }, []);

  useEffect(() => {
    setActiveSuggestionIndex(0);
    setForceShowAll(false);
  }, [consoleInput]);

  // ---- suggestion computation ----
  const suggestions: SuggestionMode = useMemo(() => {
    const trimmed = consoleInput.trimStart();
    const lower = trimmed.toLowerCase();
    const spaceIndex = lower.indexOf(' ');
    const isTypingArgs = spaceIndex !== -1;

    if (!isTypingArgs) {
      // command-level
      const fragment = lower;
      if (!fragment && !forceShowAll) return null;
      const matches = !fragment
        ? commandDefinitions
        : commandDefinitions.filter((d) => d.command.includes(fragment));
      if (matches.length === 0) return null;
      return { kind: 'commands', items: matches.slice(0, 10) };
    }

    // argument-level
    const cmdName = lower.slice(0, spaceIndex);
    const argText = lower.slice(spaceIndex + 1);
    const cmdDef = commandDefinitions.find((d) => d.command === cmdName);
    if (!cmdDef) return null;

    const argSuggestions = KotOR.GameState.CheatConsoleManager.getArgumentSuggestions(cmdName, argText);
    // Always return at least the command def so we can show its usage hint
    return { kind: 'args', command: cmdDef, items: argSuggestions };
  }, [commandDefinitions, consoleInput, forceShowAll]);

  const suggestionCount =
    suggestions?.kind === 'commands' ? suggestions.items.length :
    suggestions?.kind === 'args' ? suggestions.items.length : 0;

  const applyCmdSuggestion = (def: CheatCommandDefinition) => {
    const needsArgs = def.usage.includes('<') || def.usage.includes('[');
    setConsoleInput(`${def.command}${needsArgs ? ' ' : ''}`);
    focusInput();
  };

  const applyArgSuggestion = (cmdName: string, value: string) => {
    setConsoleInput(`${cmdName} ${value} `);
    focusInput();
  };

  const enabledDumpOptionCount = Object.values(dumpOptions).filter(Boolean).length;

  const toggleDumpOption = (key: keyof DumpOptionsState) => {
    setDumpOptions((current) => ({
      ...current,
      [key]: !current[key],
    }));
    focusInput();
  };

  const resetDumpOptions = () => {
    setDumpOptions({
      skipAudio: false,
      skipLip: false,
      skipModels: false,
      skipTextures: false,
    });
    focusInput();
  };

  const closeConsole = () => {
    resetGameInputState();
    setShowCheatConsole(false);
  };

  const onConsoleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' || e.key === '`') {
      e.preventDefault();
      closeConsole();
    }

    e.stopPropagation();
  };

  const onConsoleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const onConsoleMouseEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const onConsoleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const onConsoleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConsoleInput(e.target.value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); closeConsole(); return; }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!consoleInput.trim() && !forceShowAll) {
        setForceShowAll(true);
        return;
      }
      if (suggestionCount > 0) {
        setActiveSuggestionIndex((i) => (i + 1) % suggestionCount);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestionCount > 0) {
        setActiveSuggestionIndex((i) => (i === 0 ? suggestionCount - 1 : i - 1));
      }
      return;
    }

    if (e.key === 'Tab' && suggestions) {
      e.preventDefault();
      if (suggestions.kind === 'commands') {
        const def = suggestions.items[activeSuggestionIndex] || suggestions.items[0];
        if (def) applyCmdSuggestion(def);
      } else if (suggestions.kind === 'args' && suggestions.items.length > 0) {
        const val = suggestions.items[activeSuggestionIndex] || suggestions.items[0];
        if (val) applyArgSuggestion(suggestions.command.command, val);
      }
      return;
    }

    if (e.key !== 'Enter') return;
    e.preventDefault();
    const command = consoleInput.trim();
    if (!command) return;
    if (command.toLowerCase() === 'help') {
      setShowHelp(true);
      setConsoleInput('');
      focusInput();
      return;
    }
    const result = appState.consoleCommand(command);
    showToast(result.ok ? 'success' : 'error', result.message);
    setConsoleInput('');
    focusInput();
  };

  const onToggleDebugger = () => { appState.toggleDebugger(); focusInput(); };

  const onTogglePerformanceMonitor = () => {
    const nextMode = appState.togglePerformanceMonitor();
    setShowPerformanceMonitor(nextMode !== undefined);
    showToast('info', nextMode === undefined ? 'Stats hidden' : `Stats panel ${nextMode + 1}`);
    focusInput();
  };

  const onReloadLastSave = () => {
    showToast('info', 'Reloading last save...');
    appState.reloadLastSave();
  };

  const onExportSnapshot = async () => {
    showToast('info', 'Exporting game snapshot...');
    const result = await appState.exportGameSnapshot();
    if (result?.cancelled) {
      showToast('info', result.message);
    } else {
      showToast(result?.ok ? 'success' : 'error', result?.message || 'Snapshot export failed.');
    }
    focusInput();
  };

  const onDumpGameFiles = async () => {
    if (isDumpingGameFiles) return;

    setIsDumpingGameFiles(true);
    setShowDumpOptions(false);
    setDumpProgress({
      phase: 'scanning',
      current: 0,
      total: 1,
      percent: 0,
      percentLabel: '0%',
      archivesProcessed: 0,
      jsonFilesWritten: 0,
      failed: 0,
      message: 'Scanning game files...',
    });
    showToast('info', enabledDumpOptionCount > 0
      ? 'Exporting filtered game files as JSON. This may take a while...'
      : 'Exporting game files as JSON. This may take a while...');

    try {
      const result = await appState.dumpGameResourcesAsJson(dumpOptions, (progress) => {
        const percent = Math.max(0, Math.min(100, Math.round(progress.percent * 100)));
        setDumpProgress({
          ...progress,
          percentLabel: `${percent}%`,
        });
      });

      if (result?.cancelled) {
        showToast('info', result.message);
      } else {
        showToast(result?.ok ? 'success' : 'error', result?.message || 'Game file export failed.');
      }
    } finally {
      setIsDumpingGameFiles(false);
      setDumpProgress(null);
      focusInput();
    }
  };

  const onToggleDebugState = (type: EngineDebugType) => {
    KotOR.GameState.ToggleDebugState(type);
    setDebugTick((t) => t + 1);
    focusInput();
  };

  const formatDebugLabel = (label: string) => label.replace(/_/g, ' ');
  const dumpProgressWidth = `${Math.max(0, Math.min(100, dumpProgress?.percent ? dumpProgress.percent * 100 : 0))}%`;
  const dumpProgressPath = dumpProgress?.currentPath || dumpProgress?.archivePath;

  return (
    <div
      className={`cc on ${gameKey} ${isDumpingGameFiles && dumpProgress ? 'has-progress' : ''}`}
      data-cheat-console-root="true"
      onKeyDown={onConsoleKeyDown}
      onKeyUp={onConsoleKeyUp}
      onMouseDown={onConsoleMouseEvent}
      onMouseUp={onConsoleMouseEvent}
      onMouseMove={onConsoleMouseEvent}
      onWheel={onConsoleWheel}
    >
      {/* ---- main bar ---- */}
      <div className="cc-bar">
        <span className="cc-prompt">&gt;</span>
        <input
          ref={inputRef}
          className="cc-input"
          type="text"
          value={consoleInput}
          placeholder="cheat command..."
          onChange={onConsoleInput}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          data-cheat-console-input="true"
        />
        <div className="cc-actions">
          <button type="button" className={`cc-btn ${showHelp ? 'active' : ''}`} onClick={() => { setShowHelp((s) => !s); focusInput(); }}>?</button>
          <button type="button" className={`cc-btn ${showDebugMenu ? 'active' : ''}`} onClick={() => { setShowDebugMenu((s) => !s); focusInput(); }}>⚙</button>
          <button type="button" className="cc-btn" onClick={onToggleDebugger}>🔍</button>
          <button type="button" className={`cc-btn ${showPerformanceMonitor ? 'active' : ''}`} onClick={onTogglePerformanceMonitor}>📊</button>
          <button type="button" className="cc-btn" onClick={onReloadLastSave}>↺</button>
          <button type="button" className="cc-btn" onClick={onExportSnapshot} title="Export JSON snapshot" aria-label="Export JSON snapshot">{'{}'}</button>
          <button
            type="button"
            className={`cc-btn ${showDumpOptions || enabledDumpOptionCount > 0 ? 'active' : ''}`}
            onClick={() => { setShowDumpOptions((s) => !s); focusInput(); }}
            title="Game file dump options"
            aria-label="Game file dump options"
            disabled={isDumpingGameFiles}
          >
            ☷
          </button>
          <button
            type="button"
            className={`cc-btn ${isDumpingGameFiles ? 'active' : ''}`}
            onClick={onDumpGameFiles}
            title="Export all game files as JSON"
            aria-label="Export all game files as JSON"
            disabled={isDumpingGameFiles}
          >
            🗃
          </button>
          <button type="button" className="cc-btn cc-close" onClick={closeConsole}>✕</button>
        </div>
      </div>

      {showDumpOptions && !isDumpingGameFiles && (
        <div className="cc-dropdown cc-dump-options">
          <div className="cc-dropdown-header">
            <span>Game File Dump Options</span>
            <button type="button" className="cc-btn cc-close" onClick={() => setShowDumpOptions(false)}>✕</button>
          </div>

          <button type="button" className="cc-ac" onClick={() => toggleDumpOption('skipAudio')}>
            <span className="cc-ac-cmd">Skip audio</span>
            <span className={`cc-status ${dumpOptions.skipAudio ? 'enabled' : 'disabled'}`}>
              {dumpOptions.skipAudio ? 'ON' : 'OFF'}
            </span>
            <span className="cc-ac-desc">.wav, .mp3, .ogg, .bmu, .wma</span>
          </button>

          <button type="button" className="cc-ac" onClick={() => toggleDumpOption('skipLip')}>
            <span className="cc-ac-cmd">Skip lip sync</span>
            <span className={`cc-status ${dumpOptions.skipLip ? 'enabled' : 'disabled'}`}>
              {dumpOptions.skipLip ? 'ON' : 'OFF'}
            </span>
            <span className="cc-ac-desc">.lip</span>
          </button>

          <button type="button" className="cc-ac" onClick={() => toggleDumpOption('skipModels')}>
            <span className="cc-ac-cmd">Skip models</span>
            <span className={`cc-status ${dumpOptions.skipModels ? 'enabled' : 'disabled'}`}>
              {dumpOptions.skipModels ? 'ON' : 'OFF'}
            </span>
            <span className="cc-ac-desc">.mdl, .mdx</span>
          </button>

          <button type="button" className="cc-ac" onClick={() => toggleDumpOption('skipTextures')}>
            <span className="cc-ac-cmd">Skip textures</span>
            <span className={`cc-status ${dumpOptions.skipTextures ? 'enabled' : 'disabled'}`}>
              {dumpOptions.skipTextures ? 'ON' : 'OFF'}
            </span>
            <span className="cc-ac-desc">.tpc, .tga, .txi, .dds, .txb, .bmp, .png, .jpg, .plt</span>
          </button>

          {enabledDumpOptionCount > 0 && (
            <div className="cc-dump-options-footer">
              <button type="button" className="cc-dbtn" onClick={resetDumpOptions}>Reset filters</button>
            </div>
          )}
        </div>
      )}

      {isDumpingGameFiles && dumpProgress && (
        <div className="cc-progress">
          <div className="cc-progress-row">
            <span className="cc-progress-label">{dumpProgress.message}</span>
            <span className="cc-progress-value">{dumpProgress.percentLabel}</span>
          </div>

          <div className="cc-progress-track">
            <div className="cc-progress-fill" style={{ width: dumpProgressWidth }} />
          </div>

          <div className="cc-progress-meta">
            <span>{Math.min(dumpProgress.current, dumpProgress.total)} / {dumpProgress.total} game files</span>
            {typeof dumpProgress.archiveTotal === 'number' && dumpProgress.archiveTotal > 0 && (
              <span>{dumpProgress.archiveCurrent || 0} / {dumpProgress.archiveTotal} archive entries</span>
            )}
            <span>{dumpProgress.jsonFilesWritten} JSON written</span>
            {dumpProgress.failed > 0 && (
              <span>{dumpProgress.failed} failed</span>
            )}
          </div>

          {dumpProgressPath && (
            <div className="cc-progress-path" title={dumpProgressPath}>{dumpProgressPath}</div>
          )}
        </div>
      )}

      {/* ---- status toast ---- */}
      {statusToast && (
        <div className={`cc-toast ${statusToast.tone}`}>{statusToast.message}</div>
      )}

      {/* ---- command suggestions ---- */}
      {suggestions?.kind === 'commands' && suggestions.items.length > 0 && (
        <div className="cc-dropdown">
          {suggestions.items.map((def, i) => (
            <button
              key={def.command}
              type="button"
              className={`cc-ac ${i === activeSuggestionIndex ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); applyCmdSuggestion(def); }}
            >
              <span className="cc-ac-cmd">{def.usage}</span>
              <span className="cc-ac-desc">{def.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* ---- argument suggestions (with usage hint) ---- */}
      {suggestions?.kind === 'args' && (
        <div className="cc-dropdown">
          <div className="cc-arg-hint">
            <span className="cc-arg-hint-usage">{suggestions.command.usage}</span>
            <span className="cc-arg-hint-desc">{suggestions.command.description}</span>
          </div>
          {suggestions.items.map((val, i) => (
            <button
              key={val}
              type="button"
              className={`cc-ac ${i === activeSuggestionIndex ? 'active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); applyArgSuggestion(suggestions.command.command, val); }}
            >
              <span className="cc-ac-cmd">{val}</span>
            </button>
          ))}
          {suggestions.items.length === 0 && suggestions.command.example && (
            <div className="cc-arg-empty">e.g. {suggestions.command.example}</div>
          )}
        </div>
      )}

      {/* ---- help dropdown ---- */}
      {showHelp && (
        <div className="cc-dropdown cc-help">
          <div className="cc-dropdown-header">
            <span>Commands</span>
            <button type="button" className="cc-btn cc-close" onClick={() => setShowHelp(false)}>✕</button>
          </div>
          {commandDefinitions.map((def) => (
            <button
              key={def.command}
              type="button"
              className="cc-ac"
              onClick={() => { applyCmdSuggestion(def); setShowHelp(false); }}
            >
              <span className="cc-ac-cmd">{def.usage}</span>
              <span className={`cc-status ${def.status === 'todo' ? 'todo' : 'ready'}`}>
                {def.status === 'todo' ? 'WIP' : '✓'}
              </span>
              <span className="cc-ac-desc">{def.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* ---- debug visualizers dropdown ---- */}
      {showDebugMenu && (
        <div className="cc-dropdown cc-debug">
          <div className="cc-dropdown-header">
            <span>Debug Visualizers</span>
            <button type="button" className="cc-btn cc-close" onClick={() => setShowDebugMenu(false)}>✕</button>
          </div>
          {debugGroups.map((group) => (
            <div key={group.label} className="cc-debug-group">
              <div className="cc-debug-label">{group.label}</div>
              <div className="cc-debug-btns">
                {group.types.map((type) => (
                  <button
                    key={`${type}-${debugTick}`}
                    type="button"
                    className={`cc-dbtn ${KotOR.GameState.GetDebugState(type) ? 'active' : ''}`}
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
  );
};
