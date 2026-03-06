# KotOR.js

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![THREE JS](https://img.shields.io/badge/ThreeJs-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)](https://www.electronjs.org/)
[![Node JS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/)
[![Webpack](https://img.shields.io/badge/Webpack-8DD6F9?style=for-the-badge&logo=Webpack&logoColor=white)](https://webpack.js.org/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](LICENSE.md)

<p align="center">
  <img src="https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/src/assets/icons/icon.png" alt="KotOR.js Logo" />
</p>

**A TypeScript reimplementation of the Odyssey Game Engine that powered Star Wars: Knights of the Old Republic I & II — playable in both Electron and the browser.**

[![OpenKotOR Discord](https://discordapp.com/api/guilds/739590575359262792/widget.png?style=banner2)](https://discord.gg/QxjqVAuN8T)

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Screenshots & Demo](#screenshots--demo)
4. [Videos](#videos)
5. [Project Architecture](#project-architecture)
6. [Repository Structure](#repository-structure)
7. [Requirements](#requirements)
8. [Quick Start](#quick-start)
9. [Installation](#installation)
10. [Build Instructions](#build-instructions)
11. [Running the Project](#running-the-project)
12. [Testing](#testing)
13. [Roadmap](#roadmap)
14. [Contributing](#contributing)
15. [FAQ & Troubleshooting](#faq--troubleshooting)
16. [Resources](#resources)
17. [Credits](#credits)
18. [License](#license)

---

## Overview

**KotOR.js** is an open-source reimplementation of the **Odyssey Game Engine** — the engine that originally powered *Star Wars: Knights of the Old Republic* (KotOR I) and *Knights of the Old Republic II: The Sith Lords* (TSL).

Written entirely in TypeScript, KotOR.js targets both desktop environments (via Electron) and modern web browsers (via WebGL/WebAssembly). The project reads original game assets from a valid, user-supplied installation of KotOR I or KotOR II — no copyrighted content is distributed with this project.

**Who is this for?**

- Developers interested in contributing to an open game engine
- KotOR modders who want to run mods in a modern, programmable environment
- Researchers and enthusiasts studying classic RPG engine design
- Players who want to play KotOR in a browser or on platforms the original never supported

**Live Demo:** [![Online Playable Demo](https://img.shields.io/badge/Online_Playable_Demo-37a779?style=for-the-badge&logoColor=white&logo=google-chrome)](https://play.swkotor.net/)

---

## Features

### Core Engine
- ✅ Full 3D rendering via **Three.js** (WebGL), including post-processing effects
- ✅ Original **Odyssey model format** (MDL/MDX) loading, skinning, and animation
- ✅ Walkmesh & pathfinding collision detection
- ✅ Dynamic lighting with EAX-style reverb audio zones
- ✅ Spatial audio engine with streaming and ADPCM decoding
- ✅ BIK video playback (cutscenes)

### Game Systems
- ✅ Full **NWScript bytecode VM** with ~87% of KotOR I functions implemented
- ✅ Module/area loading, transitions, and persistence
- ✅ Creature, door, placeable, trigger, and waypoint object graph
- ✅ Action queue system (45+ action types)
- ✅ Effect system (60+ effect types including Force powers, damage shields, time stop)
- ✅ Saving throw mechanics (Fortitude, Reflex, Will) with D20 auto-success/fail rules
- ✅ Save / load game (full round-trip with inventory and party state)
- ✅ Party management, formation, and follower AI
- ✅ Combat rounds: attack rolls, dual-wield scheduling, critical hit detection
- ✅ Dialogue/conversation system with script callbacks
- ✅ Inventory, store/merchant buy/sell
- ✅ Galaxy map, journal/quest log, character generation menus
- ✅ Pazaak minigame (partial)
- ✅ K2 influence system (`GetInfluence` / `SetInfluence` / `ModifyInfluence`)

### Resource Handling
- ✅ KEY/BIF, RIM, ERF, MOD archive parsing
- ✅ GFF binary structure parsing (creatures, items, areas, dialogs, saves)
- ✅ TPC/TGA texture decoding with DXT compression support
- ✅ TLK string table loading
- ✅ 2DA rule table loading and caching

### Applications
- ✅ **Launcher** — React-based game file selector and profile manager
- ✅ **Game Client** — Fully playable game running in Electron or the browser
- ✅ **KotOR Forge** — Integrated modding suite with 3D viewport and Monaco code editor
- ✅ **Debugger** — Developer inspection and testing tools

### Platform Support
- ✅ Windows / macOS / Linux (via Electron)
- ✅ Browser (Chrome recommended; requires HTTPS)
- [Browser Compatibility Table](https://github.com/KobaltBlu/KotOR.js/wiki/Browser-Support)

---

## Screenshots & Demo

<div align="center">

| **Launcher** | **KotOR I – Taris: Undercity** | **KotOR I – Dantooine** |
|:---:|:---:|:---:|
| ![KotOR.js Launcher](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/KotOR-js-Launcher-001.jpg) | ![Taris: Undercity](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K1-Screen-001.jpg) | ![Dantooine](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K1-Screen-003.jpg) |
| **KotOR II – Awaken Scene** | **KotOR II – Awaken Scene 2** | |
| ![KotOR II Awaken](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K2-Screen-001.jpg) | ![KotOR II Awaken 2](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K2-Screen-002.jpg) | |

</div>

---

## Videos

<div align="center">

| **KotOR.js (2023) – In-Browser Demo** | **Combat Animations – Jan 2021** | **KotOR Forge – Lip Sync Editor Jan 2019** |
|:---:|:---:|:---:|
| [![In-Browser Demo](https://img.youtube.com/vi/ZT_9vKRC1t8/0.jpg)](https://www.youtube.com/watch?v=ZT_9vKRC1t8) | [![Combat Animations](https://img.youtube.com/vi/4oQ8nj_zO-w/0.jpg)](https://www.youtube.com/watch?v=4oQ8nj_zO-w) | [![Lip Sync Editor](https://img.youtube.com/vi/4s4uTyP5yqA/0.jpg)](https://www.youtube.com/watch?v=4s4uTyP5yqA) |
| **Lighting & Lipsync – Nov 2018** | **TSL Gameplay – Sep 2018** | **The Endar Spire – Sep 2018** |
| [![Lighting & Lipsync](https://img.youtube.com/vi/2SATn5W2sb4/0.jpg)](https://www.youtube.com/watch?v=2SATn5W2sb4) | [![TSL Gameplay](https://img.youtube.com/vi/IpP6BQJ5ZBQ/0.jpg)](https://www.youtube.com/watch?v=IpP6BQJ5ZBQ) | [![The Endar Spire](https://img.youtube.com/vi/y2UzOH5bcAQ/0.jpg)](https://www.youtube.com/watch?v=y2UzOH5bcAQ) |

</div>

---

## Project Architecture

KotOR.js is structured as a monorepo containing several independently deployable applications, all sharing a common core library.

```
User (Browser or Electron)
        │
        ▼
 ┌──────────────┐
 │   Launcher   │  React UI – game file selection & profile management
 └──────┬───────┘
        │
        ▼
 ┌──────────────┐
 │  Game Client │  React + Three.js – main gameplay loop
 └──────┬───────┘
        │
   ┌────┴────────────────────────────────────┐
   │               KotOR.js Core             │
   │                                         │
   │  GameInitializer  GameState             │
   │  Module System    NWScript VM           │
   │  GUI System       Action Queue          │
   │  Effect System    Audio Engine          │
   │  Combat System    Save/Load             │
   └─────────────────────────────────────────┘
        │                         │
        ▼                         ▼
 ┌─────────────┐        ┌──────────────────┐
 │ Odyssey 3D  │        │  Resource Layer  │
 │   Engine    │        │  KEY/BIF/ERF/GFF │
 │ (Three.js)  │        │  TPC/TGA/2DA/TLK │
 └─────────────┘        └──────────────────┘
        │
        ▼
   Game Assets (user-supplied KotOR I/II installation)
```

**Five Webpack bundles are produced:**

| Bundle | Path | Description |
|--------|------|-------------|
| `KotOR.js` | `dist/KotOR.js` | Core library (importable by external tools) |
| Launcher | `dist/launcher/` | Game file selector React app |
| Game | `dist/game/` | Playable game client |
| Forge | `dist/forge/` | KotOR Forge modding editor |
| Debugger | `dist/debugger/` | Developer tools |

---

## Repository Structure

```
OpenKotor/
├── src/
│   ├── KotOR.ts              # Main library export
│   ├── GameInitializer.ts    # Boot sequence orchestrator
│   ├── GameState.ts          # Global singleton state
│   ├── apps/
│   │   ├── launcher/         # Launcher React app
│   │   ├── game/             # Game client React app
│   │   ├── forge/            # KotOR Forge modding suite
│   │   ├── debugger/         # Developer tools
│   │   └── common/           # Shared React components
│   ├── engine/               # Game logic (save/load, rules, pathfinding)
│   ├── module/               # Game world (areas, creatures, objects)
│   ├── odyssey/              # 3D rendering engine (models, walkmesh, animation)
│   ├── nwscript/             # NWScript bytecode VM + K1/K2 function libraries
│   ├── resource/             # Game file format parsers (GFF, TPC, TLK, ERF…)
│   ├── loaders/              # Asset loaders (textures, models, resources)
│   ├── audio/                # Audio engine (spatial, reverb, ADPCM)
│   ├── combat/               # Combat rounds and attack data
│   ├── effects/              # Game effect types (60+)
│   ├── actions/              # Action queue system (45+ action types)
│   ├── managers/             # High-level system managers (party, menu, cutscene…)
│   ├── gui/                  # In-game UI controls and menus
│   ├── controls/             # Input handling (keyboard, gamepad, mouse)
│   ├── video/                # BIK video demuxer and playback
│   ├── shaders/              # GLSL shader programs
│   ├── enums/                # Game constants and enumerations
│   ├── types/                # TypeScript type definitions
│   ├── utility/              # Helper functions and file system abstraction
│   ├── electron/             # Electron main process integration
│   ├── server/               # IPC handlers and backend object managers
│   └── worker/               # Web workers (texture decode, server, bink)
├── images/
│   └── screenshots/          # Project screenshots
├── main.js                   # Electron main process entry point
├── webpack.config.js         # Webpack bundle configuration (5 entries)
├── tsconfig*.json            # TypeScript configs per build target
├── jest.config.js            # Jest test configuration
├── electron-builder.json     # Electron packaging settings
├── ROADMAP.md                # Detailed development roadmap
├── LICENSE.md                # GPL 3.0 license
└── package.json              # NPM scripts and dependencies
```

---

## Requirements

### Game Files
A valid installation of **KotOR I** or **KotOR II (The Sith Lords)** is required. No game files are included in this repository.

Supported platforms:
- [x] Star Wars: Knights of the Old Republic (PC)
- [x] Star Wars: Knights of the Old Republic II: The Sith Lords (PC)

### Development Tools

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | ≥ 18 | Includes npm |
| [npm](https://www.npmjs.com/) | ≥ 9 | Bundled with Node.js |
| A modern web browser | latest | Chrome recommended for browser play |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/awest813/OpenKotor.git
cd OpenKotor

# 2. Install dependencies
npm install

# 3. Build (watch mode) — keep this running in one terminal
npm run webpack:dev-watch

# 4. Launch the Electron app — run in a second terminal
npm run start
```

That's it! The Electron launcher will open. Point it at your KotOR I or II installation folder to begin.

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/awest813/OpenKotor.git
cd OpenKotor
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages, including TypeScript, Webpack, Three.js, React, and Electron.

---

## Build Instructions

KotOR.js uses **Webpack 5** to produce multiple bundles from a shared TypeScript codebase.

### Development Build (recommended for contributors)

Builds all bundles with source maps and watches for changes:

```bash
npm run webpack:dev-watch
```

For a one-time development build without watching:

```bash
npm run webpack:dev
```

### Production Build

Produces minified, optimized bundles for deployment:

```bash
npm run webpack:prod
```

Output is written to the `dist/` directory.

### Electron-Only Build

Compiles only the Electron main process TypeScript:

```bash
npm run electron:compile
```

Full Electron production package (Electron + all bundles):

```bash
npm run electron:build
```

### API Documentation

Generate TypeDoc HTML documentation:

```bash
npm run typedoc
```

---

## Running the Project

### Desktop Application (Electron)

Start the Electron development build (requires a running webpack build):

```bash
# Terminal 1 – keep the build server running
npm run webpack:dev-watch

# Terminal 2 – launch Electron
npm run start
```

Alternatively, start with a combined watcher:

```bash
npm run start-watch
```

### Web Browser

Build the project and serve the contents of `dist/` from a web server with a valid SSL certificate (HTTPS). The Launcher is served from `/launcher/` and the game from `/game/`.

> **Note:** Chrome is the recommended browser. HTTP (non-HTTPS) is not supported due to browser security restrictions on the File System Access API.

**Live Demo:** [https://play.swkotor.net/](https://play.swkotor.net/)

---

## Testing

KotOR.js uses **Jest** with `ts-jest` for its test suite.

### Run All Tests

```bash
npm run test
```

This runs all 11 test files and generates a coverage report in `./coverage/`.

### Run Tests Without Coverage (faster)

```bash
npx jest --no-coverage
```

### Test Files

| File | Description |
|------|-------------|
| `src/nwscript/NWScriptFidelity.test.ts` | NWScript VM fidelity tests (70+ tests) |
| `src/combat/CombatRound.test.ts` | Combat round mechanics |
| `src/combat/CombatAttackData.test.ts` | Attack data structures |
| `src/actions/ActionCombat.test.ts` | Combat action handling |
| `src/module/ModuleCreatureOnDeath.test.ts` | Creature death and game-over logic |
| `src/managers/JournalManager.test.ts` | Journal / quest log system |
| `src/engine/SaveGameSlots.test.ts` | Save game slot management |
| `src/engine/SaveGameGlobalVars.test.ts` | Save game global variable persistence |
| `src/engine/SaveGameInventoryLoad.test.ts` | Save game inventory loading |
| `src/engine/EngineLocation.test.ts` | Location data structures |
| `src/utility/GameFileSystem.browser.test.ts` | Browser file system API |

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full browser-playability roadmap with implementation status for every subsystem.

### Near-Term Goals

- [ ] Complete NWScript K1 standard library (remaining ~13% of functions)
- [ ] Full Force power casting pipeline (cooldowns, Force pool deduction)
- [ ] Feat resolution in combat (Flurry, Power Attack, etc.)
- [ ] Perception system (line-of-sight enemy detection)
- [ ] Companion tactical AI
- [ ] Skill check system (Persuade, Computer Use, Repair, etc.)
- [ ] Area transition state persistence across module loads
- [ ] Level-up UI: skill and feat assignment

### Mid-Term Goals

- [ ] Minigames: Swoop Racing, Space Turret
- [ ] Character alignment tracking (Light/Dark Side)
- [ ] Credits and ending sequences
- [ ] Full K2 NWScript library coverage
- [ ] Mobile / touch input support

### Long-Term Goals

- [ ] TSL Romance / influence system completion
- [ ] Expanded modding tools in KotOR Forge (trigger editing, script compilation UI)
- [ ] Performance optimizations for low-end hardware
- [ ] Wider browser compatibility

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally and install dependencies (`npm install`).
3. **Create a feature branch**: `git checkout -b feature/your-feature-name`
4. Make your changes, ensuring existing tests still pass (`npx jest --no-coverage`).
5. Add new tests where appropriate to cover your changes.
6. **Commit** with a clear message describing what changed and why.
7. **Push** to your fork and open a **Pull Request** against `main`.

### Code Style

- TypeScript is enforced via `tsconfig.json` (`noImplicitAny: true`).
- ESLint is configured via `.eslintrc.yml`. Run the linter before submitting:
  ```bash
  npx eslint src/
  ```
- Match the coding style of the file you are editing.

### Finding Work

- Check open [Issues](https://github.com/awest813/OpenKotor/issues) for bugs and feature requests.
- The [ROADMAP.md](ROADMAP.md) lists incomplete or partial systems that need work.
- Items marked 🔶 (partial) or ❌ (not implemented) are good starting points.

### Community

- [Discord](https://discord.gg/QxjqVAuN8T) – OpenKotOR community server
- [Discussion Thread](https://deadlystream.com/topic/6608-wip-kotor-js-a-game-engine-for-k1-k2-written-in-javascript/) – DeadlyStream forum thread
- [YouTube Channel](https://www.youtube.com/channel/UC7b4RL2mj0WJ7fEvbJePDbA) – Progress videos

---

## FAQ & Troubleshooting

**Q: Do I need to own the original games?**  
A: Yes. KotOR.js reads assets from a valid installation of KotOR I or KotOR II. No game files are distributed with this project.

**Q: Which browser should I use?**  
A: Chrome (latest) is strongly recommended. The web version requires HTTPS — it cannot be served over plain HTTP.

**Q: The game crashes immediately on startup.**  
A: Make sure you pointed the Launcher at the correct game installation folder containing the `chitin.key` file. Verify your Node.js version is ≥ 18.

**Q: I get a blank screen / nothing loads.**  
A: Check the browser or Electron DevTools console for errors. Common causes: wrong game path, unsupported browser, or missing HTTPS on the web version.

**Q: Webpack build fails with TypeScript errors.**  
A: Run `npm install` to ensure all dependencies are installed, then try `npm run webpack:dev` again.

**Q: How do I add a new NWScript function?**  
A: Add a handler in `src/nwscript/NWScriptDefK1.ts` (K1) or `NWScriptDefK2.ts` (K2), then add a fidelity test in `src/nwscript/NWScriptFidelity.test.ts`. See existing implementations for the pattern.

---

## Resources

Useful references for engine accuracy and scripting fidelity:

- [KotOR Scripting Tool](https://github.com/KobaltBlu/KotOR-Scripting-Tool) – Script editor and NWScript reference for KotOR I & II
- [xoreos KotOR engine source](https://github.com/xoreos/xoreos/blob/master/src/engines/kotor/kotor.cpp) – Open-source KotOR engine reimplementation in C++
- [KOTOR Force Powers (swkotorwiki)](https://swkotorwiki.fandom.com/wiki/KOTOR:Force_Powers) – Force power descriptions and game data
- [Powers and abilities (swtor-archive)](https://swtor-archive.fandom.com/wiki/Powers_and_abilities_(Star_Wars:_Knights_of_the_Old_Republic)) – Complete power/ability reference
- [Difficulty Classes (strategywiki)](https://strategywiki.org/wiki/Star_Wars:_Knights_of_the_Old_Republic/Difficulty_Classes) – DC formulas for saving throws and skill checks
- [Browser Compatibility Table](https://github.com/KobaltBlu/KotOR.js/wiki/Browser-Support) – Supported browsers for the web version

---

## Credits

KotOR.js stands on the shoulders of these excellent projects and communities:

- **[xoreos](https://xoreos.org/)** – Open-source reimplementation of BioWare's Aurora Engine family; invaluable reference for file format documentation
- **[The KotOR Modding Community](https://deadlystream.com/)** – Decades of reverse-engineering work on game formats, scripts, and mechanics
- **[Three.js](https://threejs.org/)** – The 3D rendering library powering the engine
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** – The code editor embedded in KotOR Forge
- All open-source contributors and community members who have helped test, report bugs, and improve the engine

---

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE.md).

You are free to use, modify, and distribute this software under the terms of the GPL v3. Any derivative work must also be distributed under the GPL v3.
