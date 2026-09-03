/**
 * Parse, format, and match Forge command keybindings (`Mod+S`, `Mod+Shift+P`).
 *
 * @file forgeKeybindings.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { executeCommand, getCommands, isCommandEnabled } from "@/apps/forge/commands/forgeCommands";

export interface ParsedKeybinding {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

const KEY_ALIASES: Record<string, string> = {
  comma: ",",
  plus: "+",
  minus: "-",
  period: ".",
};

export function parseKeybinding(keybinding: string): ParsedKeybinding {
  const parts = keybinding.split("+").map((part) => part.trim()).filter(Boolean);
  let mod = false;
  let shift = false;
  let alt = false;
  let key = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const lower = part.toLowerCase();
    if (lower === "mod" || lower === "ctrl" || lower === "cmd" || lower === "meta") {
      mod = true;
    } else if (lower === "shift") {
      shift = true;
    } else if (lower === "alt") {
      alt = true;
    } else {
      key = KEY_ALIASES[lower] || lower;
    }
  }
  return { mod, shift, alt, key };
}

export function formatKeybinding(keybinding?: string): string | undefined {
  if (!keybinding) {
    return undefined;
  }
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac/i.test(navigator.platform || navigator.userAgent || "");
  const mod = isMac ? "Cmd" : "Ctrl";
  return keybinding.replace(/Mod/g, mod);
}

export function eventMatchesKeybinding(event: KeyboardEvent, keybinding: string): boolean {
  const parsed = parseKeybinding(keybinding);
  const eventMod = event.ctrlKey || event.metaKey;
  if (parsed.mod !== eventMod) {
    return false;
  }
  if (parsed.shift !== event.shiftKey) {
    return false;
  }
  if (parsed.alt !== event.altKey) {
    return false;
  }
  const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  if (parsed.key === ",") {
    return eventKey === "," || event.code === "Comma";
  }
  return eventKey === parsed.key;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  return target.isContentEditable;
}

export function installForgeKeybindings(): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    const commands = getCommands();
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (!command.keybinding) {
        continue;
      }
      if (!eventMatchesKeybinding(event, command.keybinding)) {
        continue;
      }
      if (isEditableTarget(event.target) && command.id === "forge.view.commandPalette") {
        // Still allow the palette from inputs.
      }
      if (!isCommandEnabled(command.id)) {
        continue;
      }
      event.preventDefault();
      event.stopPropagation();
      void executeCommand(command.id);
      return;
    }
  };
  window.addEventListener("keydown", onKeyDown, true);
  return () => window.removeEventListener("keydown", onKeyDown, true);
}
