# Forge Editor Gap Matrix

This document maps all resource types to their current implementation status and backing TS parsers.

## Legend

- **✅ Full Editor**: Specialized editor with full UI implementation
- **⚠️ Fallback**: Tab exists but redirects to generic viewer (GFF/binary/ERF)
- **❌ Missing**: No dedicated tab (handled by default case → binary viewer)

## Resource Type Status Matrix

| Extension | Status | Current Tab | Backing Parser | Notes |
|-----------|--------|-------------|----------------|-------|
| **2da** | ✅ Full | TabTwoDAEditorState | TwoDAObject | Spreadsheet editor with full UI |
| **are** | ✅ Full | TabAREEditorState | GFFObject | Area editor UI with dedicated tab and export |
| **bik** | ✅ Full | TabBIKPlayerState | BIKObject | Video playback tab wired from FileTypeManager |
| **bwm/dwk/pwk/wok** | ✅ Full | TabWOKEditorState | WalkmeshObject (need to verify) | 3D walkmesh editor with face/vertex/edge modes |
| **dlg** | ✅ Full | TabDLGEditorState | DLGObject, DLGNode | Dedicated dialog editor tab |
| **erf** | ✅ Full | TabERFEditorState | ERFObject | Archive viewer with resource list |
| **fac** | ✅ Full | TabFACEditorState | GFFObject (FAC format) | Dedicated FAC editor state |
| **gff/res** | ✅ Full | TabGFFEditorState | GFFObject | Generic GFF tree editor |
| **git** | ✅ Full | TabGITEditorState | GFFObject (GIT format) | Dedicated GIT instance editor with insertion/deletion flows |
| **gui** | ✅ Full | TabGUIEditorState | GFFObject | GUI files - specialized editor |
| **ifo** | ✅ Full | TabIFOEditorState | GFFObject (IFO format) | Dedicated IFO editor state |
| **jrl** | ✅ Full | TabJRLEditorState | GFFObject (JRL format) | Dedicated journal editor state |
| **lip** | ✅ Full | TabLIPEditorState | LIPObject | Lip-sync keyframe editor |
| **ltr** | ✅ Full | TabLTREditorState | LTRObject | Dedicated LTR editor state |
| **lyt** | ✅ Full | TabTextEditorState | LYTObject | Layout text files - text editor |
| **mdl/mdx** | ✅ Full | TabModelViewerState | MDLObject (need to verify path) | 3D model viewer |
| **mod** | ✅ Full | TabERFEditorState | ERFObject | Module archives - same as ERF |
| **ncs** | ✅ Full | TabTextEditorState | (binary script, converted to NSS) | Compiled scripts - text editor |
| **nss** | ✅ Full | TabTextEditorState | (text) | Script files - Monaco editor with syntax highlighting |
| **pth** | ✅ Full | TabPTHEditorState | (need to verify parser) | Path files - specialized editor |
| **sav** | ✅ Full | TabSAVEditorState | ERFObject | Dedicated SAV tab with metadata extraction and ERF-backed export |
| **ssf** | ✅ Full | TabSSFEditorState | SSFObject | Dedicated SSF tab + SSFObject buffer export |
| **tlk** | ✅ Full | TabTLKEditorState | TLKObject, TLKString | Dedicated TLK editor (search/filter/jump/ref tooling) |
| **tpc/tga** | ✅ Full | TabImageViewerState | TPCObject, TGAObject | Texture viewer |
| **txi** | ✅ Full | TabTextEditorState | TXI | Texture info text files - text editor |
| **txt** | ✅ Full | TabTextEditorState | (text) | Plain text files |
| **utc** | ✅ Full | TabUTCEditorState | GFFObject (UTC format) | Creature blueprint editor with 3D preview |
| **utd** | ✅ Full | TabUTDEditorState | GFFObject (UTD format) | Door blueprint editor |
| **ute** | ✅ Full | TabUTEEditorState | GFFObject (UTE format) | Encounter blueprint editor |
| **uti** | ✅ Full | TabUTIEditorState | GFFObject (UTI format) | Item blueprint editor with tabs |
| **utm** | ✅ Full | TabUTMEditorState | GFFObject (UTM format) | Merchant blueprint editor |
| **utp** | ✅ Full | TabUTPEditorState | GFFObject (UTP format) | Placeable blueprint editor |
| **uts** | ✅ Full | TabUTSEditorState | GFFObject (UTS format) | Sound blueprint editor |
| **utt** | ✅ Full | TabUTTEditorState | GFFObject (UTT format) | Trigger blueprint editor |
| **utw** | ✅ Full | TabUTWEditorState | GFFObject (UTW format) | Waypoint blueprint editor |
| **vis** | ✅ Full | TabVISEditorState | VISObject | Dedicated VIS editor and room selection support |
| **wav/mp3** | ✅ Full | AudioPlayerState (inline) | (audio) | Audio playback - inline audio player |
| **(default)** | ❌ Missing | TabBinaryViewerState | None | Unknown types - binary hex viewer |

## Summary

### Full Editors
- 2DA, ERF/MOD, GFF, GUI, LIP, LYT/TXI/TXT/NSS/NCS (TabTextEditorState), MDL/MDX, PTH, TPC/TGA, UTC, UTD, UTE, UTI, UTM, UTP, UTS, UTT, UTW, WAV/MP3, WOK/BWM/DWK/PWK, plus default binary viewer for unknown types.

### Fallback/Stub Editors (0 currently routed)
- Remaining quality gaps are feature-depth gaps, not hard fallbacks to generic tabs.

### Missing (default behavior only)
- Unknown/unmapped extensions continue to route to `TabBinaryViewerState`.

## Priority for Implementation

### High Priority (feature-depth parity, not routing parity)
1. **ARE** - expand advanced map/environment/script workflows in dedicated UI.
2. **GIT** - deepen instance editing workflows and placement ergonomics.
3. **SAV** - extend internals editing beyond metadata/archive management.

### Medium Priority
4. Improve TLK/SSF/VIS advanced tooling (bulk operations, validation, richer previews).
5. Add stronger autosave/undo integration coverage across all specialized tabs.

## TS Parser Locations

All parsers are in `src/resource/*`:
- `BIFObject.ts`, `BIKObject.ts`, `CExoLocString.ts`, `CExoLocSubString.ts`, `DLGNode.ts`, `DLGObject.ts`, `ERFObject.ts`, `GFFField.ts`, `GFFObject.ts`, `GFFStruct.ts`, `KEYObject.ts`, `LIPObject.ts`, `LTRObject.ts`, `LYTObject.ts`, `ResourceTypeInfo.ts`, `ResourceTypes.ts`, `RIMObject.ts`, `SSFObject.ts`, `TGAObject.ts`, `TLKObject.ts`, `TLKString.ts`, `TPCObject.ts`, `TwoDAObject.ts`, `TXI.ts`, `VISObject.ts`

## Maintenance

- Keep this matrix in sync with `FileTypeManager.onOpenResource()` and each tab’s actual UI (full vs fallback).
- See `TABSTATE_EDITORFILE_CONTRACT.md` for TabState/EditorFile and `EditorTabManager` restoration.
