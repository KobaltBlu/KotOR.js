import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/apps/game/context/AppContext";
import * as KotOR from "@/apps/game/KotOR";

export const CheatConsoleBar: React.FC = () => {
  const appContext = useApp();
  const [appState] = appContext.appState;
  const [, setShowCheatConsole] = appContext.showCheatConsole;
  const [consoleInput, setConsoleInput] = useState('');
  const [autoCompletePrefix, setAutoCompletePrefix] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commandNames = useMemo(() => KotOR.CheatConsoleManager.getCommandNames(), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onConsoleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConsoleInput(e.target.value);
    setAutoCompletePrefix('');
  };

  const applyCommandAutocomplete = (reverse: boolean) => {
    const value = consoleInput;
    const spaceIdx = value.search(/\s/);
    const hasArgs = spaceIdx >= 0;
    const cmdToken = (hasArgs ? value.slice(0, spaceIdx) : value).toLowerCase();
    const rest = hasArgs ? value.slice(spaceIdx) : '';

    // Only complete the first token (command name), not arguments.
    const caret = inputRef.current?.selectionStart ?? value.length;
    if(hasArgs && caret > spaceIdx){ return; }
    if(!cmdToken){ return; }

    const prefix = autoCompletePrefix || cmdToken;
    const cycleMatches = commandNames.filter((name) => name.startsWith(prefix));
    if(!cycleMatches.length){ return; }

    let nextIndex = 0;
    if(autoCompletePrefix){
      const currentIdx = cycleMatches.indexOf(cmdToken);
      if(currentIdx >= 0){
        nextIndex = reverse
          ? (currentIdx - 1 + cycleMatches.length) % cycleMatches.length
          : (currentIdx + 1) % cycleMatches.length;
      }else{
        nextIndex = reverse ? cycleMatches.length - 1 : 0;
      }
    }else{
      nextIndex = 0;
      if(cycleMatches[0] === cmdToken && cycleMatches.length > 1){
        nextIndex = reverse ? cycleMatches.length - 1 : 1;
      }else if(reverse){
        nextIndex = cycleMatches.length - 1;
      }
    }

    const completed = cycleMatches[nextIndex];
    if(!completed){ return; }
    setAutoCompletePrefix(prefix);
    setConsoleInput(completed + rest);
  };

  const onConsoleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if(e.key === 'Tab'){
      e.preventDefault();
      e.stopPropagation();
      applyCommandAutocomplete(e.shiftKey);
      return;
    }
    if(e.key === 'Enter'){
      appState.consoleCommand(consoleInput);
      setConsoleInput('');
      setAutoCompletePrefix('');
      setShowCheatConsole(false);
    }
  };

  return (
    <div className="cheat-console-bar">
      <input
        ref={inputRef}
        className="cheat-console-input"
        type="text"
        value={consoleInput}
        onChange={onConsoleInput}
        onKeyDown={onConsoleKeyDown}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
};
