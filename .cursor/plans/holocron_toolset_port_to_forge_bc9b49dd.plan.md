---
name: Holocron Toolset Full Port to Forge
overview: Implement the entirety of Holocron Toolset in KotOR.js Forge using Forge patterns only. Exhaustive file tree and ~80 todos below.
todos:
  - id: doc-gap-matrix
    content: Keep EDITOR_GAP_MATRIX.md accurate
    status: completed
  - id: doc-tab-contract
    content: Keep TABSTATE_EDITORFILE_CONTRACT and EditorTabManager restoration documented
    status: completed
  - id: tlk-serialize
    content: "TLKObject: add toBuffer()/export() for TLK write (BinaryWriter)"
    status: completed
  - id: tlk-tab-save
    content: TabTLKEditorState.getExportBuffer() use TLK serialization
    status: completed
  - id: tlk-tab-dirty
    content: "TabTLKEditor: edits mark unsaved_changes and tab title"
    status: completed
  - id: dlg-parity
    content: "DLG editor: node tree, props, links; optional graph view"
    status: completed
  - id: are-parity
    content: "ARE editor: Basic/Audio/Map/Env/Scripts/Rooms tabs"
    status: completed
  - id: git-parity
    content: "GIT editor: 9 instance types, position/orientation"
    status: completed
  - id: ifo-parity
    content: "IFO editor: module metadata, entry point, scripts, areas"
    status: completed
  - id: fac-parity
    content: "FAC editor: faction list, reputation matrix"
    status: completed
  - id: jrl-parity
    content: "JRL editor: quest tree, journal entries, XP/end nodes"
    status: completed
  - id: ltr-parity
    content: "LTR editor: name generator (Markov), letter template"
    status: completed
  - id: ssf-parity
    content: "SSF editor: 28 sound slots, StrRef, getExportBuffer"
    status: completed
  - id: vis-parity
    content: "VIS editor: room visibility, navigation"
    status: completed
  - id: sav-parity
    content: "SAV editor: save game archive browser, metadata"
    status: completed
  - id: erf-parity
    content: "ERF/MOD editor: archive list, add/remove, context menu"
    status: completed
  - id: gff-parity
    content: "GFF editor: generic tree, field editing"
    status: completed
  - id: twoda-parity
    content: "TwoDA editor: spreadsheet, row/column add/remove"
    status: completed
  - id: gui-parity
    content: "GUI editor: GUI-specific controls, preview"
    status: completed
  - id: lip-parity
    content: "LIP editor: keyframe editor, batch processor"
    status: completed
  - id: pth-parity
    content: "PTH editor: path nodes, connectivity"
    status: completed
  - id: wok-bwm-parity
    content: "WOK/BWM editor: walkmesh face/vertex/edge modes"
    status: completed
  - id: nss-editor
    content: "NSS/TabTextEditor: syntax, compile/decompile, bookmarks, snippets, find/replace"
    status: completed
  - id: binary-viewer
    content: "Binary viewer: hex view for unknown types"
    status: completed
  - id: image-viewer
    content: "Image viewer: TPC/TGA"
    status: completed
  - id: model-viewer
    content: "Model viewer: MDL/MDX"
    status: completed
  - id: utc-utw-parity
    content: UTC–UTW blueprint editors, 3D where applicable
    status: completed
  - id: modal-about
    content: "ModalAbout: app name, version, credits"
    status: completed
  - id: modal-settings
    content: "ModalSettings: installations, prefs, updates, theme; ConfigClient"
    status: completed
  - id: modal-clone-module
    content: ModalCloneModule + CloneModule helper
    status: completed
  - id: modal-load-from-module
    content: "ModalLoadFromModule: pick module, list resources"
    status: completed
  - id: modal-save-to-module
    content: "ModalSaveToModule: MOD/Override/RIM; BIF docs"
    status: completed
  - id: modal-extract-options
    content: "ModalExtractOptions: TPC/MDL decompile options"
    status: completed
  - id: modal-insert-instance
    content: "ModalInsertInstance: resref picker for GIT/ARE"
    status: completed
  - id: modal-reference-search
    content: ModalReferenceSearchOptions + TabReferenceFinder
    status: completed
  - id: modal-file-results
    content: "ModalFileResults: search/reference results, open resource"
    status: completed
  - id: modal-resource-comparison
    content: "ModalResourceComparison: GFF-aware diff"
    status: completed
  - id: modal-help-browser
    content: "ModalHelpBrowser / TabHelp: TOC, markdown, wiki mapping"
    status: completed
  - id: modal-update-check
    content: "ModalUpdateCheck: version check, download links"
    status: completed
  - id: modal-patcher
    content: "ModalPatcherProject: TSLPatchData-style packaging"
    status: completed
  - id: modal-lip-batch
    content: ModalLIPBatchProcessor
    status: completed
  - id: modal-change-game
    content: "ModalChangeGame: K1/K2 context"
    status: completed
  - id: dialog-search
    content: "File/search: find by name/type (tab or modal)"
    status: completed
  - id: dialog-editor-help
    content: "Editor help: context per editor (EditorWikiMapping)"
    status: completed
  - id: dialog-theme
    content: "Theme: light/dark/auto in Settings"
    status: completed
  - id: dialog-async-loader
    content: "Async loader: LoadingScreen for long ops"
    status: completed
  - id: window-main
    content: "Main: tab bar, menu, explorer (App.tsx)"
    status: completed
  - id: window-help
    content: "Help: HelpContents, TOC, markdown"
    status: completed
  - id: window-kotordiff
    content: "TabDiffToolState: left/right picker, run diff"
    status: completed
  - id: window-module-designer
    content: "Module designer: create/edit module structure"
    status: completed
  - id: window-file-selection
    content: "File selection: ForgeFileSystem, FileTypeManager"
    status: completed
  - id: widget-command-palette
    content: CommandPaletteState, Ctrl+Shift+P
    status: completed
  - id: widget-code-editor
    content: Monaco, syntax, NWScript/NSS
    status: completed
  - id: widget-find-replace
    content: Find/replace in TabTextEditor
    status: completed
  - id: widget-breadcrumbs
    content: Breadcrumbs in text editor
    status: completed
  - id: widget-resource-filesystem
    content: TabResourceExplorerState, FileBrowserNode
    status: completed
  - id: widget-resource-list
    content: ERF resource list, tree/list
    status: completed
  - id: widget-locstring-edit
    content: "LocString edit: StrRef, substring"
    status: completed
  - id: widget-texture-browser
    content: "Texture browser: TPC preview in pickers"
    status: completed
  - id: widget-media-player
    content: "Media player: WAV inline"
    status: completed
  - id: widget-settings-panels
    content: "Settings panels: Application, Git, Misc, Module Designer, Env Vars"
    status: completed
  - id: utils-script-compiler
    content: ScriptCompiler.ts, NSS→NCS
    status: completed
  - id: utils-script-decompiler
    content: NCS→NSS (NWScript.decompile)
    status: completed
  - id: utils-reference-search-config
    content: ReferenceSearchConfig.ts, GFF fields
    status: completed
  - id: utils-window-routing
    content: FileTypeManager.onOpenResource, restoreTabState
    status: completed
  - id: data-installation
    content: GameFileSystem, ConfigClient, game paths
    status: completed
  - id: data-settings
    content: Settings persistence (ConfigClient, ForgeState)
    status: completed
  - id: config-info
    content: "ConfigInfo.ts: version, URLs"
    status: completed
  - id: config-update
    content: "ConfigUpdate.ts: check for updates"
    status: completed
  - id: config-version
    content: ConfigVersion.ts
    status: completed
  - id: help-contents
    content: HelpContents.ts, HELP_FOLDERS
    status: completed
  - id: help-wiki-mapping
    content: "EditorWikiMapping.ts: editor → help doc"
    status: completed
  - id: help-tutorials
    content: "Help tutorials: markdown + images"
    status: completed
  - id: helpers-save-to-override
    content: SaveToOverride helper
    status: completed
  - id: helpers-save-to-rim
    content: SaveToRim helper
    status: completed
  - id: helpers-add-to-erf
    content: AddResourceToErf
    status: completed
  - id: helpers-extract
    content: ExtractErfToFolder, extract options
    status: completed
  - id: helpers-load-from-capsule
    content: LoadFromCapsule
    status: completed
  - id: helpers-reference-finder
    content: ReferenceFinder, ReferenceFinderCore
    status: completed
  - id: helpers-clone-module
    content: CloneModule
    status: completed
  - id: helpers-lip-batch
    content: LIPBatchProcessor
    status: completed
  - id: menu-structure
    content: "Menu: File, Project, View, Help; all modals reachable"
    status: completed
  - id: theme-system
    content: "Theme: dark/light/auto, applyTheme(), persist"
    status: completed
  - id: indoor-builder-defer
    content: "(Defer) Indoor Map Builder: indoorkit/indoormap"
    status: completed
  - id: blender-defer
    content: (Defer) Blender integration IPC
    status: completed
  - id: i18n-defer
    content: "(Defer) i18n: language files, Settings selector"
    status: completed
  - id: assets-icons-defer
    content: (Optional) Port Holocron icons to src/assets/forge/icons
    status: completed
  - id: tlkwrite-test
    content: (Optional) Jest TLK round-trip test
    status: completed
