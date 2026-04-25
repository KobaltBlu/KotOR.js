# KotOR.js Developer Quick Reference

A quick reference guide for common development tasks and commands.

## Quick Start

```bash
# Install dependencies
npm install

# Start development (Terminal 1)
npm run watch

# Start application (Terminal 2)
npm start
```

## Common Commands

### Development

```bash
npm start                    # Start Electron app
npm run dev                  # Watch main process + auto-restart
npm run watch                # Build web bundle in watch mode
npm run build:web:dev        # Build web bundle once (dev)
```

### Building

```bash
npm run build                # Full production build
npm run build:dev            # Full development build
npm run build:electron       # Compile Electron main only
npm run pack                 # Build and package Electron app
```

### Testing

```bash
npm test                     # Run all tests (with coverage)
npm run test:watch           # Watch mode
npm run test:quick           # Fast run (no coverage)
```

### Code Quality

```bash
npm run lint                 # Run ESLint
```

### Documentation

```bash
npm run typedoc              # Generate API docs
```

## File Locations

| Purpose | Location |
|---------|----------|
| Source code | `src/` |
| Main entry | `src/KotOR.ts` |
| Game init | `src/GameInitializer.ts` |
| Module system | `src/module/Module.ts` |
| Build output | `dist/` |
| Tests | `src/**/*.spec.ts` |
| Config | Root directory |

## Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single for strings, double for JSX
- **Semicolons**: Always
- **Line length**: 120 chars (soft limit)
- **File naming**: PascalCase for classes, camelCase for utils

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Commit (use conventional commits)
git commit -m "feat: add new feature"

# Push
git push origin feature/my-feature
```

### Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Build/tooling

## Project Structure

```sh
src/
├── apps/          # Applications (launcher, game, forge, debugger)
├── engine/        # Core engine
├── module/        # Module system
├── resource/      # File formats
├── odyssey/       # Odyssey parsers
├── nwscript/      # Script interpreter
└── ...
```

## Testing

```typescript
// Test file: src/module/Module.spec.ts
import { Module } from './Module';

describe('Module', () => {
  it('should initialize', () => {
    // Test code
  });
});
```

## Debugging

### Electron

- Use `console.log()` for debugging
- Chrome DevTools available in Electron
- Check terminal for errors

### Browser

- Chrome DevTools
- Network tab for resource loading
- Console for errors

## Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | `rm -rf node_modules && npm install` |
| Type errors | `npx tsc --noEmit` |
| Lint errors | Fix manually or run `npm run lint` for report |

## Resources

- [CONTRIBUTING.md](CONTRIBUTING.md) - Full contribution guide
- [SETUP.md](SETUP.md) - Setup instructions
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Project structure
- Discord: [OpenKotOR](https://discord.gg/QxjqVAuN8T)

## Optional: Fedora Kinoite workspace (out-of-tree)

**Not** required to build, test, or run KotOR.js. On some Windows hosts a sibling tree holds Fedora **Kinoite in WSL2** docs, inventories, and provisioning scripts—see **[AGENTS.md](AGENTS.md)** (*Fedora Kinoite workspace*), **`.cursor/plans/silverblue_wsl_workspace_ec9c3c8b.plan.md`**, and `KINOITE_WORKSPACE_ROOT` there.

## Keyboard Shortcuts (VS Code)

- `Ctrl+Shift+P` - Command palette
- `Ctrl+` ` - Toggle terminal
- `F5` - Debug
- `Ctrl+Shift+B` - Run build task

---

**Tip**: Keep this file open while developing for quick reference!
