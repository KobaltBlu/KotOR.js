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

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.x or higher (LTS recommended)
  - Check your version: `node --version`
  - Download: [nodejs.org](https://nodejs.org/)
- **npm**: Version 9.x or higher (comes with Node.js)
  - Check your version: `npm --version`
- **Git**: Latest version
  - Check your version: `git --version`
  - Download: [git-scm.com](https://git-scm.com/)
- **A valid copy of KotOR I or KotOR II** (for testing game functionality)
  - No game files are distributed with this project.  No BioWare, LucasArts, nor Disney trademarked content will ever be distributed with this project.

### Quick Start (Developer)

1. **Clone the repository**:

```bash
git clone https://github.com/KobaltBlu/KotOR.js.git
cd KotOR.js
```

1. **Install dependencies**:

```bash
npm install
```

1. **Start development build** (in one terminal):

```bash
npm run webpack:dev-watch
```

1. **Start the application** (in another terminal):

```bash
npm start
```

1. **Enjoy!** The Electron application should launch automatically.

### Available Scripts

#### Development

- `npm start` - Compile and start Electron application
- `npm run start-watch` - Start with auto-reload on changes
- `npm run webpack:dev` - Build once in development mode
- `npm run webpack:dev-watch` - Build in watch mode (auto-rebuild on changes)

#### Building

- `npm run webpack:prod` - Build for production
- `npm run electron:compile` - Compile Electron TypeScript files
- `npm run electron:build` - Build complete Electron application

#### Testing

- `npm test` - Run all tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report

#### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

#### Documentation

- `npm run typedoc` - Generate API documentation

### Development Workflow

For a typical development session:

1. **Terminal 1**: Run `npm run webpack:dev-watch` to automatically rebuild on file changes
2. **Terminal 2**: Run `npm start` to launch the Electron application
3. **Make changes** in the `src/` directory
4. **Test your changes** - the application will reload automatically
5. **Run tests** before committing: `npm test`
6. **Check code quality**: `npm run lint && npm run format:check`

### Project Structure

The project is organized into several major components:

- **Core Engine** (`src/engine/`, `src/module/`) - Game engine systems
- **Applications** (`src/apps/`) - Launcher, Game, Forge, Debugger
- **Resource System** (`src/resource/`, `src/loaders/`) - File format parsers
- **Rendering** (`src/three/`, `src/shaders/`) - THREE.js rendering system
- **Scripting** (`src/nwscript/`) - NWScript interpreter

For detailed information, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

### Contributing

We welcome contributions! Please read:

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Comprehensive contribution guidelines
- **[SETUP.md](SETUP.md)** - Detailed setup instructions and troubleshooting
- **[DEVELOPER_QUICK_REFERENCE.md](DEVELOPER_QUICK_REFERENCE.md)** - Quick command reference

Key topics covered:

- Development setup and workflow
- Coding standards and best practices
- Testing requirements
- Pull request process
- Code of conduct

### Getting Help

- **Discord**: [OpenKotOR Discord Server](https://discord.gg/QxjqVAuN8T)
- **Discussion Thread**: [DeadlyStream Forum](https://deadlystream.com/topic/6608-wip-kotor-js-a-game-engine-for-k1-k2-written-in-javascript/)
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: Check the `wiki/` directory for API docs (generate with `npm run typedoc`)

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

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines and development workflow
- [SETUP.md](SETUP.md) - Detailed setup instructions
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Project structure overview
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Code of conduct

## License

[GPL 3.0 (GNU General Public License)](LICENSE.md)
