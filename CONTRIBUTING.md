# Contributing to KotOR.js

Thank you for your interest in contributing to KotOR.js! This document provides comprehensive guidelines and instructions for contributing to the project. Please read through this document before submitting contributions.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Quick Start](#quick-start)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Documentation and Configuration Overview](#documentation-and-configuration-overview)
- [Debugging](#debugging)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Common Issues](#common-issues)
- [Getting Help](#getting-help)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

## Quick Start

```bash
npm install

# Terminal 1: build in watch mode
npm run webpack:dev-watch

# Terminal 2: run the app
npm start
```

For auto-restart when main-process code changes, use `npm run start-watch` in the second terminal. See [Development Workflow](#development-workflow) and [DEVELOPMENT.md](DEVELOPMENT.md) for all scripts and debugging.

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
  - No game files are distributed with this project

### Recommended Tools

While not required, these tools can improve your development experience:

- **Visual Studio Code** (recommended IDE)
  - Extensions:
    - ESLint
    - Prettier
    - TypeScript and JavaScript Language Features
    - Jest Runner
- **Git GUI Client** (optional): GitHub Desktop, SourceTree, or GitKraken
- **Chrome DevTools** (for web debugging)

## Development Setup

> **Note**: For detailed setup instructions, including troubleshooting, see [SETUP.md](SETUP.md).

### 1. Fork and Clone the Repository

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/KotOR.js.git
cd KotOR.js
```

1. Add the upstream repository:

```bash
git remote add upstream https://github.com/KobaltBlu/KotOR.js.git
```

### 2. Install Dependencies

Install all project dependencies:

```bash
npm install
```

This will install all required packages listed in `package.json`, including:

- TypeScript and type definitions
- Webpack and build tools
- React and UI libraries
- THREE.js for rendering
- Electron for desktop packaging
- Testing frameworks (Jest)
- And many more...

### 3. Verify Installation

Run the test suite to verify everything is set up correctly:

```bash
npm test
```

If all tests pass, your development environment is ready!

## Project Structure

```sh
KotOR.js/
├── src/                    # Source code
│   ├── actions/            # Game action system
│   ├── apps/               # Application entry points
│   │   ├── debugger/       # Debugger application
│   │   ├── forge/          # KotOR Forge modding suite
│   │   ├── game/           # Game client application
│   │   └── launcher/       # Launcher application
│   ├── audio/              # Audio engine
│   ├── combat/             # Combat system
│   ├── controls/           # Input handling
│   ├── effects/            # Game effects
│   ├── electron/           # Electron main process
│   ├── engine/             # Core engine systems
│   ├── enums/              # TypeScript enumerations
│   ├── events/             # Event system
│   ├── game/                # Game-specific data
│   ├── gui/                 # GUI system
│   ├── interface/           # Type definitions
│   ├── loaders/             # Resource loaders
│   ├── managers/            # Game managers
│   ├── module/              # Module system
│   ├── nwscript/            # NWScript interpreter
│   ├── odyssey/             # Odyssey format parsers
│   ├── resource/            # Resource file formats
│   ├── shaders/             # Shader code
│   ├── talents/             # Talent/feat system
│   ├── three/               # THREE.js utilities
│   ├── utility/             # Utility functions
│   └── worker/               # Web workers
├── dist/                    # Build output (generated)
├── images/                   # Project images and screenshots
├── wiki/                    # Generated documentation
├── main.js                  # Electron entry point
├── package.json             # Project configuration
├── tsconfig.json            # TypeScript configuration
├── webpack.config.js        # Webpack configuration
└── jest.config.js           # Jest test configuration
```

For more detailed information, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

## Development Workflow

### npm Scripts

All scripts are defined in `package.json`. Webpack builds every target (KotOR library, launcher, game, Forge, debugger) in one run; there is no script to build a single target.

| Script | Description |
|--------|-------------|
| `npm start` | Compile main-process TypeScript once and launch Electron. |
| `npm run start-watch` | Watch main-process sources; on success, launch Electron (restarts on change). |
| `npm run start:debug` | Same as `npm start` with `ELECTRON_ENABLE_LOGGING=1` and `NODE_OPTIONS=--trace-warnings`. |
| `npm run start-watch:debug` | Same as `npm run start-watch` with the same debug/trace environment. |
| `npm run start:inspect` | Run Electron with `--inspect=5858`; attach via Chrome at `chrome://inspect`. |
| `npm run webpack:dev` | Single development build. Output under `dist/`. |
| `npm run webpack:dev-watch` | Development build in watch mode. |
| `npm run webpack:prod` | Single production build. |
| `npm run webpack:dev:verbose` | Development build with `--progress` and `--stats verbose`. |
| `npm run electron:compile` | Compile `tsconfig.electron.json` once; output in `dist/electron/`. |
| `npm run electron:watch` | Watch main-process TypeScript; does not start Electron. |
| `npm run electron:build` | Production Webpack + main-process compile + electron-builder (distributable). |
| `npm test` | Jest: verbose, coverage, no cache (`./src/tests`). |
| `npm run test:watch` | Jest in watch mode. |
| `npm run test:verbose` | Jest verbose, no coverage. |
| `npm run typedoc` | Generate API docs from `./src/KotOR.ts` into `./wiki`. |

Type checking (not in `package.json`): `npx tsc --noEmit` for full project; `npx tsc --noEmit -p tsconfig.forge.json` (or `tsconfig.game.json`, etc.) for a single app.

### File Locations

| Purpose | Location |
|---------|----------|
| Source code | `src/` |
| Main entry | `src/KotOR.ts` |
| Game init | `src/GameInitializer.ts` |
| Module system | `src/module/Module.ts` |
| Build output | `dist/` |
| Tests | `src/tests/` (match: `**/*.test.ts`) |
| Config | Root (`package.json`, `tsconfig.*.json`, `webpack.config.js`, `jest.config.js`) |

### Typical Development Session

1. **Start the development build** (in one terminal):

```bash
npm run webpack:dev-watch
```

This will watch for file changes and automatically rebuild the project.

1. **Start the Electron application** (in another terminal):

```bash
npm start
```

Or use the watch mode for automatic restarts:

```bash
npm run start-watch
```

1. **Make your changes** in the `src/` directory

2. **Test your changes** by running the application

3. **Run tests** before committing:

```bash
npm test
```

1. **Check code quality**: If ESLint/Prettier are configured in the repo, run `npm run lint` and `npm run format:check` (or equivalent) before committing.

## Documentation and Configuration Overview

### Core documentation

| File | Purpose |
|------|---------|
| [README.md](README.md) | Project overview, features, quick start. |
| [SETUP.md](SETUP.md) | Setup instructions, troubleshooting. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines (this file). |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Build, run, test, and debug in detail. |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Project structure and organization. |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community guidelines. |

### Configuration files

| File | Purpose |
|------|---------|
| `.editorconfig` | Editor formatting. |
| `.gitignore` | Git ignore patterns. |
| `package.json` | Dependencies and npm scripts. |
| `tsconfig.json`, `tsconfig.*.json` | TypeScript configuration. |
| `webpack.config.js` | Webpack build configuration. |
| `jest.config.js` | Jest test configuration. |

### GitHub

| Path | Purpose |
|------|---------|
| `.github/PULL_REQUEST_TEMPLATE.md` | Pull request template. |
| `.github/ISSUE_TEMPLATE/*.md` | Issue templates. |
| `.github/workflows/*.yml` | CI (e.g. webpack-dev, webpack-prod). |

### API documentation

Run `npm run typedoc` to generate API docs from `./src/KotOR.ts` into `./wiki/`.

### External resources

- **Discord**: [OpenKotOR Discord Server](https://discord.gg/QxjqVAuN8T)
- **Forum**: [DeadlyStream – KotOR.js thread](https://deadlystream.com/topic/6608-wip-kotor-js-a-game-engine-for-k1-k2-written-in-javascript/)
- **GitHub Issues**: [Issue tracker](https://github.com/KobaltBlu/KotOR.js/issues)
- **TypeScript**: [typescriptlang.org/docs](https://www.typescriptlang.org/docs/)
- **React**: [react.dev](https://react.dev/)
- **THREE.js**: [threejs.org/docs](https://threejs.org/docs/)
- **Electron**: [electronjs.org/docs](https://www.electronjs.org/docs/)
- **Webpack**: [webpack.js.org](https://webpack.js.org/)
- **Jest**: [jestjs.io/docs](https://jestjs.io/docs/getting-started)

## Debugging

### Main process (Electron)

- **Logging and trace**: Use `npm run start:debug` or `npm run start-watch:debug` to run with `ELECTRON_ENABLE_LOGGING=1` and `NODE_OPTIONS=--trace-warnings` (output in the terminal).
- **Inspector**: Use `npm run start:inspect`, then in Chrome open `chrome://inspect` and connect to the Node target.
- **Manual env (PowerShell)**: `$env:ELECTRON_ENABLE_LOGGING=1; $env:NODE_OPTIONS="--trace-warnings"; npm run start-watch`
- **Manual env (Bash/zsh)**: `ELECTRON_ENABLE_LOGGING=1 NODE_OPTIONS=--trace-warnings npm run start-watch`

### Renderer (Launcher, Game, Forge)

- Open DevTools from inside the app (e.g. enable `openDevTools()` in `src/electron/LauncherWindow.ts` or `src/electron/ApplicationWindow.ts`).
- Or run `npx electron --remote-debugging-port=9222 ./main` and in Chrome open `http://localhost:9222` to attach to the renderer.

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict type checking where possible
- Avoid `any` types; use proper types or `unknown`
- Use interfaces for object shapes, types for unions/intersections
- Export types and interfaces that may be used elsewhere

### Code Style

- **Indentation**: 2 spaces (no tabs)
- **Line Endings**: LF (Unix-style)
- **Quotes**: Single quotes for strings, double quotes for JSX attributes
- **Semicolons**: Always use semicolons
- **Trailing Commas**: Use in multi-line arrays/objects
- **Max Line Length**: 120 characters (soft limit)

### Naming Conventions

- **Files**: PascalCase for classes/components (e.g., `GameState.ts`), camelCase for utilities (e.g., `binaryReader.ts`)
- **Classes**: PascalCase (e.g., `GameInitializer`)
- **Functions/Methods**: camelCase (e.g., `initializeGame`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_HEALTH`)
- **Interfaces**: PascalCase, often prefixed with `I` (e.g., `IGameState`)
- **Enums**: PascalCase (e.g., `GameEngineType`)

### File Organization

- One class/interface per file
- Use `index.ts` files for barrel exports
- Group related files in directories
- Keep files focused and under 500 lines when possible

### Comments and Documentation

- Use JSDoc comments for public APIs:

```typescript
/**
 * Initializes the game engine and loads necessary resources.
 *
 * @param gamePath - Path to the game installation directory
 * @param gameType - Type of game (KotOR I or II)
 * @returns Promise that resolves when initialization is complete
 * @throws {Error} If the game path is invalid
 */
async function initializeGame(gamePath: string, gameType: GameEngineType): Promise<void> {
  // Implementation
}
```

- Add inline comments for complex logic
- Keep comments up-to-date with code changes

### Import Organization

Organize imports in this order:

1. External dependencies (React, THREE.js, etc.)
2. Internal modules (from `src/`)
3. Relative imports
4. Type-only imports (use `import type`)

Example:

```typescript
import * as THREE from 'three';
import React from 'react';

import { GameState } from '../GameState';
import { Module } from './Module';

import type { GameEngineType } from '../enums/engine';
```

### Error Handling

- Use try-catch blocks for async operations
- Throw meaningful error messages
- Use custom error classes when appropriate
- Log errors appropriately (console.error for development)

### Performance Considerations

- Avoid unnecessary re-renders in React components
- Use Web Workers for heavy computations
- Cache expensive operations
- Lazy load resources when possible

## Testing

### Writing Tests

- Write tests for new features
- Place test files next to source files with `.spec.ts` or `.test.ts` extension
- Use descriptive test names: `describe('GameState', () => { it('should initialize with default values', () => { ... }) })`
- Aim for good test coverage, especially for critical paths

### Running Tests

```bash
# Run all tests (verbose, with coverage)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests verbose, no coverage
npm run test:verbose
```

Single file: `npx jest --runInBand path/to/file.test.ts`

### Test Structure

```typescript
import { GameState } from './GameState';

describe('GameState', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = new GameState();
  });

  it('should initialize with default values', () => {
    expect(gameState.isInitialized).toBe(false);
  });

  it('should throw error when accessing uninitialized state', () => {
    expect(() => gameState.getCurrentModule()).toThrow();
  });
});
```

## Documentation

### Code Documentation

- Document all public APIs with JSDoc
- Include parameter types, return types, and exceptions
- Add usage examples for complex functions
- Keep documentation in sync with code

### API Documentation

Generate API documentation:

```bash
npm run typedoc
```

This creates documentation in the `wiki/` directory.

### README Updates

- Update README.md when adding major features
- Keep installation instructions current
- Add examples for new functionality

## Submitting Changes

### Before Submitting

1. **Update your fork**:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

1. **Create a feature branch**:

```bash
git checkout -b feature/your-feature-name
```

Or for bug fixes:

```bash
git checkout -b fix/bug-description
```

1. **Make your changes** following the coding standards

2. **Run tests**:

```bash
npm test
```

1. **Check code quality**: If the repo defines `lint` or `format` scripts, run them (e.g. `npm run lint`, `npm run format:check`).

1. **Fix any issues**: Address test failures and, if applicable, run `npm run lint:fix` or `npm run format`.

1. **Commit your changes**:

```bash
git add .
git commit -m "feat: add new feature description"
```

### Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Build process or auxiliary tool changes
- `perf:` - Performance improvements

Examples:

```sh
feat: add support for KotOR II save game format
fix: resolve memory leak in resource loader
docs: update contributing guidelines
refactor: simplify module loading logic
test: add tests for combat system
```

### Commit Best Practices

- Make atomic commits (one logical change per commit)
- Write clear, descriptive commit messages
- Reference issue numbers when applicable: `fix: resolve crash (#123)`
- Avoid committing generated files (`dist/`, `node_modules/`, etc.)

## Pull Request Process

### Creating a Pull Request

1. **Push your branch**:

```bash
git push origin feature/your-feature-name
```

1. **Create a Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Reference related issues: `Fixes #123` or `Closes #456`
   - Provide a detailed description of changes
   - Include screenshots for UI changes
   - List any breaking changes

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Tested in Electron
- [ ] Tested in browser (if applicable)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests pass
```

### Review Process

- Maintainers will review your PR
- Address any feedback promptly
- Make requested changes in new commits (don't force-push unless asked)
- Keep discussions constructive and respectful

### After Approval

- A maintainer will merge your PR
- Your contribution will be included in the next release
- Thank you for contributing! 🎉

## Issue Reporting

### Before Creating an Issue

1. Search existing issues to avoid duplicates
2. Check if the issue is already fixed in the latest version
3. Verify the issue is reproducible

### Creating a Good Issue Report

Include:

- **Clear title**: Brief, descriptive summary
- **Description**: Detailed explanation of the issue
- **Steps to reproduce**: Exact steps to trigger the issue
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**:
  - OS and version
  - Node.js version
  - npm version
  - KotOR.js version/commit
- **Screenshots/Logs**: If applicable
- **Additional context**: Any other relevant information

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation improvements
- `question` - Questions or discussions
- `help wanted` - Extra attention needed
- `good first issue` - Good for newcomers

## Common Issues

| Issue | What to try |
|-------|--------------|
| Build fails | `rm -rf node_modules && npm install` (or equivalent on Windows). |
| Type errors | `npx tsc --noEmit`. |
| Lint/format | Use repo lint/format scripts if defined; otherwise fix reported issues manually. |

## Getting Help

### Resources

- **Discord**: [OpenKotOR Discord Server](https://discord.gg/QxjqVAuN8T)
- **Discussion Thread**: [DeadlyStream Forum](https://deadlystream.com/topic/6608-wip-kotor-js-a-game-engine-for-k1-k2-written-in-javascript/)
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: Check the `wiki/` directory for API docs

### Asking Questions

When asking for help:

1. Be specific about your problem
2. Include relevant code snippets
3. Share error messages (if any)
4. Describe what you've already tried
5. Be patient and respectful

## Additional Guidelines

### Game File Handling

- Never commit game files or assets
- Use `.gitignore` to exclude game directories
- Document any file system requirements

### Browser Compatibility

- Test in Chrome (primary target)
- Note any browser-specific issues
- Use feature detection when needed

### Performance

- Profile before optimizing
- Use Chrome DevTools Performance tab
- Monitor memory usage
- Test with large modules/files

### Security

- Never commit API keys or secrets
- Use environment variables for sensitive data
- Follow secure coding practices
- Report security issues privately

## Recognition

Contributors will be:

- Listed in the project's contributors
- Credited in release notes (for significant contributions)
- Appreciated by the community!

Thank you for contributing to KotOR.js! Your efforts help make this project better for everyone.

### VS Code (optional)

- `Ctrl+Shift+P` — Command palette  
- `` Ctrl+` `` — Toggle terminal  
- `F5` — Start debugging  
- `Ctrl+Shift+B` — Run build task  

---

**Questions?** Open an issue or ask on [Discord](https://discord.gg/QxjqVAuN8T).
