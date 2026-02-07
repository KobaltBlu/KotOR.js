# Getting Started with KotOR Forge

KotOR Forge is the module and resource editor integrated into KotOR.js. It provides file editors for KotOR I & II resources (GFF, 2DA, DLG, LIP, scripts, etc.) and integrates with the game engine.

## Configuration

Before editing game resources it is recommended to set up paths for the game directories. Many editors (e.g. UTC, UTI, TLK) use game data for dropdowns and validation.

- Use **File → Change Game** or the game selector to choose KotOR or TSL and set the game root folder (the folder containing `swkotor.exe` or `swkotor2.exe`).
- Paths can also be configured in project settings if you use a Forge project.

## Opening Files

- **File → Open File**: Open a single resource from disk (ERF, RIM, GFF, 2DA, NSS, etc.).
- **File → Load From Module**: Load a resource from a game module (e.g. `modules/end_m01aa_s.rim`).
- **Project**: Create or open a Forge project to work with a module folder and override-style layout.

## Editor Types

Forge opens a dedicated tab per file type:

- **GFF** (ARE, IFO, UTC, UTD, DLG, etc.): Tree view and field editors.
- **2DA**: Spreadsheet-style editor.
- **NSS**: Text editor with script compile and Find References.
- **LIP**: Lip-sync keyframe editor.
- **TLK**: Talk table editor.
- **TPC / WAV / MDL**: Image, audio, and model viewers.

Use **Help → Open Editor Documentation** when a tab is active to open the wiki page for that format.

## Reference Search

Right-click in resref/script fields (or use the Reference Finder tab) to search for references to a script, tag, template resref, or conversation across GFF and NCS files. Configure partial match, case sensitivity, and file types from the **Reference Finder** tab (View → Reference Finder) via the Options button, or when searching from a script editor use **View → Script Find References** for in-script references.

## Extract Options

**Help → Extract Options...** lets you configure:

- **TPC**: Decompile textures when extracting; extract TXI metadata.
- **MDL**: Decompile models when extracting; extract embedded textures.

These options apply when extracting resources from ERF/RIM to disk.

## Script Compilation

For NSS tabs, use **File → Compile File** (or the compile button) to compile the script to NCS using the built-in compiler. The script compile log tab shows success or errors.

## See Also

- [CONTRIBUTING.md](https://github.com/KobaltBlu/KotOR.js/blob/master/CONTRIBUTING.md) for development and contribution guidelines.
- [Wiki](https://github.com/KobaltBlu/KotOR.js/wiki) for file format and editor documentation.
