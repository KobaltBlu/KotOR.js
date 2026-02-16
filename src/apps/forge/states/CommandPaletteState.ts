/**
 * Command Palette state – VS Code–style command palette (Ctrl+Shift+P).
 * Ported from Holocron Toolset command_palette.py
 */

import type { MenuTopState } from "./MenuTopState";

export interface CommandPaletteCommand {
  id: string;
  label: string;
  category: string;
  keywords?: string;
  callback?: () => void;
}

export class CommandPaletteState {
  static #commands: Map<string, CommandPaletteCommand> = new Map();

  static register(id: string, label: string, category: string, callback?: () => void): void {
    const keywords = `${label} ${category} ${id}`.toLowerCase();
    this.#commands.set(id, { id, label, category, keywords, callback });
  }

  static unregister(id: string): void {
    this.#commands.delete(id);
  }

  static getCommands(): CommandPaletteCommand[] {
    return Array.from(this.#commands.values());
  }

  static getFilteredCommands(query: string): CommandPaletteCommand[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getCommands();
    return this.getCommands().filter((c) => {
      const kw = c.keywords ?? `${c.label} ${c.category} ${c.id}`.toLowerCase();
      return kw.includes(q);
    });
  }

  static execute(id: string): boolean {
    const cmd = this.#commands.get(id);
    if (!cmd?.callback) return false;
    cmd.callback();
    return true;
  }

  /** Register default Forge commands. Call after MenuTopState init. */
  static registerDefaults(menuState: typeof MenuTopState): void {
    this.register("file.save", "Save File", "File", () => {
      menuState.menuItemSaveFile?.onClick?.(menuState.menuItemSaveFile);
    });
    this.register("file.saveAs", "Save File As…", "File", () => {
      menuState.menuItemSaveFileAs?.onClick?.(menuState.menuItemSaveFileAs);
    });
    this.register("file.open", "Open File…", "File", () => {
      menuState.menuItemOpenFile?.onClick?.(menuState.menuItemOpenFile);
    });
    this.register("file.compile", "Compile Script", "File", () => {
      menuState.menuItemCompileFile?.onClick?.(menuState.menuItemCompileFile);
    });
    this.register("file.saveToOverride", "Save to Override…", "File", () => {
      menuState.menuItemSaveToOverride?.onClick?.(menuState.menuItemSaveToOverride);
    });
    this.register("file.saveToRim", "Save to RIM…", "File", () => {
      menuState.menuItemSaveToRim?.onClick?.(menuState.menuItemSaveToRim);
    });
    this.register("file.extractToFolder", "Extract to folder…", "File", () => {
      menuState.menuItemExtractToFolder?.onClick?.(menuState.menuItemExtractToFolder);
    });
    this.register("file.loadFromModule", "Load From Module…", "File", () => {
      menuState.menuItemLoadFromModule?.onClick?.(menuState.menuItemLoadFromModule);
    });
    this.register("file.compareWith", "Compare with…", "File", () => {
      menuState.menuItemCompareWith?.onClick?.(menuState.menuItemCompareWith);
    });
    this.register("file.saveToModule", "Save to MOD…", "File", () => {
      menuState.menuItemSaveToModule?.onClick?.(menuState.menuItemSaveToModule);
    });
    this.register("file.newERF", "New ERF…", "File", () => {
      menuState.menuItemNewERF?.onClick?.(menuState.menuItemNewERF);
    });
    this.register("file.newMOD", "New MOD…", "File", () => {
      menuState.menuItemNewMOD?.onClick?.(menuState.menuItemNewMOD);
    });
    this.register("file.newLIP", "New Lip Sync File", "File", () => {
      menuState.menuItemNewLIP?.onClick?.(menuState.menuItemNewLIP);
    });
    this.register("file.saveAll", "Save All Files", "File", () => {
      menuState.menuItemSaveAllFiles?.onClick?.(menuState.menuItemSaveAllFiles);
    });
    this.register("file.closeFile", "Close File", "File", () => {
      menuState.menuItemCloseFile?.onClick?.(menuState.menuItemCloseFile);
    });
    this.register("project.referenceFinder", "Reference Finder", "View", () => {
      menuState.menuItemReferenceFinder?.onClick?.(menuState.menuItemReferenceFinder);
    });
    this.register("view.scriptFindReferences", "Script Find References", "View", () => {
      menuState.menuItemScriptFindReferences?.onClick?.(menuState.menuItemScriptFindReferences);
    });
    this.register("project.openModuleEditor", "Open Module Editor", "Project", () => {
      menuState.menuItemOpenModuleEditor?.onClick?.(menuState.menuItemOpenModuleEditor);
    });
    this.register("project.cloneModule", "Clone Module…", "Project", () => {
      menuState.menuItemCloneModule?.onClick?.(menuState.menuItemCloneModule);
    });
    this.register("project.insertInstance", "Insert Instance…", "Project", () => {
      menuState.menuItemInsertInstance?.onClick?.(menuState.menuItemInsertInstance);
    });
    this.register("project.lipBatchProcessor", "LIP Batch Processor…", "Project", () => {
      menuState.menuItemLIPBatchProcessor?.onClick?.(menuState.menuItemLIPBatchProcessor);
    });
    this.register("view.startPage", "Start Page", "View", () => {
      menuState.menuItemStartPage?.onClick?.(menuState.menuItemStartPage);
    });
    this.register("view.documentation", "Documentation", "View", () => {
      menuState.menuItemDocumentation?.onClick?.(menuState.menuItemDocumentation);
    });
    this.register("help.about", "About KotOR Forge", "Help", () => {
      menuState.menuItemAbout?.onClick?.(menuState.menuItemAbout);
    });
    this.register("help.editorDocs", "Open Editor Documentation", "Help", () => {
      menuState.menuItemEditorDocs?.onClick?.(menuState.menuItemEditorDocs);
    });
    this.register("help.extractOptions", "Extract Options…", "Help", () => {
      menuState.menuItemExtractOptions?.onClick?.(menuState.menuItemExtractOptions);
    });
    this.register("help.helpBrowser", "Help & Tutorials…", "Help", () => {
      menuState.menuItemHelpBrowser?.onClick?.(menuState.menuItemHelpBrowser);
    });
    this.register("help.gettingStarted", "Getting Started", "Help", () => {
      menuState.menuItemGettingStarted?.onClick?.(menuState.menuItemGettingStarted);
    });
  }
}