isProject: false
---

# Holocron Toolset Full Port to Forge

Implement the **entirety** of Holocron Toolset in KotOR.js Forge using **Forge patterns only** (TabState, ModalState, FileTypeManager, EditorFile, ConfigClient). Holocron is reference-only.

---

## Exhaustive Holocron Toolset File Tree

Root: `vendor/PyKotor/Tools/HolocronToolset/src/`

### plugin/ (Spyder IDE — out of scope for Forge)

- `__init__.py`, INTEGRATION_PLAN.md, PLUGIN.md, setup.py
- spyder_holocron_toolset/spyder/: `__init__.py`, container.py, plugin.py, widgets.py

### resources/

- common/: sound-icon.png, stylesheet-branch-*.png, stylesheet-vline.png, voice-icon.png
- icons/: backface.png, cursor.png, holocron_dp.png, k1/ (2da, blank, camera, creature, dialog, door, encounter, git, item, journal, merchant, model, none, placeable, script, sound, soundset, tlk, trigger, walkmesh, waypoint), k2/ (same + brick, texture), kx/ (same as k1), lightmap.png, lock.png, sith.icns, sith.ico, sith.png
- inventory/: clothes.png, droid_*.png, human_*.png, slot.png, trash.png, unknown.png
- other/: AMOLED.qss, andromeda*.qss, aqua.qss, Astolfo.qss, asuna.qss, ConsoleStyle.qss, cyberpunk2077.qss, DraculaDark.qss, ElegantDark.qss, GruvboxDark.qss, MacOS.qss, ManjaroMix.qss, MaterialDark.qss, MonokaiDark.qss, NeonButtons.qss, NordDark.qss, OneDarkPro.qss, ShadesOfPurple.qss, SolarizedDark.qss, Ubuntu.qss
- resources_rc.py, resources.qrc

