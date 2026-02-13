# KotOR Forge VS Code Extension

A comprehensive Visual Studio Code extension for modding Star Wars: Knights of the Old Republic, bringing the full power of KotOR Forge editors directly into VS Code.

## Features

- **Custom Editors** for all KotOR file formats:
  - **GFF Templates**: UTC, UTD, UTP, UTI, UTE, UTS, UTT, UTW, UTM with full property editing
  - **3D Previews**: UTC (creatures), UTP (placeables), MDL/MDX (models) with Three.js rendering
  - **2DA Tables**: Spreadsheet editor for game data tables
  - **Archives**: ERF, MOD, SAV, RIM file browsers
  - **Dialogs**: DLG tree editor for conversations
  - **Textures**: TPC, TGA image viewers
  - **Scripts**: NWScript syntax highlighting for NSS/NCS files
  - And many more...

- **Integrated Development**: Edit KotOR files directly in your workspace alongside code and other assets
- **No Browser Sandbox**: Full file system access without browser restrictions
- **Native Feel**: Familiar VS Code interface with all your favorite extensions working alongside

## Installation

### Prerequisites

This extension requires the KotOR.js library to be built in the parent repository. Make sure you have:

1. Node.js 20+ installed
2. The KotOR.js repository cloned
3. KotOR.js dependencies installed (`npm install` in the root)
4. KotOR.js built (`npm run build` in the root)

### From Source

1. Clone the KotOR.js repository
2. Navigate to `extensions/kotor-forge-vscode/`
3. Run `npm install`
4. Run `npm run compile`
5. Press F5 to launch Extension Development Host

### From VSIX

1. Download the `.vsix` file from releases
2. In VS Code, run: `Extensions: Install from VSIX...`
3. Select the downloaded file
4. Reload VS Code

### Building the Extension

To create a `.vsix` package for distribution:

```bash
cd extensions/kotor-forge-vscode
npm install
npm run compile
npm run package
```

This will create a `kotor-forge-0.1.0.vsix` file that can be installed.

## Configuration

Set your game installation paths in VS Code settings:

```json
{
  "kotorForge.kotorPath": "C:/Program Files/Steam/steamapps/common/swkotor",
  "kotorForge.tslPath": "C:/Program Files/Steam/steamapps/common/Knights of the Old Republic II",
  "kotorForge.activeGame": "kotor"
}
```

## Development

### Project Structure

```
extensions/kotor-forge-vscode/
├── src/
│   ├── extension.ts              # Extension activation
│   ├── KotorDocument.ts          # Document model
│   ├── providers/                # Custom editor providers
│   │   ├── BaseKotorEditorProvider.ts
│   │   ├── GFFEditorProvider.ts
│   │   ├── TwoDAEditorProvider.ts
│   │   └── ...
│   └── webview/                  # Webview (browser) code
│       ├── index.tsx             # Entry point
│       ├── WebviewBridge.ts      # VS Code communication
│       └── WebviewApp.tsx        # Main app component
├── syntaxes/
│   └── nwscript.tmLanguage.json  # NWScript syntax
├── package.json                  # Extension manifest
├── webpack.config.js             # Build configuration
└── tsconfig.json                 # TypeScript config
```

### Building

- **Production**: `npm run compile` — one-off build (used by `vscode:prepublish` and before packaging)
- **Package**: `npm run package` — build and create a `.vsix` for distribution

### Debugging and testing

1. **Start the watcher** (in a terminal from `extensions/kotor-forge-vscode/`):
   ```bash
   npm run watch
   ```
   This runs webpack in development mode and **rebuilds automatically** when you change extension or webview source. Leave it running.

2. **Launch the extension**: Open the `extensions/kotor-forge-vscode` folder in VS Code and press **F5** (or Run → Start Debugging). A new window opens (Extension Development Host) with the extension loaded.

3. **Test**: In that window, open a KotOR file (e.g. `.utc`, `.2da`, `.nss`) to use the custom editor. After you edit code, wait for the watcher to finish rebuilding, then in the Extension Development Host run **Developer: Reload Window** (Command Palette) to pick up changes.

Without `watch`, you would have to run `npm run compile` manually after every change and then reload the window.

### Verification

These checks apply across the extension:

1. **Rendering (all GFF resource editors)**  
   Open **any** GFF-based resource in VS Code with KotOR Forge (e.g. `.uts`, `.gff`, `.uti`, `.utc`, `.are`, `.dlg`, `.git`, `.ifo`, `.fac`, `.jrl`, `.gui`, `.ltr`, `.pth`, `.vis`, `.res`, `.bic`). The editor should show the GFF tree (generic editor) or the specific blueprint form (e.g. UTS, UTC, UTI) instead of staying blank.

2. **Two editors (all GFF types)**  
   For **any** of the GFF-related extensions above: right-click the file → **Open With** → **KotOR Forge (Generic GFF)**. The file should open in the generic GFF tree editor. The default **KotOR Forge Editor** continues to use the specific editor when available (e.g. UTS form for `.uts`).

