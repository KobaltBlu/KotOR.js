# KotOR.js
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![THREE JS](https://img.shields.io/badge/ThreeJs-black?style=for-the-badge&logo=three.js&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)
![Node JS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NPM](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)
![Webpack](https://img.shields.io/badge/Webpack-8DD6F9?style=for-the-badge&logo=Webpack&logoColor=white)

![KotOR.js](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/src/assets/icons/icon.png)

**A remake of the Odyssey Game Engine that powered KotOR I &amp; II written in JS (TypeScript)**

KotOR.js is a TypeScript-based reimplementation of the Odyssey Game Engine that powered the original Star Wars: Knights of the Old Republic (KotOR) and its sequel, KotOR II: The Sith Lords (TSL). The project aims to support the complete feature set of the original engine. While still in the early stages of development, many systems are already online in some form or fashion.

In addition to the game engine, the project includes an early attempt at a modding suite called KotOR Forge. 

## Technologies
- The code has been re-written in TypeScript and compiles down into JavaScript. 
- THREE.js is used for the base of the rendering engine. 
- Electron is used to package and publish a desktop application. 

[Discussion Thread](https://deadlystream.com/topic/6608-wip-kotor-js-a-game-engine-for-k1-k2-written-in-javascript/)  
[KotOR.js Youtube Channel](https://www.youtube.com/channel/UC7b4RL2mj0WJ7fEvbJePDbA)

[![OpenKotOR Discord](https://discordapp.com/api/guilds/739590575359262792/widget.png?style=banner2)](https://discord.gg/QxjqVAuN8T)

## Supported Games
The following games are currently supported:
- [x] [Star Wars: Knights of the Old Republic (PC)](https://en.wikipedia.org/wiki/Star_Wars:_Knights_of_the_Old_Republic)
- [x] [Star Wars: Knights of the Old Republic II The Sith Lords (PC)](https://en.wikipedia.org/wiki/Star_Wars_Knights_of_the_Old_Republic_II:_The_Sith_Lords)

## Requirements
You will need a valid copy of either KotOR I or KotOR II installed on your system if you want to use KotOR.js to interface with the files of either game. No game files are distributed with this project.

## Web Compatibility (NEW)

[Browser Compatibility Table](https://github.com/KobaltBlu/KotOR.js/wiki/Browser-Support)

The recent transition to TypeScript has brought many improvements to the codebase, including Chrome support. When the project is compiled, the contents of the `dist` folder can be uploaded to a web server. The only requirement is that the site must be accessed from behind a valid SSL certificate. Using the latest version of Chrome is recommended.


[![Demo Icon]][Demo Link]

[Demo Link]: https://play.swkotor.net/ 'Online Playable Demo'
[Demo Icon]: https://img.shields.io/badge/Online_Playable_Demo-37a779?style=for-the-badge&logoColor=white&logo=google-chrome

## Getting Started (Developer)

### Prerequisites
1. Download and install [Node.js / npm](https://www.npmjs.com/get-npm).
2. Clone the KotOR.js repository.
3. Install dependencies:

```bash
npm install
```

---

### Running the App

#### Option A — Desktop app (Electron) — most common
This compiles the TypeScript and launches the Electron desktop window. Run this if you just want to play/test the game locally.

```bash
npm run start
```

> **Hot-reload variant:** Watches for TypeScript changes and auto-restarts Electron on save:
> ```bash
> npm run start-watch
> ```

---

#### Option B — Browser / web dev (Webpack + local server)
Use this when you're working on the web frontend (Launcher, Game, Forge, Debugger views) and want to open them in Chrome.

**Step 1 — Build and watch for changes** (keeps running, recompiles on save):
```bash
npm run webpack:dev-watch
```
This compiles five bundles in parallel to the `dist/` folder:
- `KotOR.js` — core engine library
- `dist/launcher/` — game launcher UI
- `dist/game/` — in-browser game client
- `dist/forge/` — KotOR Forge modding tool
- `dist/debugger/` — script debugger

**Step 2 — Serve the output** (in a separate terminal):
```bash
npm run serve
```
Starts a static file server at **http://localhost:8080**. Then open one of these in Chrome:

| URL | What it is |
|---|---|
| http://localhost:8080 | Redirects to Launcher |
| http://localhost:8080/launcher/ | Game Launcher |
| http://localhost:8080/game/?key=kotor | KotOR I in-browser |
| http://localhost:8080/game/?key=tsl | KotOR II in-browser |
| http://localhost:8080/forge/ | KotOR Forge modding tool |
| http://localhost:8080/debugger/ | Script debugger |

**Shortcut — run both at once:**
```bash
npm run dev
```
Runs `webpack:dev-watch` and `serve` in parallel with a single command.

---

#### Option C — VS Code launch configurations
If you're using VS Code, press **F5** (Run & Debug) and pick a configuration. VS Code will automatically start the `serve: dist` background task and open Chrome pointed at the right URL:

- **KotOR Launcher** — opens the launcher at localhost:8080
- **KotOR** — opens the KotOR I game client
- **TSL** — opens the KotOR II game client
- **KotOR Forge** — opens the Forge modding tool
- **KotOR Debugger** — opens the script debugger

> Make sure you've already run `npm run webpack:dev-watch` (or `npm run dev`) so `dist/` has been built before pressing F5.

---

### Other Commands

| Command | What it does |
|---|---|
| `npm run webpack:dev` | One-shot development build (no watch) |
| `npm run webpack:prod` | Production build (minified, no source maps) |
| `npm run electron:compile` | Compile only the Electron main process TypeScript |
| `npm run test` | Run the Jest test suite |
| `npm run typedoc` | Generate API docs into the `wiki/` folder |

## Screenshots

<div align="center">

| **KotOR.js Launcher** | **KotOR - Taris: Undercity** | **KotOR - Dantooine** |
|:-------------------------:|:-------------------------:|:-------------------------:|
| ![KotOR.js Launcher](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/KotOR-js-Launcher-001.jpg) | ![KotOR - Taris: Undercity](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K1-Screen-001.jpg) | ![KotOR - Dantooine](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K1-Screen-003.jpg) |
| **KotOR II - TSL: Awaken Scene** | **KotOR II - TSL: Awaken Scene 2** |  |
| ![KotOR II - TSL: Awaken Scene](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K2-Screen-001.jpg) | ![KotOR II - TSL: Awaken Scene 2](https://raw.githubusercontent.com/KobaltBlu/KotOR.js/master/images/screenshots/K2-Screen-002.jpg) |

</div>

## Videos

<div align="center">

| **KotOR.js (2023) - In Browser Demo** | **KotOR JS - Combat Animations Progress Jan 2021** | **KotOR Forge - WIP: Lip Sync Editor Jan 2019** |
|:---:|:---:|:---:|
| [![KotOR.js (2023) - In Browser Demo](https://img.youtube.com/vi/ZT_9vKRC1t8/0.jpg)](https://www.youtube.com/watch?v=ZT_9vKRC1t8) | [![KotOR JS - Combat Animations Progress Jan 2021](https://img.youtube.com/vi/4oQ8nj_zO-w/0.jpg)](https://www.youtube.com/watch?v=4oQ8nj_zO-w) | [![KotOR Forge - WIP: Lip Sync Editor Jan 2019](https://img.youtube.com/vi/4s4uTyP5yqA/0.jpg)](https://www.youtube.com/watch?v=4s4uTyP5yqA) 
| **KotOR JS - Lighting & Lipsync Progress Nov 2018** | **KotOR JS : TSL - Gameplay Compilation Sep 2018** | **KotOR JS: The Endar Spire Sep 2018** 
| [![KotOR JS - Lighting & Lipsync Progress Nov 2018](https://img.youtube.com/vi/2SATn5W2sb4/0.jpg)](https://www.youtube.com/watch?v=2SATn5W2sb4) | [![KotOR JS : TSL - Gameplay Compilation Sep 2018](https://img.youtube.com/vi/IpP6BQJ5ZBQ/0.jpg)](https://www.youtube.com/watch?v=IpP6BQJ5ZBQ) | [![KotOR JS: The Endar Spire](https://img.youtube.com/vi/y2UzOH5bcAQ/0.jpg)](https://www.youtube.com/watch?v=y2UzOH5bcAQ)

</div>

## Influences & Credits

Without these people below I couldn't have gotten this far.  
[xoreos](https://xoreos.org/)  
[The KotOR Modding Community](https://deadlystream.com/)   
  
And many many more!

## License

[GPL 3.0 (GNU General Public License)](LICENSE.md)