### toolset/

- `__init__.py`, `__main__.py`, main_app.py, main_init.py, main_settings.py

#### toolset/blender/

- `__init__.py`, commands.py, detection.py, integration.py, ipc_client.py, serializers.py

#### toolset/config/

- `__init__.py`, config_info.py, config_update.py, config_version.py

#### toolset/data/

- `__init__.py`, indoormap.py, installation.py, me_controls.py, misc.py, settings.py
- indoorkit/: `__init__.py`, indoorkit_base.py, indoorkit_loader.py, indoorkit_utils.py, qt_preview.py

#### toolset/gui/

- `__init__.py`, editor.py
- common/: `__init__.py`, debugger.py, extraction_feedback.py, filters.py, language_server_client.py, localization.py, palette_helpers.py
- common/style/: `__init__.py`, delegates.py, palette_utils.py, theme_manager.py, vscode_style.py
- common/widgets/: `__init__.py`, breadcrumbs_widget.py, code_editor.py, collapsible.py, combobox.py, command_palette.py, debug_callstack_widget.py, debug_variables_widget.py, debug_watch_widget.py, find_replace_widget.py, progressbar.py, syntax_highlighter.py, test_config_widget.py, tree.py
- editor/: `__init__.py`, base.py, file.py, media.py
- dialogs/: `__init__.py`, about.py, async_loader.py, blender_choice.py, clone_module.py, editor_help.py, extract_options.py, github_selector.py, indoor_settings.py, insert_instance.py, inventory.py, load_from_location_result.py, load_from_module.py, lyt_dialogs.py, reference_search_options.py, resource_comparison.py, search.py, select_module.py, select_update.py, settings.py, theme_selector.py, tslpatchdata_editor.py, update_dialog.py, update_github.py, update_process.py
- dialogs/save/: `__init__.py`, generic_file_saver.py, to_bif.py, to_module.py, to_rim.py
- dialogs/edit/: `__init__.py`, dialog_animation.py, dialog_model.py, locstring.py
- editors/: `__init__.py`, are.py, bwm.py, erf.py, fac.py, gff.py, ifo.py, jrl.py, ltr.py, mdl.py, nss.py, pth.py, savegame.py, ssf.py, tlk.py, tpc.py, twoda.py, txt.py, utc.py, utd.py, ute.py, uti.py, utm.py, utp.py, uts.py, utt.py, utw.py, wav.py, editor_wiki_mapping.py
- editors/dlg/: `__init__.py`, constants.py, debug_utils.py, editor.py, list_widget_base.py, list_widget_item.py, list_widget_items.py, model.py, node_editor.py, node_types.py, search_manager.py, settings.py, state_manager.py, test2.py, tree_view.py, view_switcher.py, widget_windows.py
- editors/git/: `__init__.py`, controls.py, git.py, mode.py, undo.py
- editors/lip/: `__init__.py`, batch_processor.py, lip_editor.py
- helpers/: callback.py
- widgets/: `__init__.py`, kotor_filesystem_model.py, long_spinbox.py, main_widgets.py, main_widgets.ts, media_player_widget.py, set_bind.py, terminal_widget.py, test.py, texture_loader.py, texture_preview.py
- widgets/edit/: `__init__.py`, color.py, combobox_2da.py, locstring.py, plaintext.py, spinbox.py
- widgets/renderer/: `__init__.py`, lyt_editor_widget.py, lyt_editor.py, lyt_renderer.py, model.py, module.py, texture_browser.py, walkmesh_editor.py, walkmesh.py
- widgets/settings/: `__init__.py`, installations.py, preview_3d.py
- widgets/settings/editor_settings/: `__init__.py`, git.py, lyt.py
- widgets/settings/widgets/: `__init__.py`, application.py, base.py, env_vars.py, git.py, misc.py, module_designer.py
- windows/: `__init__.py`, designer_controls.py, help_content.py, help_paths.py, help_updater.py, help_window.py, help.py, kotordiff.py, main.py, module_designer.py, update_check_thread.py, update_manager.py
- windows/indoor_builder/: `__init__.py`, builder.py, constants.py, kit_downloader.py, renderer.py, undo_commands.py