3. **Logging (all resource editors)**  
   In the Output panel, select **Forge-KotOR.js** and set the level to **Trace**. Open **any** KotOR resource (GFF, 2DA, DLG, model, etc.). The log should show the full path: document create → resolve custom editor → webview ready → init sent → tab created and editor rendered. Use this to debug load or render issues for any editor type.

### Forge integration (no duplication)

The extension **does not duplicate** any editor logic. It depends on the existing Forge implementation in `src/apps/forge/`:

- **Host adapter** (`IForgeHostAdapter` in `src/apps/forge/ForgeHostAdapter.ts`): When set, `ForgeState` delegates `tabManager`, `modalManager`, `addRecentFile`, and save I/O to the host. The extension’s webview provides `ForgeWebviewAdapter`, which implements this interface and forwards save requests to the extension host via `postMessage`.
- **Single-tab flow**: The webview creates one `EditorFile` (with buffer and path from the init message), looks up the correct `TabState` class from `forgeEditorRegistry.ts` (e.g. `TabUTCEditorState`), adds it to the adapter’s `EditorTabManager`, then renders the same `TabManager` + `TabManagerProvider` used by the standalone Forge app. All editors (UTC, UTD, 2DA, GFF, etc.) are the real Forge components; the webview only wires file data in and save/undo out.
- **Build**: The extension webpack config aliases `@forge` to `../../src/apps/forge` and `@kotor` to `../../src`, so the webview bundle compiles and includes the Forge and KotOR source. Run `npm run compile` from the extension directory (with the repo root’s `node_modules` available for Bootstrap, etc.).

### Architecture

The extension uses VS Code's Custom Editor API:

1. **Extension Host** (Node.js): Manages documents, file I/O, and UI integration
2. **Webview** (Browser): Renders editors using React + Three.js + KotOR library
3. **Message Bridge**: postMessage-based communication between host and webview

```
┌─────────────────────────────────────────────────────────────┐
│ VS Code Extension Host (Node.js)                             │
│                                                               │
│  ┌────────────────┐      ┌──────────────────┐              │
│  │ CustomEditor   │◄─────┤ KotorDocument    │              │
│  │ Providers      │      │ (Binary Files)    │              │
│  └────────┬───────┘      └──────────────────┘              │
│           │                                                   │
│           │ postMessage                                       │
│           ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Webview (Browser Context)                            │   │
│  │                                                       │   │
│  │  ┌──────────────┐    ┌────────────────┐            │   │
│  │  │ WebviewBridge│◄───┤ EditorComponent │            │   │
│  │  └──────────────┘    │ (React+Three.js)│            │   │
│  │                       └────────────────┘            │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Status

### ✅ Completed

- [x] Extension scaffold and configuration
- [x] TypeScript build setup with webpack
- [x] Base provider infrastructure (BaseKotorEditorProvider, KotorDocument)
- [x] All editor provider registrations (UTC, UTD, UTP, UTI, etc.)
- [x] Webview bridge and communication layer
- [x] NWScript syntax highlighting
- [x] Extension activation and command registration

### 🚧 In Progress

- [ ] Wire up actual Forge editor components in webview
- [ ] Integrate GFF editors with 3D previews
- [ ] 2DA table editor component
- [ ] Dialog tree editor component
- [ ] Model viewer with Three.js
- [ ] Texture viewer component
- [ ] Undo/redo support
- [ ] Save functionality

### 📋 Planned

- [ ] Full Three.js integration for 3D editors
- [ ] TPC/TGA texture decoding in webview
- [ ] Complete Forge component integration
- [ ] Resource explorer sidebar (BIF/KEY/ERF browsing)
- [ ] 2DA lookup integration in dropdowns
- [ ] TLK string resolution in editors
- [ ] Module editor (3D area editing)
- [ ] Language server integration (autocomplete, go-to-definition)
- [ ] Animation timeline for model viewer
- [ ] Dialog tree visual editor

## Next Steps

The core infrastructure is complete. The next phase involves integrating the existing Forge editor components:

1. **Import Forge Components**: Update `WebviewApp.tsx` to import and render actual editor components from `src/apps/forge/`
2. **Adapt TabState Classes**: Wire up the existing `TabState` subclasses to work with the webview bridge
3. **3D Rendering**: Ensure Three.js and UI3DRenderer work correctly in webview context
4. **File I/O**: Adapt file operations to use the webview bridge instead of direct FS access
5. **Testing**: Verify each editor type works correctly with real game files

## Contributing

This extension reuses the existing KotOR Forge codebase. Most editor logic is already implemented in `src/apps/forge/`. The extension primarily acts as a bridge between VS Code and the Forge editors.

## License

GPL-3.0 (same as KotOR.js)

## Credits

- KotOR.js by KobaltBlu
- Based on HolocronToolset and the KotOR modding community's research
