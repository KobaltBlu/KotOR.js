# KotOR.js AI Coding Assistant Instructions

## Observed Original Game Behavior
- Avoid including any discussion or documentation of how behavior was determined or verified.
- When referencing behavior derived from the original game, use phrases like "observed original game behavior" instead of terms that suggest implementation method.

## Project Overview

KotOR.js is a TypeScript reimplementation of the Odyssey Game Engine (from Star Wars: Knights of the Old Republic I & II). It uses THREE.js for rendering, Electron for desktop app distribution, and includes an NWScript interpreter for game scripting.

## Core Architecture

### Major Components & Their Relationships

**1. Game Initialization & State**
- `GameInitializer` - Bootstraps the engine, loads game archives (KEY, BIF, RIM, ERF files)
- `CurrentGame` - Active game state container holding references to all managers
- `Module` - Level/area representation with terrain, objects, scripts, and time management
- `ModuleArea` - Individual areas within a module (rooms, outdoor sections)

**2. Manager System (Singleton Pattern)**
Located in `src/managers/`, these manage specific game systems:
- `ModuleObjectManager` - Creature/placeable/item lifecycle
- `DialogMessageManager` - Conversation system
- `InventoryManager` - Item management
- `PartyManager` - Party composition and NPC management
- `TwoDAManager` - Caches 2DA data files (game rules, appearance, items)
- Other managers: TLKManager (dialog text), ConfigManager, AudioEngine, ShaderManager, etc.

Accessed globally via static properties: `CurrentGame.<Manager>.method()`.

**3. Action & Combat System**
- `Action` (base class) + 30+ action types - Discrete behaviors (move, attack, cast spell, dialog)
- `ActionQueue` - Per-object action queue supporting grouping and clearing
- `CombatRound`, `CombatAttackData` - Turn-based combat mechanics
- Actions read from GFF structs (.utc files for creatures)

**4. Resource System**
Handles binary file format parsing:
- `GFFObject`/`GFFStruct`/`GFFField` - GFF (generic file format) parsing, base for .utc/.uti/.are files
- Archive types: `KEYObject` (index), `BIFObject` (data), `RIMObject` (RIM archives), `ERFObject` (ERF/MOD archives)
- Data types: `TwoDAObject` (2D arrays), `TLKObject` (dialog strings), `TGAObject`/`TPCObject` (images)
- Dialog: `DLGObject` for conversation trees

**5. Rendering & Odyssey System**
- `OdysseyController` - Node hierarchy for game objects in scene
- `OdysseyWalkMesh` - Collision/movement surfaces
- Node types: Mesh, Light, Emitter, Dangly (animated), Skin (character), Saber, Reference
- THREE.js integration in `src/three/odyssey/`

**6. Scripting**
- `NWScript` - Compiled script loader/executor (.ncs bytecode files)
- `NWScriptInstance` - Runtime script execution environment
- `NWScriptDefK1`/`NWScriptDefK2` - Action definitions for each game version
- NCS-to-NSS converter in `NWScript.decompiler` for debugging

## Developer Workflows

### Development Setup
```bash
npm install
npm run watch                 # Terminal 1: Watch mode build
npm start                     # Terminal 2: Launch Electron app
```

### Testing & Quality
```bash
npm test                      # Run Jest tests (testMatch: **/*.test.ts)
npm test                      # Includes coverage; use test:quick for fast run
npm run lint                  # ESLint check
npm run typedoc               # Generate API docs in wiki/
```

### Build Variants
- `tsconfig.electron.json` - Electron main process (tsc target)
- `tsconfig.game.json` - Game code (webpack/esbuild target)
- `tsconfig.json` - Base config
- `webpack.config.js` - Bundles with SCSS/CSS support

## Project-Specific Patterns

### 1. Manager Access Pattern
```typescript
// Managers are globally accessible via CurrentGame singleton
import { CurrentGame } from './engine/CurrentGame';

CurrentGame.moduleObjectManager.getObjectByTag(tag);
CurrentGame.partyManager.getPartyMembers();
```

### 2. Action System Pattern
```typescript
// Create and queue actions (see ActionFactory)
const action = ActionFactory.CreateAction(ActionType.ActionMoveToPoint);
action.SetParameter(0, ActionParameterType.Location, targetLocation);
creature.actionQueue.Add(action);
```

### 3. GFF Parsing Pattern
```typescript
// GFF structs are hierarchical: GFFObject > GFFStruct > GFFField
const struct = gffObject.getTopLevelObject();
const name = struct.getFieldByLabel('FirstName')?.getValue();
const type = field.getFieldType();  // Returns GFFDataType enum
```

