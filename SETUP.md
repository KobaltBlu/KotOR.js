# KotOR.js Setup Guide

This guide provides detailed setup instructions for getting KotOR.js running on your development machine.

## Table of Contents

- [System Requirements](#system-requirements)
- [Installing Prerequisites](#installing-prerequisites)
- [Project Setup](#project-setup)
- [Verifying Installation](#verifying-installation)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

## System Requirements

### Operating System

KotOR.js supports the following operating systems:

- **Windows**: Windows 10 or later
- **macOS**: macOS 10.15 (Catalina) or later
- **Linux**: Most modern distributions (Ubuntu 20.04+, Fedora 32+, etc.)

### Software Requirements

- **Node.js**: Version 18.x or higher (LTS recommended)
- **npm**: Version 9.x or higher (comes with Node.js)
- **Git**: Latest version
- **A valid copy of KotOR I or KotOR II** (for testing)

### Hardware Requirements

- **RAM**: 8GB minimum, 16GB recommended
- **Disk Space**: At least 2GB free for dependencies and build output
- **Graphics**: Any modern graphics card (for testing rendering)

## Installing Prerequisites

### Node.js and npm

#### Windows

1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version (recommended)
3. Run the installer and follow the prompts
4. Verify installation:

   ```powershell
   node --version
   npm --version
   ```

#### macOS

**Using Homebrew (recommended):**

```bash
brew install node
```

**Or download from nodejs.org:**

1. Visit [nodejs.org](https://nodejs.org/)
2. Download the macOS installer
3. Run the installer

**Verify installation:**

```bash
node --version
npm --version
```

#### Linux

**Ubuntu/Debian:**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Fedora/RHEL:**

```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

**Or use your distribution's package manager:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# Fedora
sudo dnf install nodejs npm
```

**Verify installation:**

```bash
node --version
npm --version
```

### Git

#### Windows

1. Visit [git-scm.com](https://git-scm.com/)
2. Download the Windows installer
3. Run the installer with default settings
4. Verify installation:

   ```powershell
   git --version
   ```

#### macOS

Git comes pre-installed. If you need to update:

```bash
# Using Homebrew
brew install git

# Verify
git --version
```

#### Linux

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install git

# Fedora
sudo dnf install git

# Verify
git --version
```

### Visual Studio Code (Recommended IDE)

1. Visit [code.visualstudio.com](https://code.visualstudio.com/)
2. Download for your platform
3. Install recommended extensions:
   - ESLint
   - Prettier
   - TypeScript and JavaScript Language Features
   - Jest Runner

## Project Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/KobaltBlu/KotOR.js.git
cd KotOR.js
```

### 2. Install Dependencies

```bash
npm install
```

This will:

- Install all npm packages listed in `package.json`
- Create `node_modules/` directory
- May take several minutes depending on your internet connection

**Note**: If you encounter errors, try:

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json  # Linux/macOS
# or
rmdir /s /q node_modules & del package-lock.json  # Windows

# Reinstall
npm install
```

### 3. Verify Node Version (Optional)

If you're using `nvm` (Node Version Manager), you can use the project's specified version:

```bash
# Install/use the correct Node version
nvm install
nvm use
```

The project includes a `.nvmrc` file specifying Node.js 18.

## Verifying Installation

### Run Tests

Verify that everything is set up correctly:

```bash
npm test
```

All tests should pass. If tests fail, check the error messages and refer to [Troubleshooting](#troubleshooting).

### Check Code Quality Tools

Verify linting and formatting tools:

```bash
# Check linting
npm run lint

# Check formatting
npm run format:check
```

### Build the Project

Test the build process:

```bash
# Development build
npm run webpack:dev

# Production build (takes longer)
npm run webpack:prod
```

The build output will be in the `dist/` directory.

### Start the Application

1. **Start the development build** (in one terminal):

   ```bash
   npm run webpack:dev-watch
   ```

   This will watch for file changes and automatically rebuild.

2. **Start the Electron application** (in another terminal):

   ```bash
   npm start
   ```

The Electron application should launch. If it doesn't, check the terminal for error messages.

## Troubleshooting

### Common Issues

#### "Command not found: node" or "Command not found: npm"

**Problem**: Node.js/npm is not installed or not in your PATH.

**Solution**:

1. Verify Node.js is installed: `node --version`
2. If not installed, follow [Installing Prerequisites](#installing-prerequisites)
3. If installed but not found, add Node.js to your PATH:
   - Windows: Restart your terminal or add Node.js to system PATH
   - macOS/Linux: Check your shell profile (`.bashrc`, `.zshrc`, etc.)

#### "EACCES" or Permission Errors

**Problem**: npm doesn't have permission to write to certain directories.

**Solution**:

```bash
# Fix npm permissions (Linux/macOS)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc  # or ~/.zshrc
source ~/.bashrc  # or source ~/.zshrc

# Or use sudo (not recommended)
sudo npm install -g npm
```

#### "Module not found" Errors

**Problem**: Dependencies are not installed correctly.

**Solution**:

```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Compilation Errors

**Problem**: TypeScript configuration issues or type errors.

**Solution**:

1. Check TypeScript version: `npx tsc --version`
2. Verify `tsconfig.json` exists
3. Check for type errors: `npx tsc --noEmit`
4. Update TypeScript if needed: `npm install typescript@latest --save-dev`

#### Webpack Build Errors

**Problem**: Webpack configuration or dependency issues.

**Solution**:

1. Clear webpack cache: `rm -rf node_modules/.cache`
2. Rebuild: `npm run webpack:dev`
3. Check for circular dependencies (webpack will warn)
4. Verify all dependencies are installed: `npm install`

#### Electron Won't Start

**Problem**: Electron application fails to launch.

**Solution**:

1. Check that webpack build completed successfully
2. Verify `dist/` directory exists and contains files
3. Check terminal for error messages
4. Try rebuilding: `npm run webpack:dev && npm start`
5. On Linux, you may need additional dependencies:

   ```bash
   # Ubuntu/Debian
   sudo apt install libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
   ```

#### Port Already in Use

**Problem**: Port is already in use by another process.

**Solution**:

1. Find the process using the port:

   ```bash
   # Linux/macOS
   lsof -i :PORT_NUMBER

   # Windows
   netstat -ano | findstr :PORT_NUMBER
   ```

2. Kill the process or use a different port

### Getting Help

If you're still having issues:

1. **Check the logs**: Look for error messages in the terminal
2. **Search existing issues**: Check [GitHub Issues](https://github.com/KobaltBlu/KotOR.js/issues)
3. **Ask on Discord**: [OpenKotOR Discord Server](https://discord.gg/QxjqVAuN8T)
4. **Create an issue**: Include:
   - Your operating system and version
   - Node.js and npm versions
   - Error messages
   - Steps to reproduce

## Next Steps

Once setup is complete:

1. **Read the documentation**:
   - [README.md](README.md) - Project overview
   - [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
   - [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Project structure

2. **Explore the codebase**:
   - Start with `src/KotOR.ts` - Main entry point
   - Check `src/GameInitializer.ts` - Game initialization
   - Look at `src/module/Module.ts` - Module system

3. **Run the application**:
   - Use `npm run webpack:dev-watch` and `npm start`
   - Explore the launcher, game, and forge applications

4. **Start contributing**:
   - Find a [good first issue](https://github.com/KobaltBlu/KotOR.js/labels/good%20first%20issue)
   - Read [CONTRIBUTING.md](CONTRIBUTING.md)
   - Make your first contribution!

## Additional Resources

- **Node.js Documentation**: [nodejs.org/docs](https://nodejs.org/docs/)
- **TypeScript Handbook**: [typescriptlang.org/docs](https://www.typescriptlang.org/docs/)
- **React Documentation**: [react.dev](https://react.dev/)
- **THREE.js Documentation**: [threejs.org/docs](https://threejs.org/docs/)
- **Electron Documentation**: [electronjs.org/docs](https://www.electronjs.org/docs/)

---

**Happy coding!** 🚀