#### toolset/help/

- contents.xml, introduction1-gettingStarted.md, introduction2-coreResources.md, introduction3-moduleResources.md, introduction4-overrideResources.md
- images/: icon-alt.png, icon-ctrl.png, icon-del.png, icon-lmb.png, icon-mmb.png, icon-rmb.png, icon-scroll.png, icon-shift.png, introduction_1-*.png, introduction_3-*.png, tutorials1-creatingCustomRobes-*.png
- tools/: 1-moduleEditor.md, 2-mapBuilder.md
- tutorials/: 1-creatingCustomRobes.md, 2-creatingANewStore.md, 2a.png–2z.png, 3-areaTransition.md, 3a.png–3r.png, 4-creatingStaticCameras.md

#### toolset/utils/

- `__init__.py`, misc.py, qt_exceptions.py, qt_helpers.py, reference_search_config.py, script_compiler.py, script_decompiler.py, script_utils.py, script.py, window_base.py, window_editor.py, window_resource.py, window.py

### ui/ (Qt .ui layouts — reference only; Forge uses React/TSX)

- convertui.py
- dialogs/: about.ui, add_door_hook.ui, add_room.ui, all_tips.ui, async_loader.ui, batch_processor.ui, better_message_box.ui, blender_choice.ui, clone_module.ui, door_hook_properties.ui, edit_animation.ui, edit_model.ui, edit_trigger.ui, edit_vector3.ui, editor_help.ui, env_variable.ui, extract_options.ui, find_replace.ui, github_selector.ui, indoor_downloader.ui, indoor_settings.ui, insert_instance.ui, inventory.ui, item_builder.ui, load_from_module.ui, locstring.ui, lyt_search_result.ui, modded_value_spinbox.ui, progress_dialog.ui, property.ui, reference_chooser.ui, reference_search_options.ui, resource_comparison.ui, room_properties.ui, save_in_bif.ui, save_in_rim.ui, save_to_module.ui, search_result.ui, search_results_dialog.ui, search.ui, select_module.ui, select_update.ui, set_item_resref.ui, settings.ui, test_config.ui, theme_selector.ui, tlk_loader.ui, track_properties.ui, tslpatchdata_editor.ui, update_dialog.ui, walkmesh_*.ui
- editors/: are.ui, bwm.ui, dlg.ui, erf.ui, fac.ui, gff.ui, git.ui, ifo.ui, jrl.ui, lip.ui, ltr.ui, lyt.ui, mdl.ui, nss.ui, pth.ui, save.ui, savegame.ui, ssf.ui, tlk.ui, tpc.ui, twoda.ui, txt.ui, utc.ui–utw.ui, view_switcher.ui, wav.ui
- widgets/: blender_connection_widget.ui, breadcrumbs_widget.ui, color_edit.ui, command_palette.ui, debug_*.ui, find_bar.ui, find_replace_widget.ui, go_to_bar.ui, left_dock_widget.ui, locstring_edit.ui, lyt_editor_*.ui, media_player_*.ui, pth_status_bar.ui, resource_filesystem_widget.ui, resource_list.ui, set_bind.ui, settings/*.ui, terminal_widget.ui, test_config_widget.ui, texture_browser.ui, texture_list.ui, renderer/*.ui
- windows/: file_selection.ui, help.ui, indoor_builder.ui, kotordiff.ui, lip_syncer.ui, main.ui, module_designer.ui

**Approximate counts:** ~235 Python files, ~127 .ui files, ~56 PNG under resources, 4 config, 11 data (incl. indoorkit), 6 blender. **Total Holocron src:** 987+ files.

---

## Constraints

- No "holocron" naming in Forge. No Qt/toolset paradigms.
- Forge patterns only: TabState, ModalState, EditorTabManager, ModalManagerState, FileTypeManager, EditorFile, ConfigClient, MenuTopState.
- Electron + browser: features must work in both runtimes.

---

## Todo Summary (80 items)

- **Docs (2):** gap matrix, tab contract.
- **TLK write (3):** TLKObject serialization, tab getExportBuffer, dirty state.
- **Editor parity (22):** DLG, ARE, GIT, IFO, FAC, JRL, LTR, SSF, VIS, SAV, ERF, GFF, TwoDA, GUI, LIP, PTH, WOK/BWM, NSS, binary, image, model, UTC–UTW.
- **Modals/dialogs (18):** About, Settings, CloneModule, LoadFromModule, SaveToModule, ExtractOptions, InsertInstance, ReferenceSearchOptions, FileResults, ResourceComparison, HelpBrowser, UpdateCheck, PatcherProject, LIPBatchProcessor, ChangeGame, search, editor help, theme, async loader.
- **Windows (5):** main, help, kotordiff, module designer, file selection.
- **Widgets (10):** command palette, code editor, find/replace, breadcrumbs, resource browser, resource list, locstring, texture browser, media player, settings panels.
- **Utils (4):** script compiler, decompiler, reference search config, window routing.
- **Data/config (5):** installation, settings, config info/update/version.
- **Help (3):** contents, wiki mapping, tutorials.
- **Helpers (8):** SaveToOverride, SaveToRim, AddToErf, Extract, LoadFromCapsule, ReferenceFinder, CloneModule, LIP batch.
- **Integration (2):** menu structure, theme system.
- **Defer/optional (4):** Indoor Builder, Blender, i18n, assets, TLK test.

Mark todos completed as Forge reaches parity for each item.
