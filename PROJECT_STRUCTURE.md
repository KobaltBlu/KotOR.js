# KotOR.js Project Structure

This document provides a detailed overview of the KotOR.js project structure, explaining the purpose and organization of directories and key files.

## Overview

KotOR.js is a TypeScript-based reimplementation of the Odyssey Game Engine. The project is organized into several major components:

- **Core Engine**: Game engine systems and logic
- **Applications**: Multiple Electron-based applications (Launcher, Game, Forge, Debugger)
- **Resource System**: File format parsers and loaders
- **Rendering**: THREE.js-based rendering system
- **Scripting**: NWScript interpreter

## Root Directory

```sh
KotOR.js/
├── src/              # Source code (see below)
├── dist/             # Build output (generated, gitignored)
├── release/          # Electron builds (generated, gitignored)
├── wiki/             # Generated API documentation
├── images/           # Project images and screenshots
├── node_modules/     # npm dependencies (gitignored)
├── main.js           # Electron entry point
├── package.json      # Project configuration and dependencies
├── package-lock.json # Dependency lock file
├── tsconfig.json     # Base TypeScript configuration
├── tsconfig.*.json   # TypeScript configs for specific builds
├── webpack.config.js # Webpack build configuration
├── jest.config.js    # Jest test configuration
├── electron-builder.json # Electron build configuration
├── .eslintrc.yml     # ESLint configuration
├── .editorconfig     # Editor configuration
├── .prettierrc       # Prettier configuration
├── .gitignore        # Git ignore rules
└── README.md         # Project readme
```

## Source Directory (`src/`)

### Core Modules

#### `actions/` - Action System

Game actions that can be queued and executed (movement, combat, item usage, etc.).

- `Action.ts` - Base action class
- `ActionQueue.ts` - Action queue management
- `ActionFactory.ts` - Action creation
- Individual action types (e.g., `ActionMoveToPoint.ts`, `ActionCombat.ts`)

#### `audio/` - Audio Engine

Audio playback, decoding, and effects system.

- `AudioEngine.ts` - Main audio engine
- `AudioLoader.ts` - Audio file loading
- `ADPCMDecoder.ts` - ADPCM audio decoding
- `ReverbEngine.ts` - Reverb effects

#### `combat/` - Combat System

Combat mechanics, damage calculation, and combat rounds.

- `CombatData.ts` - Combat state
- `CombatRound.ts` - Combat round management
- `CombatAttackData.ts` - Attack information
- `SpellCastInstance.ts` - Spell casting

#### `controls/` - Input Handling

Keyboard, mouse, and gamepad input management.

- `Keyboard.ts` - Keyboard input
- `Mouse.ts` - Mouse input
- `GamePad.ts` - Gamepad support
- `KeyMapper.ts` - Key mapping system
- `IngameControls.ts` - In-game control handling

#### `effects/` - Game Effects

Game effects system (spells, abilities, item properties).

- Various effect types (damage, healing, stat modifications, etc.)
- Effect application and management

#### `engine/` - Core Engine Systems

Core game engine functionality.

- `CurrentGame.ts` - Current game state
- `EngineContext.ts` - Engine context
- `SaveGame.ts` - Save game handling
- `rules/` - Game rules (SWRuleSet, etc.)
- `pathfinding/` - Pathfinding system
- `menu/` - Menu systems

#### `enums/` - TypeScript Enumerations

Type-safe enumerations for game constants.

- Organized by category (actions, audio, combat, etc.)
- `index.ts` - Barrel export

#### `events/` - Event System

Game event handling and dispatching.

- Event types and handlers
- Event factory

#### `gui/` - GUI System

Game GUI components and rendering.

- `GUIControl.ts` - Base GUI control
- `GUIButton.ts`, `GUILabel.ts`, etc. - Specific controls
- `GameMenu.ts` - Game menu system

#### `interface/` - Type Definitions

TypeScript interfaces and type definitions.

- Organized by category
- Type definitions for game objects

#### `loaders/` - Resource Loaders

Resource loading and caching system.

- Various loader types
- Resource caching

#### `managers/` - Game Managers

High-level game state managers.

- `ModuleObjectManager.ts` - Module object management
- `DialogMessageManager.ts` - Dialog system
- `InventoryManager.ts` - Inventory management
- `PartyManager.ts` - Party management
- And many more...

#### `module/` - Module System

Module loading and management (IFO files, areas, etc.).

- `Module.ts` - Main module class
- Module-related utilities

#### `nwscript/` - NWScript Interpreter

NWScript bytecode interpreter and execution.

- `NWScript.ts` - Main interpreter
- `NWScriptInstance.ts` - Script instance
- `NWScriptDefK1.ts`, `NWScriptDefK2.ts` - Script definitions

#### `odyssey/` - Odyssey Format Parsers

Parsers for Odyssey engine file formats.

- Model formats (MDL, MDX)
- Animation formats
- Texture formats
- `controllers/` - Animation controllers

#### `resource/` - Resource File Formats

Parsers for game resource formats.

- `GFFObject.ts` - GFF file format
- `ERFObject.ts` - ERF archive format
- `KEYObject.ts` - KEY file format
- `BIFObject.ts` - BIF archive format
- `RIMObject.ts` - RIM archive format
- And more...

#### `shaders/` - Shader Code

