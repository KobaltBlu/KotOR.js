# KotOR Forge VS Code Extension – API and Contribution Reference

This document lists the VS Code APIs and contribution points used by the KotOR Forge extension for discoverability, accessibility, and workflow. It serves as a living reference for future integration work.

## Contribution Points in Use

| Contribution | Purpose |
|--------------|---------|
| **customEditors** | KotOR Forge (default), Generic GFF, JSON View for binary KotOR files |
| **languages** | `nwscript` (.nss, .ncs) |
| **grammars** | TextMate grammar `source.nwscript` |
| **iconThemes** | `kotor-icons` file icon theme |
| **configuration** | kotorForge.* (paths, active game, log level), nwscript.* (LSP) |
| **debuggers** | `nwscript` debugger type |
| **breakpoints** | Breakpoints enabled for language `nwscript` |
| **commands** | Path setters, Open as JSON, Format, Sort, Open documentation |
| **menus** | editor/context (submenu, Open as JSON, Format, Sort, Start Debugging) |
| **keybindings** | Format (Alt+Shift+F), Sort (Alt+Shift+S) for KotOR extensions |
| **walkthroughs** | Get Started with KotOR Forge |
| **viewsContainers** | Activity bar container "KotOR Forge" |
| **views** | "Recent KotOR Files" tree view |
| **viewsWelcome** | Welcome content when view is empty (set path / open file) |
| **submenus** | "KotOR Forge" submenu in editor context |
| **snippets** | NWScript snippets (main, GetPC, switch, loops, etc.) |
| **taskDefinitions** | `kotor-forge` task type |
| **colors** | `kotorForge.statusBar.foreground` for status bar theming |
| **chatInstructions** | NWScript/KotOR conventions when editing .nss/.ncs |

## Runtime APIs in Use

| API | Usage |
|-----|--------|
| **vscode.window** | createOutputChannel, createWebviewPanel, registerCustomEditorProvider, showOpenDialog, show*Message, activeTextEditor, tabGroups, createStatusBarItem, createTreeView |
| **vscode.workspace** | getConfiguration, fs (readFile, writeFile, delete), createFileSystemWatcher, registerTextDocumentContentProvider, findFiles |
| **vscode.commands** | registerCommand, executeCommand, getCommands, setContext |
| **vscode.debug** | registerDebugConfigurationProvider, registerDebugAdapterDescriptorFactory, registerDebugAdapterTrackerFactory, startDebugging |
| **vscode.languages** | registerDocumentFormattingEditProvider (nwscript) |
| **vscode.tasks** | registerTaskProvider (kotor-forge) |
| **vscode.env** | openExternal (documentation link) |
| **ExtensionContext** | subscriptions, extensionUri, globalState, asAbsolutePath |
| **ThemeColor** | Status bar item color for theme/high-contrast |

## Document Sync (Webview ↔ VS Code)

- **Undo/Redo:** Full-buffer strategy; Forge editors notify the host via `IForgeHostAdapter.onEdit()` (debounced); webview applies undo/redo by replacing buffer and re-opening the tab.
- **Revert:** Provider posts `revert` with disk content; webview replaces buffer and re-opens tab.
- **Format/Sort:** Commands post `runCommand` to the webview; webview invokes tab.format() / tab.sort() where implemented.

## Adding New Integrations

- **New contribution:** Add to `package.json` under `contributes` and implement the handler in `extension.ts` or a dedicated module.
- **New command:** Add to `contributes.commands` and `extension.ts`; add to `kotor-forge.menu` if it belongs in the KotOR Forge submenu.
- **New view:** Add to `contributes.views` under the `kotor-forge` container and register a TreeDataProvider in code.

See the [Forge VS Code Extension Continuation plan](.cursor/plans/forge_vs_code_extension_continuation_043b7c2e.plan.md) for the full design and phase breakdown.