### 4. Script Execution Pattern
```typescript
// Scripts are compiled bytecode files executed per NWScriptDef
const script = await NWScript.LoadScript('modulename_onenter');
const instance = new NWScriptInstance(script, owner);
instance.execute();
```

## Critical Cross-Component Flows

**Loading a Module:**
GameInitializer → Module.Load(ifoFile) → ModuleArea.Load() → Creates ModuleObjects → Loads NWScripts → Executes Mod_OnModLoad event

**Executing an Action:**
Action.Update() checks ActionStatus → Calls subclass virtual methods → May queue follow-up actions → Triggers game events

**Loading a Resource:**
ResourceLoader.demand() → Checks archives (KEY→BIF lookup, or RIM/ERF) → Parses format-specific handler (GFF, TPC, etc.) → Caches result

## Key Files to Reference

| Task                       | File(s)                                                         |
| -------------------------- | --------------------------------------------------------------- |
| Add new action type        | `src/actions/Action.ts` (extend), `ActionFactory.ts` (register) |
| Add game manager           | `src/managers/` + export in `index.ts`                          |
| Parse new GFF-based format | `src/resource/GFFObject.ts` + create handler                    |
| Add NWScript instruction   | `NWScriptDefK1.ts` or `NWScriptDefK2.ts`                        |
| Add rendering node type    | `src/odyssey/OdysseyModelNode*.ts`                              |
| Game rules/data            | `src/engine/rules/SWRuleSet.ts`, `TwoDAObject.ts`               |

## Conventions

- **File naming**: PascalCase for classes, camelCase for utils
- **Test files**: `*.spec.ts` or `*.test.ts` (Jest looks for `**/*.test.ts`)
- **Indentation**: 2 spaces
- **Async patterns**: Use async/await with ResourceLoader (returns Promises)
- **Error handling**: Type guards preferred over try/catch for resource loading
- **Enums**: Organize by category in `src/enums/` mirroring src structure
- **Comments**: JSDoc style with @file, @author, @license headers for major classes

## Important Context

- **No game files included** - Project requires valid KotOR I/II installation for testing
- **Multi-platform** - Windows, macOS, Linux; browser support via HTTPS only
- **Hot-reload ready** - Webpack watch mode auto-refreshes Electron during dev
- **TypeScript strict mode** - Target ES2020+, strict null checks enabled
- **Version-specific differences** - K1 vs K2 scripts, models, rules managed via NWScriptDefK1/K2

## Debugging Tips

1. **Electron DevTools**: Available in runtime, use console.log and debugger
2. **Type checking**: `npx tsc --noEmit` for full project type check
3. **Performance**: `PerformanceMonitor` utility in codebase for profiling
4. **Script conversion**: NWScript converts .ncs bytecode to NSS source
5. **Resource issues**: Check archive loading order (KEY→BIF→RIM→ERF) in GameFileSystem

---

## Forge & VS Code Extension (Modding Toolkit)

KotOR.js also includes **Forge** (a modding toolkit) and a **VS Code extension** that uses Forge in a webview. Use **AGENTS.md** at the repo root as the single source for agent context on these parts.

### Quick reference

- **Forge** (`src/apps/forge/`): Visual editors for KotOR file formats. Each format is handled by a **TabState** subclass (e.g. `TabTwoDAEditorState`, `TabTLKEditorState`, `TabJsonViewState`) and a React component under `components/tabs/`. `EditorFile` holds path and buffer; `IForgeHostAdapter` delegates save/tabs (Electron = real FS, webview = extension via postMessage).
- **Extension** (`extensions/kotor-forge-vscode/`): Registers custom editors for KotOR files. File extension → **editorType** (e.g. `.2da` → `2da`); webview **forgeEditorRegistry** maps editorType → TabState class. Adding a new editor: add TabState + component in Forge, then add to `EDITOR_MAP` in `forgeEditorRegistry.ts` and to `getEditorTypeFromExt` in `KotorForgeProvider.ts`.
- **Webview sync**: Extension and webview communicate with messages (`init`, `edit`, `undo`, `redo`, `revert`, `requestSave`, `saveComplete`, `getFileData`, etc.). See `extensions/kotor-forge-vscode/WEBVIEW_VSCODE_SYNC_DESIGN.md`.

When changing resource formats, add or update tests in `src/resource/*.test.ts`. When changing the extension, build from `extensions/kotor-forge-vscode/` with `npm run compile` (or `npx webpack --mode production` for extension + webview only).

---

For detailed architecture, see [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md). For setup help, see [SETUP.md](../SETUP.md). **For Forge, extension, and editor-type mappings, see [AGENTS.md](../AGENTS.md).**
