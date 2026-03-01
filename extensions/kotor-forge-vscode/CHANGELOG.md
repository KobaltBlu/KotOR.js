# Change Log

All notable changes to the KotOR Forge extension will be documented in this file.

## [0.1.0] - 2026-02-08

### Added
- Initial release of KotOR Forge VS Code extension
- Custom editor support for all major KotOR file formats
  - GFF templates (UTC, UTD, UTP, UTI, UTE, UTS, UTT, UTW, UTM)
  - 2DA table editor with spreadsheet view
  - Dialog (DLG) tree editor
  - Model viewer for MDL/MDX files (3D preview)
  - Texture viewer for TPC/TGA files
  - Archive browser for ERF/MOD/SAV/RIM files
  - Generic GFF tree editor for ARE, GIT, IFO, and other GFF formats
- NWScript syntax highlighting for NSS/NCS files
- File icons for all KotOR file types
- Settings for KotOR/TSL installation paths
- WebGL-based 3D rendering in editors
- Undo/redo support via VS Code's document model
- Save functionality integrated with VS Code
- WebviewBridge for communication between extension host and editors

### Known Issues
- 3D model rendering in webview context needs Three.js integration
- TPC/TGA texture decoding needs implementation
- Full Forge component integration is ongoing
- Resource explorer for game archives not yet implemented
- Some specialized editors (LIP, SSF, TLK) need full implementation

### Future Plans
- Language server for NWScript (autocomplete, go-to-definition)
- Resource explorer sidebar for browsing game files
- 2DA lookup integration in editors
- TLK string resolution
- Module editor with 3D area editing
- Improved 3D rendering with animation support
