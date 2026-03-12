# Get Started with KotOR Forge

KotOR Forge brings the full KotOR modding toolkit into VS Code. Follow these steps to get up and running.

## 1. Set your game paths

To enable resource lookups and built-in scripts, set the installation paths for KotOR I and/or KotOR II:

- Open **Settings** (Ctrl+, / Cmd+,) and search for "KotOR Forge", or run **KotOR Forge: Open Settings** from the Command Palette.
- Set **KotOR Path** to your Knights of the Old Republic installation directory.
- Set **TSL Path** to your Knights of the Old Republic II: The Sith Lords installation directory (if you mod TSL).
- Choose **Active Game** (KotOR or TSL) for resource and 2DA lookups.

You can also use the commands **KotOR Forge: Set KotOR Path** and **KotOR Forge: Set TSL Path** to pick folders with a dialog.

## 2. Open a KotOR file

- Open a workspace that contains KotOR mod files (e.g. `.utc`, `.2da`, `.tlk`, `.nss`).
- Double-click a KotOR file (e.g. a creature template `.utc` or a talk table `.tlk`). It will open in the KotOR Forge editor.
- Use **Open With...** in the Explorer context menu to choose **KotOR Forge (Generic GFF)** for GFF-based files or **KotOR Forge (JSON View)** to view/edit as JSON.

## 3. Open as JSON

For supported types (2DA, GFF, TLK, UTC, etc.), you can open the same file in a JSON view:

- Right-click the file in the Explorer and choose **Open as JSON**, or run **KotOR Forge: Open as JSON** from the Command Palette when the file is active.

## 4. NWScript and debugging

- `.nss` and `.ncs` files get syntax highlighting and IntelliSense from the built-in NWScript language server.
- Set breakpoints and use **Start Debugging** (or the context menu) to debug NWScript with the NWScript debugger.

## 5. Format and Sort

When a KotOR Forge editor has focus:

- **Format** (Alt+Shift+F on Windows/Linux, Option+Shift+F on macOS): Format the current editor (e.g. 2DA, TLK, GFF).
- **Sort** (Alt+Shift+S / Option+Shift+S): Sort entries where supported (e.g. TLK, 2DA).

You can also run **KotOR Forge: Format** and **KotOR Forge: Sort** from the Command Palette.

## Need help?

- [KotOR.js on GitHub](https://github.com/KobaltBlu/KotOR.js)
- [OpenKotOR Discord](https://discord.gg/QxjqVAuN8T)
