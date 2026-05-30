# KotOR.js AI Coding Assistant Instructions

## Language and behavior notes
- When describing game parity with the originals, say **"observed original game behavior"**.
- Do not include discussion of reverse engineering methods.

## Big picture architecture
- Core engine is TypeScript under `src/`; rendering is THREE.js; desktop runtime is Electron.
- Startup flow is centered in `src/GameInitializer.ts`: initialize managers into `GameState`, load KEY/TLK/2DA resources, then initialize controls/rules.
- Runtime global access pattern is `CurrentGame`/`GameState` singletons (see `src/engine/CurrentGame.ts`, `src/GameState.ts`, `src/managers/`).
- Module flow spans multiple files: `GameInitializer.Init` → `Module`/`ModuleArea` load (`src/module/Module.ts`, `src/module/ModuleArea.ts`) → NWScript hooks.
- Resource lookup/caching is in `src/loaders/ResourceLoader.ts` with scope precedence: override → module → global → fallback cache.

## Core subsystem patterns
- **Actions**: add new action classes in `src/actions/`, then register switch mapping in `src/actions/ActionFactory.ts` (`FromStruct`).
- **Resources/GFF**: engine formats are in `src/resource/`; most editor/game object data is read via `GFFObject`/`GFFStruct` field accessors.
- **Scripting**: NWScript runtime is in `src/nwscript/`; K1/K2 differences are split into `NWScriptDefK1.ts` and `NWScriptDefK2.ts`.
- Prefer existing aliases/import style (`@/...`) from `tsconfig.json` (`paths: { "@/*": ["src/*"] }`).

## Forge app + VS Code extension integration
- Forge editors live in `src/apps/forge/` and are reused by the extension webview (no duplicate editor implementations).
- Extension provider maps file extension → editor type in `extensions/kotor-forge-vscode/src/providers/KotorForgeProvider.ts`.
- Webview maps editor type → Forge `TabState` in `extensions/kotor-forge-vscode/src/webview/forgeEditorRegistry.ts`.
- For new editor support, update both mappings (provider + webview registry) and extension `package.json` `customEditors` selector if needed.
- Webview/host protocol and sync behavior are documented in `extensions/kotor-forge-vscode/WEBVIEW_VSCODE_SYNC_DESIGN.md`.

## Developer workflows (verified scripts)
- Root install: `npm install`
- Root web watch: `npm run webpack:dev-watch`
- Start Electron app: `npm start`
- Tests: `npm test` (Jest, `**/*.test.ts`; see ignores in `jest.config.js`)
- API docs: `npm run typedoc`
- Extension build: from `extensions/kotor-forge-vscode/`, run `npm run compile` (or `npm run watch` while developing extension/webview)

## Project-specific conventions to preserve
- Use 2-space indentation and existing TypeScript style in touched files.
- Keep changes scoped: update registry/mapping files when adding types rather than introducing parallel pathways.
- For resource-format changes, add/update tests near `src/resource/*.test.ts` when applicable.
- This repo requires local KotOR I/II installs for full runtime validation; no game assets are stored in this repository.