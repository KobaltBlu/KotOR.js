/**
 * VS Code-style command palette overlay (Ctrl/Cmd+Shift+P).
 *
 * @file CommandPalette.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ForgeInput } from "@/apps/forge/components/ui";
import { useEffectOnce } from "@/apps/forge/helpers/UseEffectOnce";
import {
  commandsMatchingQuery,
  executeCommand,
  isCommandEnabled,
} from "@/apps/forge/commands/forgeCommands";
import { formatKeybinding } from "@/apps/forge/commands/forgeKeybindings";
import { CommandPaletteState } from "@/apps/forge/commands/CommandPaletteState";

export function CommandPalette() {
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hide = () => {
    setShow(false);
    setQuery("");
    setIndex(0);
    CommandPaletteState.visible = false;
  };

  useEffectOnce(() => {
    const onShow = () => {
      setShow(true);
      setQuery("");
      setIndex(0);
    };
    const onHide = () => hide();
    CommandPaletteState.AddEventListener("onShow", onShow);
    CommandPaletteState.AddEventListener("onHide", onHide);
    return () => {
      CommandPaletteState.RemoveEventListener("onShow", onShow);
      CommandPaletteState.RemoveEventListener("onHide", onHide);
    };
  });

  const commands = useMemo(() => commandsMatchingQuery(query), [query, show]);

  useEffect(() => {
    if (!show) {
      return;
    }
    setIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [show, query]);

  useEffect(() => {
    if (!show) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        hide();
        CommandPaletteState.Hide();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, Math.max(commands.length - 1, 0)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const command = commands[index];
        if (command && isCommandEnabled(command.id)) {
          hide();
          CommandPaletteState.Hide();
          void executeCommand(command.id);
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [show, commands, index]);

  if (!show) {
    return null;
  }

  return createPortal(
    <div
      className="forge-command-palette-backdrop"
      onMouseDown={() => {
        hide();
        CommandPaletteState.Hide();
      }}
    >
      <div
        className="forge-command-palette"
        role="listbox"
        aria-label="Command Palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ForgeInput
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Type a command"
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter commands"
        />
        <div className="forge-command-palette__list">
          {commands.length === 0 ? (
            <div className="forge-command-palette__empty">No matching commands</div>
          ) : (
            commands.map((command, i) => {
              const enabled = isCommandEnabled(command.id);
              return (
                <button
                  key={command.id}
                  type="button"
                  role="option"
                  aria-selected={i === index}
                  disabled={!enabled}
                  className={`forge-command-palette__item ${i === index ? "is-active" : ""} ${enabled ? "" : "is-disabled"}`}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => {
                    if (!enabled) {
                      return;
                    }
                    hide();
                    CommandPaletteState.Hide();
                    void executeCommand(command.id);
                  }}
                >
                  <span className="forge-command-palette__title">{command.title}</span>
                  <span className="forge-command-palette__category">{command.category}</span>
                  {command.keybinding ? (
                    <span className="forge-menu__shortcut">{formatKeybinding(command.keybinding)}</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
