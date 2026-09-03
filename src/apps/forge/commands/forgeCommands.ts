/**
 * Workbench command registry. The menubar, keybindings, and Command Palette
 * all resolve through these ids.
 *
 * @file forgeCommands.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type ForgeCommandCategory = "File" | "Edit" | "View" | "Project" | "Module" | "Help" | "Preferences";

export interface ForgeCommand {
  id: string;
  title: string;
  category: ForgeCommandCategory;
  keywords?: string[];
  keybinding?: string;
  when?: () => boolean;
  /** When false, the command is menu-only (not listed in the palette). Default true. */
  palette?: boolean;
  run: () => void | Promise<void>;
}

const commands: ForgeCommand[] = [];

export function resetForgeCommands(): void {
  commands.length = 0;
}

export function registerCommand(command: ForgeCommand): void {
  const exists = commands.some((entry) => entry.id === command.id);
  if (exists) {
    console.warn("forgeCommands: command already registered", command.id);
    return;
  }
  commands.push(command);
}

export function getCommands(): ForgeCommand[] {
  return commands.slice();
}

export function getCommand(id: string): ForgeCommand | undefined {
  return commands.find((entry) => entry.id === id);
}

export function isCommandEnabled(id: string): boolean {
  const command = getCommand(id);
  if (!command) {
    return false;
  }
  if (typeof command.when === "function") {
    return !!command.when();
  }
  return true;
}

export async function executeCommand(id: string): Promise<boolean> {
  const command = getCommand(id);
  if (!command) {
    console.warn("forgeCommands: unknown command", id);
    return false;
  }
  if (!isCommandEnabled(id)) {
    return false;
  }
  await command.run();
  return true;
}

export function commandsMatchingQuery(query: string): ForgeCommand[] {
  const q = query.trim().toLowerCase();
  const visible = commands.filter((command) => command.palette !== false);
  if (!q) {
    return visible;
  }
  return visible.filter((command) => commandMatchesQuery(command, q));
}

export function commandMatchesQuery(command: ForgeCommand, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  if (command.title.toLowerCase().indexOf(q) !== -1) {
    return true;
  }
  if (command.category.toLowerCase().indexOf(q) !== -1) {
    return true;
  }
  if (command.id.toLowerCase().indexOf(q) !== -1) {
    return true;
  }
  const keywords = command.keywords || [];
  for (let i = 0; i < keywords.length; i++) {
    if (keywords[i].toLowerCase().indexOf(q) !== -1) {
      return true;
    }
  }
  return false;
}
