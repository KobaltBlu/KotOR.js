# KotOR.js Documentation Index

This document provides an overview of all available documentation for the KotOR.js project.

## Getting Started

### For New Contributors

1. **[README.md](README.md)** - Start here! Project overview and quick start guide
2. **[SETUP.md](SETUP.md)** - Detailed setup instructions for all platforms
3. **[CONTRIBUTING.md](CONTRIBUTING.md)** - Comprehensive contribution guidelines
4. **[DEVELOPER_QUICK_REFERENCE.md](DEVELOPER_QUICK_REFERENCE.md)** - Quick command reference

### For Users

1. **[README.md](README.md)** - Project overview and features
2. **[SETUP.md](SETUP.md)** - Installation and setup

## Documentation Files

### Core Documentation

| File | Purpose | Audience |
|------|---------|----------|
| [README.md](README.md) | Project overview, features, quick start | Everyone |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines, coding standards | Contributors |
| [SETUP.md](SETUP.md) | Detailed setup instructions, troubleshooting | Developers |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Project structure and organization | Developers |
| [DEVELOPER_QUICK_REFERENCE.md](DEVELOPER_QUICK_REFERENCE.md) | Quick command reference | Developers |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community guidelines | Everyone |

### Configuration Files

| File | Purpose |
|------|---------|
| `.editorconfig` | Editor configuration for consistent formatting |
| `.prettierrc` | Prettier code formatting rules |
| `.prettierignore` | Files to ignore for Prettier |
| `.eslintrc.yml` | ESLint configuration |
| `.eslintignore` | Files to ignore for ESLint |
| `.nvmrc` | Node.js version specification |
| `.gitignore` | Git ignore patterns |
| `package.json` | Project configuration and dependencies |
| `tsconfig.json` | TypeScript configuration |
| `webpack.config.js` | Webpack build configuration |
| `jest.config.js` | Jest test configuration |

### GitHub Templates

| File | Purpose |
|------|---------|
| `.github/PULL_REQUEST_TEMPLATE.md` | Pull request template |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug report template |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template |

### VS Code Configuration

| File | Purpose |
|------|---------|
| `.vscode/settings.json` | VS Code workspace settings |
| `.vscode/extensions.json` | Recommended VS Code extensions |

## Documentation by Topic

### Setup and Installation

- **[SETUP.md](SETUP.md)** - Complete setup guide
  - System requirements
  - Installing prerequisites
  - Project setup
  - Verifying installation
  - Troubleshooting

### Development Workflow

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development workflow
  - Getting started
  - Development setup
  - Coding standards
  - Testing
  - Submitting changes
  - Pull request process

- **[DEVELOPER_QUICK_REFERENCE.md](DEVELOPER_QUICK_REFERENCE.md)** - Quick reference
  - Common commands
  - File locations
  - Code style
  - Git workflow
  - Common issues

### Project Understanding

- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Project structure
  - Directory organization
  - Key components
  - Build configuration
  - File naming conventions

- **[README.md](README.md)** - Project overview
  - Technologies used
  - Supported games
  - Features

### Community

- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Code of conduct
  - Community standards
  - Enforcement guidelines

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
  - How to contribute
  - Issue reporting
  - Getting help

## API Documentation

API documentation is generated from source code comments using TypeDoc:

```bash
npm run typedoc
```

Generated documentation is available in the `wiki/` directory.

## Quick Links

### External Resources

- **Discord**: [OpenKotOR Discord Server](https://discord.gg/QxjqVAuN8T)
- **Discussion Thread**: [DeadlyStream Forum](https://deadlystream.com/topic/6608-wip-kotor-js-a-game-engine-for-k1-k2-written-in-javascript/)
- **GitHub Issues**: [Issue Tracker](https://github.com/KobaltBlu/KotOR.js/issues)
- **YouTube Channel**: [KotOR.js Channel](https://www.youtube.com/channel/UC7b4RL2mj0WJ7fEvbJePDbA)

### Technology Documentation

- **TypeScript**: [typescriptlang.org/docs](https://www.typescriptlang.org/docs/)
- **React**: [react.dev](https://react.dev/)
- **THREE.js**: [threejs.org/docs](https://threejs.org/docs/)
- **Electron**: [electronjs.org/docs](https://www.electronjs.org/docs/)
- **Webpack**: [webpack.js.org](https://webpack.js.org/)
- **Jest**: [jestjs.io/docs](https://jestjs.io/docs/getting-started)

## Documentation Maintenance

### Updating Documentation

When making changes:

1. **Code changes**: Update relevant documentation
2. **New features**: Add to README.md and appropriate docs
3. **Breaking changes**: Update SETUP.md and CONTRIBUTING.md
4. **API changes**: Update JSDoc comments (generates wiki/)

### Documentation Standards

- Use clear, concise language
- Include code examples where helpful
- Keep instructions up-to-date
- Cross-reference related documents
- Use consistent formatting

## Need Help?

If you can't find what you're looking for:

1. Check the [README.md](README.md) for overview
2. Search existing [GitHub Issues](https://github.com/KobaltBlu/KotOR.js/issues)
3. Ask on [Discord](https://discord.gg/QxjqVAuN8T)
4. Create a new issue with the `documentation` label

---

**Last Updated**: See git history for latest changes

