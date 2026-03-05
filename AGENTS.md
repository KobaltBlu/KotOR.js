# AGENTS.md

## Cursor Cloud specific instructions

### Overview

KotOR.js is a TypeScript reimplementation of the Odyssey Game Engine (Star Wars: KotOR I & II). It has four web/Electron frontends: Launcher, Game Client, KotOR Forge (modding suite), and Debugger. All are bundled via Webpack 5 with esbuild-loader.

### Quick reference

Standard commands are documented in `DEVELOPER_QUICK_REFERENCE.md` and `README.md`. Key scripts:

- `npm test` — run tests with coverage
- `npm run lint` — run ESLint (uses legacy config via `ESLINT_USE_FLAT_CONFIG=false`)
- `npm run format:check` — check Prettier formatting
- `npm run webpack:dev` — one-shot dev build of all 5 webpack bundles
- `npm run webpack:dev-watch` — watch mode (rebuilds on file changes)
- `npm start` — compiles Electron TypeScript then launches Electron

### Known caveats

- **ESLint uses legacy config mode**: The project uses `.eslintrc.yml` with ESLint 9. The `lint` scripts set `ESLINT_USE_FLAT_CONFIG=false` automatically. The `.eslintignore` warning is harmless.
- **Electron renders black on headless VMs**: The Launcher window (`transparent: true`, `frame: false`) shows a black rectangle because GPU/compositing is unavailable. Use the **web mode** instead: run `python3 -m http.server 8080` from `dist/` and open `http://localhost:8080/launcher/` in Chrome.
- **Game files required for full testing**: The Game Client and Forge require proprietary KotOR game data files to progress past their loading screens. The Launcher is fully interactive without game files.

### Running the web app in the Cloud VM

1. Build: `npm run webpack:dev`
2. Serve: `cd dist && python3 -m http.server 8080 &`
3. Open in Chrome: `http://localhost:8080/launcher/`

The Launcher, Community, and Need KotOR pages are fully interactive without game files.