GLSL shaders for rendering.

- Various shader files

#### `talents/` - Talent System

Feats, skills, and spells system.

- `TalentObject.ts` - Base talent
- `TalentFeat.ts` - Feats
- `TalentSkill.ts` - Skills
- `TalentSpell.ts` - Spells

#### `three/` - THREE.js Utilities

THREE.js helper utilities and extensions.

- THREE.js integration code

#### `utility/` - Utility Functions

General-purpose utility functions.

- `binary/` - Binary reading/writing
- `GameFileSystem.ts` - File system abstraction
- `ConfigClient.ts` - Configuration management
- And more...

#### `worker/` - Web Workers

Web worker scripts for background processing.

- `server.ts` - Worker server
- `worker-tex.ts` - Texture processing worker

### Application Entry Points (`apps/`)

#### `apps/launcher/` - Launcher Application

Main launcher UI for selecting and launching games.

- `index.tsx` - Main launcher component
- React components for launcher UI
- SCSS styles

#### `apps/game/` - Game Client Application

Main game client application.

- `index.tsx` - Game client entry point
- `app.tsx` - Main game app component
- React components for game UI

#### `apps/forge/` - KotOR Forge Modding Suite

Modding tool suite for creating and editing KotOR content.

- `index.tsx` - Forge entry point
- `App.tsx` - Main Forge application
- `Project.ts` - Project management
- `EditorFile.ts` - File editing
- Various editor components
- Monaco Editor integration

#### `apps/debugger/` - Debugger Application

Development debugger for inspecting game state.

- `index.tsx` - Debugger entry point
- Debugger UI components

#### `apps/common/` - Shared Application Code

Code shared between applications.

- Common components and utilities

### Electron (`electron/`)

Electron main process code.

- `Main.ts` - Main Electron process
- `ApplicationWindow.ts` - Application window management
- `LauncherWindow.ts` - Launcher window
- `WindowManager.ts` - Window management
- `preload.ts` - Preload scripts

### Game-Specific Data (`game/`)

Game-specific data and definitions.

- `kotor/` - KotOR I specific data
- `tsl/` - KotOR II (TSL) specific data
- `CharGenClasses.ts` - Character generation classes

### Root Source Files

- `KotOR.ts` - Main library entry point and exports
- `GameInitializer.ts` - Game initialization logic
- `GameState.ts` - Game state management
- `LoadingScreen.ts` - Loading screen
- `index.d.ts` - TypeScript declaration file

## Build Configuration

### TypeScript Configurations

- `tsconfig.json` - Base configuration
- `tsconfig.electron.json` - Electron build
- `tsconfig.launcher.json` - Launcher build
- `tsconfig.game.json` - Game client build
- `tsconfig.forge.json` - Forge build
- `tsconfig.debugger.json` - Debugger build
- `tsconfig.kotorjs.json` - Library build

### Webpack Configuration

`webpack.config.js` defines multiple build configurations:

- Library build (KotOR.js)
- Launcher build
- Game client build
- Forge build
- Debugger build

Each build has its own entry point, output directory, and specific settings.

## Output Directories

### `dist/` - Build Output

Generated by webpack, contains:

- `KotOR.js` - Main library bundle
- `server.js` - Worker server bundle
- `launcher/` - Launcher application
- `game/` - Game client
- `forge/` - Forge application
- `debugger/` - Debugger application
- Assets (icons, fonts, etc.)

### `release/` - Electron Builds

Generated by electron-builder, contains platform-specific builds:

- Windows portable executables
- macOS DMG files
- Linux AppImages

## Development Workflow

1. **Source Code**: Edit files in `src/`
2. **Build**: Webpack compiles to `dist/`
3. **Run**: Electron loads from `dist/`
4. **Test**: Jest tests in `src/tests/` or `*.spec.ts` files
5. **Document**: TypeDoc generates `wiki/`

## Key Concepts

### Module System

Modules represent game areas/levels. Each module has:

- IFO file (module info)
- ARE file (area data)
- GIT file (game instance template)
- Associated resources (models, textures, scripts)

### Resource System

Resources are loaded from:

- BIF archives (game data)
- ERF archives (mods)
- RIM files (module-specific)
- KEY files (resource index)

### Rendering Pipeline

- THREE.js for 3D rendering
- Custom shaders for game-specific effects
- Odyssey format models and animations
- GUI overlay system

## File Naming Conventions

- **Classes**: PascalCase (e.g., `GameState.ts`)
- **Utilities**: camelCase (e.g., `binaryReader.ts`)
- **Interfaces**: PascalCase, often prefixed with `I` (e.g., `IGameState.ts`)
- **Enums**: PascalCase (e.g., `GameEngineType.ts`)
- **Tests**: `*.spec.ts` or `*.test.ts`
- **Index files**: `index.ts` for barrel exports

## Dependencies

Major dependencies (see `package.json`):

- **TypeScript**: Language and type system
- **React**: UI framework for applications
- **THREE.js**: 3D rendering
- **Electron**: Desktop application framework
- **Webpack**: Build system
- **Jest**: Testing framework
- **Monaco Editor**: Code editor (Forge)

## Getting Started

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions.

## Additional Resources

- [API Documentation](wiki/) - Generated TypeDoc documentation
- [README.md](README.md) - Project overview
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
