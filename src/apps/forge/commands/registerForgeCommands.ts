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
import { openNewModuleWizard } from "@/apps/forge/helpers/openNewModuleWizard";
import { openNewProjectFromModWizard } from "@/apps/forge/helpers/openNewProjectFromModWizard";
import { openImportProjectZipWizard } from "@/apps/forge/helpers/openImportProjectZipWizard";
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
import { TabGUIEditorState } from "@/apps/forge/states/tabs/TabGUIEditorState";
import { TabPTHEditorState } from "@/apps/forge/states/tabs/TabPTHEditorState";
import { TabLYTEditorState } from "@/apps/forge/states/tabs/TabLYTEditorState";
import { TabTLKEditorState } from "@/apps/forge/states/tabs/TabTLKEditorState";
import { TabERFEditorState } from "@/apps/forge/states/tabs/TabERFEditorState";
import { TabWOKEditorState } from "@/apps/forge/states/tabs/TabWOKEditorState";
import { TabJRLEditorState } from "@/apps/forge/states/tabs/TabJRLEditorState";
import { TabIFOEditorState } from "@/apps/forge/states/tabs/TabIFOEditorState";
import { TabAREEditorState } from "@/apps/forge/states/tabs/TabAREEditorState";
import { TabModuleEditorState } from "@/apps/forge/states/tabs/TabModuleEditorState";
import { ForgeWaypoint } from "@/apps/forge/module-editor/ForgeWaypoint";
import { ModuleEditorTabMode } from "@/apps/forge/enum/ModuleEditorTabMode";
import { tabCanCompile, tabCanOpenAsGff, tabCanSave, tabIsGffEditor } from "@/apps/forge/commands/editorCommandGuards";
import * as KotOR from "@/apps/forge/KotOR";
import { openTabAsGffEditor } from "@/apps/forge/helpers/openTabAsGff";
import { formatVisAdjacency } from "@/apps/forge/module-editor/room/RoomVisEditing";
import { ModulePreviewSession } from "@/apps/forge/module-editor/ModulePreviewSession";
import { PerformanceBaseline } from "@/apps/forge/module-editor/kernel/PerformanceBaseline";
import { ModuleRecovery } from "@/apps/forge/module-editor/recovery/ModuleRecovery";
import { buildAssetIndexInBackground } from "@/apps/forge/module-editor/workers/moduleEditorWorkers";

function currentTab(): TabState | undefined {
  return ForgeState.tabManager?.currentTab;
}

