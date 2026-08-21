/**
 * Register Forge workbench commands (File/Edit/View/Project/Help).
 *
 * @file registerForgeCommands.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { EditorFile } from "@/apps/forge/EditorFile";
import { Project } from "@/apps/forge/Project";
import { registerCommand } from "@/apps/forge/commands/forgeCommands";
import { CommandPaletteState } from "@/apps/forge/commands/CommandPaletteState";
import { ModalChangeGameState } from "@/apps/forge/components/modal/ModalChangeGame";
import { ModalAboutState } from "@/apps/forge/components/modal/ModalAboutState";
import { ModalSettingsState } from "@/apps/forge/components/modal/ModalSettingsState";
import { compileAllNssInProject } from "@/apps/forge/helpers/ForgeNWScriptCompile";
import { openImportModuleWizard } from "@/apps/forge/helpers/openImportModuleWizard";
import { exportForgeThemeToFile, installForgeThemeFromFile } from "@/apps/forge/settings/forgeTheme";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { ModalBulkNssCompileResultsState } from "@/apps/forge/states/modal/ModalBulkNssCompileResultsState";
import { ModalNewProjectState } from "@/apps/forge/states/modal/ModalNewProjectState";
import { TabQuickStartState } from "@/apps/forge/states/tabs/TabQuickStartState";
import { TabSSFEditorState } from "@/apps/forge/states/tabs/TabSSFEditorState";
import { TabTextEditorState } from "@/apps/forge/states/tabs/TabTextEditorState";
import { TabTwoDAEditorState } from "@/apps/forge/states/tabs/TabTwoDAEditorState";
import { TabUTCEditorState } from "@/apps/forge/states/tabs/TabUTCEditorState";
import { TabDLGEditorState } from "@/apps/forge/states/tabs/TabDLGEditorState";
import { TabUTDEditorState } from "@/apps/forge/states/tabs/TabUTDEditorState";
import { TabUTEEditorState } from "@/apps/forge/states/tabs/TabUTEEditorState";
import { TabUTIEditorState } from "@/apps/forge/states/tabs/TabUTIEditorState";
import { TabUTMEditorState } from "@/apps/forge/states/tabs/TabUTMEditorState";
import { TabUTPEditorState } from "@/apps/forge/states/tabs/TabUTPEditorState";
import { TabUTSEditorState } from "@/apps/forge/states/tabs/TabUTSEditorState";
import { TabUTTEditorState } from "@/apps/forge/states/tabs/TabUTTEditorState";
import { TabUTWEditorState } from "@/apps/forge/states/tabs/TabUTWEditorState";
import { TabLIPEditorState } from "@/apps/forge/states/tabs/tab-lip-editor/TabLIPEditorState";
import { TabImageViewerState } from "@/apps/forge/states/tabs/TabImageViewerState";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { TabGFFEditorState } from "@/apps/forge/states/tabs/TabGFFEditorState";
import { tabCanCompile, tabCanOpenAsGff, tabCanSave, tabIsGffEditor } from "@/apps/forge/commands/editorCommandGuards";
import * as KotOR from "@/apps/forge/KotOR";
import { openTabAsGffEditor } from "@/apps/forge/helpers/openTabAsGff";

function currentTab(): TabState | undefined {
  return ForgeState.tabManager?.currentTab;
}

function hasClosableTab(): boolean {
  return !!currentTab()?.isClosable;
}

function hasProject(): boolean {
  return ForgeState.project instanceof Project;
}

function addUntitled(StateClass: new (options: any) => TabState, resref: string, reskey: number) {
  ForgeState.tabManager.addTab(new StateClass({
    editorFile: new EditorFile({ resref, reskey }),
  }));
}

let registered = false;

export function registerForgeCommands(): void {
  if (registered) {
    return;
  }
  registered = true;

  registerCommand({
    id: "forge.view.commandPalette",
    title: "Command Palette...",
    category: "View",
    keywords: ["palette", "commands", "search"],
    keybinding: "Mod+Shift+P",
    run: () => CommandPaletteState.Toggle(),
  });

  registerCommand({
    id: "forge.file.newProject",
    title: "New Project...",
    category: "File",
    keywords: ["wizard", "create project"],
    run: () => {
      const modal = new ModalNewProjectState();
      ForgeState.modalManager.addModal(modal);
      modal.open();
    },
  });

  registerCommand({
    id: "forge.file.openProject",
    title: "Open Project...",
    category: "File",
    keywords: ["folder", "directory"],
    run: () => Project.OpenByDirectory(),
  });

  registerCommand({
    id: "forge.file.saveProject",
    title: "Save Project",
    category: "File",
    when: hasProject,
    run: () => ForgeState.project.save(),
  });

  registerCommand({
    id: "forge.file.saveProjectToFolder",
    title: "Save Project To Folder...",
    category: "File",
    keywords: ["virtual", "export", "copy", "folder"],
    when: hasProject,
    run: () => Project.SaveToFolder(),
  });

  registerCommand({
    id: "forge.file.closeProject",
    title: "Close Project",
    category: "File",
    when: hasProject,
    run: () => ForgeState.project.close(),
  });

  registerCommand({
    id: "forge.file.openFile",
    title: "Open File...",
    category: "File",
    run: () => ForgeState.openFile(),
  });

  registerCommand({
    id: "forge.file.save",
    title: "Save",
    category: "File",
    keybinding: "Mod+S",
    when: () => tabCanSave(currentTab()),
    run: () => currentTab()?.save(),
  });

  registerCommand({
    id: "forge.file.saveAs",
    title: "Save As...",
    category: "File",
    keybinding: "Mod+Shift+S",
    when: () => tabCanSave(currentTab()),
    run: () => currentTab()?.saveAs(),
  });

  registerCommand({
    id: "forge.file.saveAll",
    title: "Save All",
    category: "File",
    keybinding: "Mod+Alt+S",
    when: () => (ForgeState.tabManager?.tabs || []).some((tab) => !!tab.file),
    run: () => ForgeState.saveAllEditorTabs(),
  });

  registerCommand({
    id: "forge.file.closeEditor",
    title: "Close Editor",
    category: "File",
    keybinding: "Mod+W",
    when: hasClosableTab,
    run: () => currentTab()?.remove(),
  });

  registerCommand({
    id: "forge.file.openAsGff",
    title: "Open as GFF Editor",
    category: "File",
    keywords: ["gff", "template", "utc", "utp", "blueprint"],
    when: () => tabCanOpenAsGff(currentTab()),
    run: () => openTabAsGffEditor(currentTab()),
  });

  registerCommand({
    id: "forge.file.exportGffJson",
    title: "Export GFF as JSON...",
    category: "File",
    keywords: ["gff", "json", "export"],
    when: () => tabIsGffEditor(currentTab()),
    run: () => {
      const tab = currentTab();
      if (tab instanceof TabGFFEditorState) {
        void tab.exportJson();
      }
    },
  });

  registerCommand({
    id: "forge.file.importGffJson",
    title: "Import GFF JSON...",
    category: "File",
    keywords: ["gff", "json", "import"],
    when: () => tabIsGffEditor(currentTab()),
    run: () => {
      const tab = currentTab();
      if (tab instanceof TabGFFEditorState) {
        void tab.importJson();
      }
    },
  });

  registerCommand({
    id: "forge.file.settings",
    title: "Settings...",
    category: "File",
    keywords: ["preferences", "options"],
    keybinding: "Mod+Comma",
    run: () => ModalSettingsState.Show(),
  });

  registerCommand({
    id: "forge.preferences.colorTheme",
    title: "Preferences: Color Theme",
    category: "Preferences",
    keywords: ["appearance", "theme", "light", "dark", "kotor", "tsl"],
    run: () => ModalSettingsState.Show("appearance"),
  });

  registerCommand({
    id: "forge.preferences.exportColorTheme",
    title: "Preferences: Export Color Theme",
    category: "Preferences",
    keywords: ["appearance", "theme", "json", "share"],
    run: async () => {
      try {
        await exportForgeThemeToFile();
      } catch (error) {
        console.error(error);
        window.alert("Could not export this color theme.");
      }
    },
  });

  registerCommand({
    id: "forge.preferences.installColorTheme",
    title: "Preferences: Install Color Theme",
    category: "Preferences",
    keywords: ["appearance", "theme", "json", "import"],
    run: async () => {
      try {
        await installForgeThemeFromFile();
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "Could not install this color theme.";
        window.alert(message);
      }
    },
  });

  registerCommand({
    id: "forge.file.loadGameData",
    title: "Load Game Directory...",
    category: "File",
    keywords: ["chitin", "bif", "game", "kotor", "tsl", "data"],
    run: async () => {
    const bound = await ForgeState.promptAndBindGameDirectory();
    if (bound === "cancelled") {
      return;
    }
    if (bound !== "ok") {
      window.alert("The selected folder does not contain chitin.key. Choose a KotOR or TSL install directory.");
      return;
    }
      const loaded = await ForgeState.attachGameData();
      if (!loaded) {
        window.alert("Could not load game archives from that folder. Editors will stay in fallback mode.");
      }
    },
  });

  registerCommand({
    id: "forge.file.removeGameDirectory",
    title: "Remove Game Directory",
    category: "File",
    keywords: ["chitin", "game", "unbind", "offline", "directory", "folder"],
    when: () => ForgeState.hasBoundGameDirectory(),
    run: async () => {
      const label = ForgeState.getBoundGameDirectoryLabel();
      const confirmed = window.confirm(
        label
          ? `Remove the bound game directory (${label})? Forge will work offline until you choose a folder again.`
          : "Remove the bound game directory? Forge will work offline until you choose a folder again.",
      );
      if (!confirmed) {
        return;
      }
      await ForgeState.unbindGameDirectory();
    },
  });

  registerCommand({
    id: "forge.file.changeGame",
    title: "Change Game...",
    category: "File",
    keywords: ["kotor", "tsl", "profile"],
    run: () => ModalChangeGameState.Show(),
  });

  registerCommand({
    id: "forge.file.clearRecent",
    title: "Clear Recently Opened",
    category: "File",
    palette: false,
    when: () => ForgeState.recentFiles.length + ForgeState.recentProjects.length > 0,
    run: async () => {
      ForgeState.clearRecentFiles();
      await ForgeState.clearRecentProjects();
    },
  });

  registerCommand({
    id: "forge.file.exit",
    title: "Exit",
    category: "File",
    run: () => {
      (window as any).canUnload = true;
      window.close();
    },
  });

  registerCommand({
    id: "forge.file.new.lip",
    title: "New Lip Sync File (.lip)",
    category: "File",
    keywords: ["lipsync", "phoneme"],
    run: () => ForgeState.tabManager.addTab(new TabLIPEditorState()),
  });

  registerCommand({
    id: "forge.file.new.image",
    title: "New Texture (.tga)",
    category: "File",
    keywords: ["texture", "tga", "tpc", "image"],
    run: () => addUntitled(TabImageViewerState, "untitled", KotOR.ResourceTypes.tga),
  });

  registerCommand({
    id: "forge.file.new.tpc",
    title: "New Texture (.tpc)",
    category: "File",
    keywords: ["texture", "tpc", "image", "dxt"],
    run: () => addUntitled(TabImageViewerState, "untitled", KotOR.ResourceTypes.tpc),
  });

  registerCommand({
    id: "forge.file.new.nss",
    title: "New NWScript Source File",
    category: "File",
    keywords: ["script", "nss"],
    run: () => addUntitled(TabTextEditorState, "untitled", KotOR.ResourceTypes.nss),
  });

  registerCommand({
    id: "forge.file.new.dlg",
    title: "New Conversation (.dlg)",
    category: "File",
    keywords: ["dialog", "dialogue", "conversation", "dlg"],
    run: () => addUntitled(TabDLGEditorState, "new_conversation", KotOR.ResourceTypes.dlg),
  });

  registerCommand({
    id: "forge.file.new.utc",
    title: "New Creature (.utc)",
    category: "File",
    keywords: ["blueprint", "creature"],
    run: () => addUntitled(TabUTCEditorState, "new_creature", KotOR.ResourceTypes.utc),
  });

  registerCommand({
    id: "forge.file.new.utd",
    title: "New Door (.utd)",
    category: "File",
    keywords: ["blueprint", "door"],
    run: () => addUntitled(TabUTDEditorState, "new_door", KotOR.ResourceTypes.utd),
  });

  registerCommand({
    id: "forge.file.new.ute",
    title: "New Encounter (.ute)",
    category: "File",
    keywords: ["blueprint", "encounter"],
    run: () => addUntitled(TabUTEEditorState, "new_encounter", KotOR.ResourceTypes.ute),
  });

  registerCommand({
    id: "forge.file.new.uti",
    title: "New Item (.uti)",
    category: "File",
    keywords: ["blueprint", "item"],
    run: () => addUntitled(TabUTIEditorState, "new_item", KotOR.ResourceTypes.uti),
  });

  registerCommand({
    id: "forge.file.new.utm",
    title: "New Store (.utm)",
    category: "File",
    keywords: ["blueprint", "merchant", "store"],
    run: () => addUntitled(TabUTMEditorState, "new_store", KotOR.ResourceTypes.utm),
  });

  registerCommand({
    id: "forge.file.new.utp",
    title: "New Placeable (.utp)",
    category: "File",
    keywords: ["blueprint", "placeable"],
    run: () => addUntitled(TabUTPEditorState, "new_placeable", KotOR.ResourceTypes.utp),
  });

  registerCommand({
    id: "forge.file.new.uts",
    title: "New Sound (.uts)",
    category: "File",
    keywords: ["blueprint", "sound"],
    run: () => addUntitled(TabUTSEditorState, "new_sound", KotOR.ResourceTypes.uts),
  });

  registerCommand({
    id: "forge.file.new.utt",
    title: "New Trigger (.utt)",
    category: "File",
    keywords: ["blueprint", "trigger"],
    run: () => addUntitled(TabUTTEditorState, "new_trigger", KotOR.ResourceTypes.utt),
  });

  registerCommand({
    id: "forge.file.new.utw",
    title: "New Waypoint (.utw)",
    category: "File",
    keywords: ["blueprint", "waypoint"],
    run: () => addUntitled(TabUTWEditorState, "new_waypoint", KotOR.ResourceTypes.utw),
  });

  registerCommand({
    id: "forge.file.new.ssf",
    title: "New Sound Set (.ssf)",
    category: "File",
    keywords: ["table", "soundset"],
    run: () => addUntitled(TabSSFEditorState, "new_soundset", KotOR.ResourceTypes.ssf),
  });

  registerCommand({
    id: "forge.file.new.2da",
    title: "New 2DA Table",
    category: "File",
    keywords: ["table", "twoda"],
    run: () => addUntitled(TabTwoDAEditorState, "new_table", KotOR.ResourceTypes["2da"]),
  });

  registerCommand({
    id: "forge.edit.undo",
    title: "Undo",
    category: "Edit",
    when: () => !!currentTab()?.canUndo,
    run: () => currentTab()?.undo(),
  });

  registerCommand({
    id: "forge.edit.redo",
    title: "Redo",
    category: "Edit",
    when: () => !!currentTab()?.canRedo,
    run: () => currentTab()?.redo(),
  });

  registerCommand({
    id: "forge.view.startPage",
    title: "Start Page",
    category: "View",
    keywords: ["welcome", "home"],
    run: () => ForgeState.tabManager.addTab(new TabQuickStartState()),
  });

  registerCommand({
    id: "forge.view.toggleExplorer",
    title: "Explorer",
    category: "View",
    keywords: ["sidebar", "project", "resources"],
    keybinding: "Mod+B",
    run: () => ForgeState.toggleExplorerPane(),
  });

  registerCommand({
    id: "forge.view.toggleMiniPlayer",
    title: "Mini Audio Player",
    category: "View",
    keywords: ["audio", "player"],
    run: () => AudioPlayerState.toggleFloatingMiniPlayer(),
  });

  registerCommand({
    id: "forge.project.importModule",
    title: "Import Module...",
    category: "Project",
    keywords: ["rim", "mod", "erf", "ifo", "area"],
    when: hasProject,
    run: () => openImportModuleWizard(),
  });

  registerCommand({
    id: "forge.project.openModuleEditor",
    title: "Open Module Editor",
    category: "Project",
    when: hasProject,
    run: () => ForgeState.project.openModuleEditor(),
  });

  registerCommand({
    id: "forge.project.compile",
    title: "Compile This Script",
    category: "Project",
    keywords: ["nss", "ncs", "build"],
    keybinding: "Mod+Shift+B",
    when: () => tabCanCompile(currentTab()),
    run: () => currentTab()?.compile(),
  });

  registerCommand({
    id: "forge.project.compileAllNss",
    title: "Compile All NSS",
    category: "Project",
    keywords: ["build", "batch"],
    when: hasProject,
    run: async () => {
      ForgeState.loaderShow();
      try {
        const outcome = await compileAllNssInProject();
        const modal = new ModalBulkNssCompileResultsState(outcome);
        modal.attachToModalManager(ForgeState.modalManager);
        modal.open();
      } finally {
        ForgeState.loaderHide();
      }
    },
  });

  registerCommand({
    id: "forge.help.about",
    title: "About Forge",
    category: "Help",
    run: () => ModalAboutState.Show(),
  });
}

registerForgeCommands();