function currentModuleEditor(): TabModuleEditorState | undefined {
  const tab = currentTab();
  if (!(tab instanceof TabModuleEditorState) || !tab.visible) {
    return undefined;
  }
  return tab;
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
    id: "forge.file.newProjectFromMod",
    title: "New Project from Module...",
    category: "File",
    keywords: ["mod", "rim", "erf", "import", "create project", "module"],
    run: () => openNewProjectFromModWizard(),
  });

  registerCommand({
    id: "forge.file.importProjectZip",
    title: "Import Project from ZIP...",
    category: "File",
    keywords: ["zip", "import", "restore", "archive", "backup"],
    run: () => openImportProjectZipWizard(),
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
    id: "forge.file.new.tlk",
    title: "New Talk Table (.tlk)",
    category: "File",
    keywords: ["table", "talk", "dialog.tlk", "strings"],
    run: () => addUntitled(TabTLKEditorState, "dialog", KotOR.ResourceTypes.tlk),
  });

  registerCommand({
    id: "forge.file.new.gui",
    title: "New GUI (.gui)",
    category: "File",
    keywords: ["interface", "menu", "gui"],
    run: () => addUntitled(TabGUIEditorState, "new_gui", KotOR.ResourceTypes.gui),
  });

  registerCommand({
    id: "forge.file.new.pth",
    title: "New Path (.pth)",
    category: "File",
    keywords: ["pathfinding", "waypoints", "pth"],
    run: () => addUntitled(TabPTHEditorState, "new_path", KotOR.ResourceTypes.pth),
  });

  registerCommand({
    id: "forge.file.new.lyt",
    title: "New Layout (.lyt)",
    category: "File",
    keywords: ["layout", "rooms", "lyt"],
    run: () => addUntitled(TabLYTEditorState, "new_layout", KotOR.ResourceTypes.lyt),
  });

  registerCommand({
    id: "forge.file.new.wok",
    title: "New Walkmesh (.wok)",
    category: "File",
    keywords: ["walkmesh", "collision", "wok"],
    run: () => addUntitled(TabWOKEditorState, "new_walkmesh", KotOR.ResourceTypes.wok),
  });

  registerCommand({
    id: "forge.file.new.txt",
    title: "New Text File (.txt)",
    category: "File",
    keywords: ["text", "plain"],
    run: () => addUntitled(TabTextEditorState, "untitled", KotOR.ResourceTypes.txt),
  });

  registerCommand({
    id: "forge.file.new.txi",
    title: "New Texture Info (.txi)",
    category: "File",
    keywords: ["texture", "txi", "info"],
    run: () => addUntitled(TabTextEditorState, "untitled", KotOR.ResourceTypes.txi),
  });

  registerCommand({
    id: "forge.file.new.vis",
    title: "New Visibility (.vis)",
    category: "File",
    keywords: ["visibility", "rooms", "vis"],
    run: () => addUntitled(TabTextEditorState, "untitled", KotOR.ResourceTypes.vis),
  });

  registerCommand({
    id: "forge.file.new.gff",
    title: "New GFF (.gff)",
    category: "File",
    keywords: ["gff", "generic"],
    run: () => addUntitled(TabGFFEditorState, "untitled", KotOR.ResourceTypes.gff),
  });

  registerCommand({
    id: "forge.file.new.are",
    title: "New Area (.are)",
    category: "File",
    keywords: ["module", "area", "are", "gff"],
    run: () => addUntitled(TabAREEditorState, "new_area", KotOR.ResourceTypes.are),
  });

  registerCommand({
    id: "forge.file.new.git",
    title: "New Area Instances (.git)",
    category: "File",
    keywords: ["module", "git", "instances", "gff"],
    run: () => addUntitled(TabGFFEditorState, "new_area", KotOR.ResourceTypes.git),
  });

  registerCommand({
    id: "forge.file.new.ifo",
    title: "New Module Info (.ifo)",
    category: "File",
    keywords: ["module", "ifo", "gff"],
    run: () => addUntitled(TabIFOEditorState, "module", KotOR.ResourceTypes.ifo),
  });

  registerCommand({
    id: "forge.file.new.jrl",
    title: "New Journal (.jrl)",
    category: "File",
    keywords: ["module", "journal", "jrl", "gff"],
    run: () => addUntitled(TabJRLEditorState, "new_journal", KotOR.ResourceTypes.jrl),
  });

  registerCommand({
    id: "forge.file.new.fac",
    title: "New Faction (.fac)",
    category: "File",
    keywords: ["module", "faction", "fac", "gff"],
    run: () => addUntitled(TabGFFEditorState, "repute", KotOR.ResourceTypes.fac),
  });

  registerCommand({
    id: "forge.file.new.erf",
    title: "New Archive (.erf)",
    category: "File",
    keywords: ["archive", "erf", "hak"],
    run: () => addUntitled(TabERFEditorState, "new_archive", KotOR.ResourceTypes.erf),
  });

  registerCommand({
    id: "forge.file.new.mod",
    title: "New Module Archive (.mod)",
    category: "File",
    keywords: ["archive", "mod", "module", "erf"],
    run: () => addUntitled(TabERFEditorState, "new_module", KotOR.ResourceTypes.mod),
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
    id: "forge.view.openAudioPlayer",
    title: "Audio Player",
    category: "View",
    keywords: ["audio", "player", "wav", "mp3", "ost"],
    run: () => AudioPlayerState.openAudioPlayerTab(),
  });

  registerCommand({
    id: "forge.view.toggleMiniPlayer",
    title: "Mini Audio Player",
    category: "View",
    keywords: ["audio", "player"],
    run: () => AudioPlayerState.toggleFloatingMiniPlayer(),
  });

  registerCommand({
    id: "forge.project.newModule",
    title: "New Module...",
    category: "Project",
    keywords: ["ifo", "are", "git", "create", "area"],
    when: hasProject,
    run: () => openNewModuleWizard(),
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
    id: "forge.module.deleteSelection",
    title: "Delete Selection",
    category: "Module",
    keywords: ["module", "delete", "remove"],
    when: () => !!currentModuleEditor()?.selectedGameObject,
    run: () => {
      void currentModuleEditor()?.deleteSelectedGameObject();
    },
  });

  registerCommand({
    id: "forge.module.duplicateSelection",
    title: "Duplicate Selection",
    category: "Module",
    keywords: ["module", "clone", "copy"],
    when: () => !!currentModuleEditor()?.selectedGameObject,
    run: () => {
      const tab = currentModuleEditor();
      if(tab?.selectedGameObject){
        tab.cloneGameObject(tab.selectedGameObject);
      }
    },
  });

  registerCommand({
    id: "forge.module.focusSelection",
    title: "Focus Selection",
    category: "Module",
    keywords: ["module", "focus", "camera", "look", "frame"],
    when: () => !!currentModuleEditor(),
    run: () => {
      currentModuleEditor()?.focusSelection();
    },
  });

  registerCommand({
    id: "forge.module.frameAll",
    title: "Frame Entire Module",
    category: "Module",
    keywords: ["module", "focus", "camera", "fit", "frame", "scene"],
    when: () => !!currentModuleEditor()?.module,
    run: () => {
      currentModuleEditor()?.ui3DRenderer.frameAll();
    },
  });

  registerCommand({
    id: "forge.module.setEntryFromSelection",
    title: "Set Entry From Selection",
    category: "Module",
    keywords: ["module", "entry", "spawn", "waypoint"],
    when: () => !!currentModuleEditor()?.selectedGameObject,
    run: () => {
      const tab = currentModuleEditor();
      if(tab){
        tab.setEntryFromSelection();
        tab.updateFile();
      }
    },
  });

  registerCommand({
    id: "forge.module.setEntryFromCamera",
    title: "Set Entry From Camera",
    category: "Module",
    keywords: ["module", "entry", "camera", "spawn"],
    when: () => !!currentModuleEditor()?.module,
    run: () => {
      const tab = currentModuleEditor();
      if(tab){
        tab.setEntryFromCamera();
        tab.updateFile();
      }
    },
  });

  registerCommand({
    id: "forge.module.focusEntry",
    title: "Focus Entry Point",
    category: "Module",
    keywords: ["module", "entry", "focus"],
    when: () => !!currentModuleEditor()?.module,
    run: () => {
      currentModuleEditor()?.focusEntryMarker();
    },
  });

  registerCommand({
    id: "forge.module.placeWaypointAtEntry",
    title: "Place Waypoint At Entry",
    category: "Module",
    keywords: ["module", "entry", "waypoint", "clone"],
    when: () => !!currentModuleEditor()?.module?.area,
    run: () => {
      currentModuleEditor()?.placeWaypointAtEntry();
    },
  });

  registerCommand({
    id: "forge.module.setPreviewWarpFromSelection",
    title: "Set Preview Warp From Selection",
    category: "Module",
    keywords: ["module", "preview", "warp", "waypoint"],
    when: () => {
      const sel = currentModuleEditor()?.selectedGameObject;
      return sel instanceof ForgeWaypoint && !!String(sel.tag || "").trim();
    },
    run: () => {
      const tab = currentModuleEditor();
      if(tab && !tab.setPreviewWarpFromSelection()){
        window.alert("Select a waypoint that has a Tag to use as the preview warp.");
      }
    },
  });

  registerCommand({
    id: "forge.module.clearPreviewWarp",
    title: "Clear Preview Warp",
    category: "Module",
    keywords: ["module", "preview", "warp", "clear"],
    when: () => !!currentModuleEditor()?.previewWarpWaypointTag,
    run: () => {
      currentModuleEditor()?.clearPreviewWarp();
    },
  });

  registerCommand({
    id: "forge.module.openAreaPth",
    title: "Open Area Path (.pth)",
    category: "Module",
    keywords: ["module", "path", "pth"],
    when: () => !!currentModuleEditor()?.module?.area,
    run: () => {
      void currentModuleEditor()?.openAreaPath();
    },
  });

  registerCommand({
    id: "forge.module.openAreaWalkmesh",
    title: "Open Room Walkmesh (.wok)",
    category: "Module",
    keywords: ["module", "walkmesh", "wok"],
    when: () => !!currentModuleEditor()?.module?.area,
    run: () => {
      void currentModuleEditor()?.openAreaWalkmesh();
    },
  });

  registerCommand({
    id: "forge.module.validate",
    title: "Validate Module",
    category: "Module",
    keywords: ["problems", "lint", "check"],
    when: () => !!currentModuleEditor(),
    run: () => {
      void currentModuleEditor()?.validateModule();
    },
  });

  registerCommand({
    id: "forge.module.rebuildAssetIndex",
    title: "Rebuild Asset Index",
    category: "Module",
    keywords: ["assets", "index", "search"],
    when: () => !!currentModuleEditor(),
    run: async () => {
      const tab = currentModuleEditor();
      if (!tab) return;
      await buildAssetIndexInBackground(() => tab.assetIndex.rebuild());
    },
  });

  registerCommand({
    id: "forge.module.exportVisAdjacency",
    title: "Copy Room VIS Adjacency",
    category: "Module",
    keywords: ["vis", "rooms", "layout"],
    when: () => !!currentModuleEditor()?.module?.area,
    run: async () => {
      const text = formatVisAdjacency(currentModuleEditor()?.module?.area);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text || "(no links)");
      }
    },
  });

  registerCommand({
    id: "forge.module.togglePreview",
    title: "Preview Module",
    category: "Module",
    keywords: ["preview", "play", "test", "ingame"],
    when: () => !!currentModuleEditor(),
    run: () => {
      const tab = currentModuleEditor();
      if (!tab) return;
      tab.setPreviewMode(tab.tabMode !== ModuleEditorTabMode.PREVIEW);
    },
  });

  registerCommand({
    id: "forge.module.exitPreview",
    title: "Exit Preview",
    category: "Module",
    keywords: ["preview", "stop"],
    when: () => !!currentModuleEditor() && currentModuleEditor()!.tabMode === ModuleEditorTabMode.PREVIEW,
    run: () => {
      currentModuleEditor()?.setPreviewMode(false);
    },
  });

  registerCommand({
    id: "forge.module.previewReload",
    title: "Reload Preview",
    category: "Module",
    keywords: ["preview", "hot", "reload"],
    when: () => !!currentModuleEditor() && currentModuleEditor()!.tabMode === ModuleEditorTabMode.PREVIEW,
    run: () => {
      const tab = currentModuleEditor();
      if (!tab) return;
      void ModulePreviewSession.reloadIncremental(tab, "scene");
    },
  });

  registerCommand({
    id: "forge.module.writeRecoverySnapshot",
    title: "Write Recovery Snapshot",
    category: "Module",
    keywords: ["autosave", "recovery"],
    when: () => !!currentModuleEditor(),
    run: () => {
      void currentModuleEditor()?.writeRecoverySnapshot("manual");
    },
  });

  registerCommand({
    id: "forge.module.exportPerformanceReport",
    title: "Export Performance Report",
    category: "Module",
    keywords: ["baseline", "fps", "timing", "diagnostics"],
    when: () => !!currentModuleEditor(),
    run: () => {
      const report = currentModuleEditor()?.exportPerformanceReport() || PerformanceBaseline.exportJson();
      const blob = new Blob([report], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "forge-module-performance.json";
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  registerCommand({
    id: "forge.module.clearRecovery",
    title: "Clear Recovery Snapshot",
    category: "Module",
    keywords: ["autosave", "recovery"],
    when: hasProject,
    run: () => {
      void ModuleRecovery.clear();
    },
  });

  registerCommand({
    id: "forge.project.exportModule",
    title: "Export Module...",
    category: "Project",
    keywords: ["mod", "pack", "erf", "export"],
    when: hasProject,
    run: () => ForgeState.project.export(),
  });

  registerCommand({
    id: "forge.project.exportModuleToGame",
    title: "Export Module to Game...",
    category: "Project",
    keywords: ["mod", "modules", "install", "game", "export"],
    when: hasProject,
    run: () => ForgeState.project.exportToGameModules(),
  });

  registerCommand({
    id: "forge.project.exportProjectZip",
    title: "Export Project as ZIP...",
    category: "Project",
    keywords: ["zip", "backup", "archive", "export", "share"],
    when: hasProject,
    run: () => ForgeState.project.exportAsZip(),
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
