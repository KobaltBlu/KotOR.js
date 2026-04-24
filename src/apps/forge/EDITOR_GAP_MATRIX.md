# Forge Editor Gap Matrix

This document maps all resource types to their current implementation status and backing TS parsers.

## Legend

- **✅ Full Editor**: Specialized editor with full UI implementation
- **🟡 Partial Editor**: Specialized editor exists but advanced workflows are still incomplete
- **⚠️ Fallback**: Tab exists but redirects to generic viewer (GFF/binary/ERF)
- **❌ Missing**: No dedicated tab (handled by default case → binary viewer)

## Resource Type Status Matrix

| Extension | Status | Current Tab | Backing Parser | Notes |
|-----------|--------|-------------|----------------|-------|
| **2da** | ✅ Full | TabTwoDAEditorState | TwoDAObject | Spreadsheet editor with full UI |
| **are** | ✅ Full | TabAREEditorState | GFFObject (ARE format) | Specialized tabs implemented (Basic/Audio/Map/Environment/Scripts/Rooms) with minimap/map-schema controls, weather/lighting coverage, room editing, and script ResRef autocomplete |
| **bik** | ❌ Missing | None (commented out) | BIKObject | Movie files - no viewer implemented |
| **bwm/dwk/pwk/wok** | ✅ Full | TabWOKEditorState | WalkmeshObject (need to verify) | 3D walkmesh editor with face/vertex/edge modes |
| **dlg** | ⚠️ Fallback | TabDLGEditorState → GFF | DLGObject, DLGNode | Dialog files - redirects to GFF editor |
| **erf** | ✅ Full | TabERFEditorState | ERFObject | Archive viewer with resource list |
| **fac** | ⚠️ Fallback | TabFACEditorState → GFF | GFFObject (FAC format) | Faction files - redirects to GFF editor |
| **gff/res** | ✅ Full | TabGFFEditorState | GFFObject | Generic GFF tree editor |
| **git** | 🟡 Partial Editor | TabGITEditorState | GFFObject (GIT format) | Specialized list/properties editor with insert/duplicate/reorder/delete, schema-aware coordinates, quick instance settings, and per-entry spawnpoint/geometry editing (remove/duplicate/move selected); advanced placement/geometry workflows pending |
| **gui** | ✅ Full | TabGUIEditorState | GFFObject | GUI files - specialized editor |
| **ifo** | 🟡 Partial Editor | TabIFOEditorState | GFFObject (IFO format) | Specialized tabbed editor (Basic/Entry Point/Scripts/Areas/Advanced) with locstring/script mapping fixes, script ResRef autocomplete, module tag generation helper, angle helper for entry direction, and editable area list; deeper parity still pending |
| **jrl** | 🟡 Partial Editor | TabJRLEditorState | GFFObject (JRL format) | Specialized quest/entry editor with add/remove/duplicate/reorder flows, keyboard delete and right-click context actions, locstring editing for quest names and entry text, 2DA-backed helpers for Planet/Plot/Priority, end-node visual cues, and schema-aware field creation; deeper parity workflows still pending |
| **lip** | ✅ Full | TabLIPEditorState | LIPObject | Lip-sync keyframe editor |
| **ltr** | ⚠️ Fallback | TabLTREditorState → GFF | LTRObject | Letter/loot files - redirects to GFF editor |
| **lyt** | ✅ Full | TabTextEditorState | LYTObject | Layout text files - text editor |
| **mdl/mdx** | ✅ Full | TabModelViewerState | MDLObject (need to verify path) | 3D model viewer |
| **mod** | ✅ Full | TabERFEditorState | ERFObject | Module archives - same as ERF |
| **ncs** | ✅ Full | TabTextEditorState | (binary script, converted to NSS) | Compiled scripts - text editor |
| **nss** | ✅ Full | TabTextEditorState | (text) | Script files - Monaco editor with syntax highlighting |
| **pth** | ✅ Full | TabPTHEditorState | (need to verify parser) | Path files - specialized editor |
| **sav** | ⚠️ Fallback | TabSAVEditorState → ERF | ERFObject | Save game archives - redirects to ERF viewer |
| **ssf** | ⚠️ Fallback | TabSSFEditorState → Binary | SSFObject | Sound set files - redirects to binary viewer |
| **tlk** | ⚠️ Fallback | TabTLKEditorState → Binary | TLKObject, TLKString | Talk table - redirects to binary viewer |
| **tpc/tga** | ✅ Full | TabImageViewerState | TPCObject, TGAObject | Texture viewer |
| **txi** | ✅ Full | TabTextEditorState | TXI | Texture info text files - text editor |
| **txt** | ✅ Full | TabTextEditorState | (text) | Plain text files |
| **utc** | ✅ Full | TabUTCEditorState | GFFObject (UTC format) | Creature blueprint editor with 3D preview and script ResRef autocomplete |
| **utd** | ✅ Full | TabUTDEditorState | GFFObject (UTD format) | Door blueprint editor |
| **ute** | ✅ Full | TabUTEEditorState | GFFObject (UTE format) | Encounter blueprint editor with script ResRef autocomplete |
| **uti** | ✅ Full | TabUTIEditorState | GFFObject (UTI format) | Item blueprint editor with tabs |
| **utm** | ✅ Full | TabUTMEditorState | GFFObject (UTM format) | Merchant blueprint editor |
| **utp** | ✅ Full | TabUTPEditorState | GFFObject (UTP format) | Placeable blueprint editor |
| **uts** | ✅ Full | TabUTSEditorState | GFFObject (UTS format) | Sound blueprint editor |
| **utt** | ✅ Full | TabUTTEditorState | GFFObject (UTT format) | Trigger blueprint editor with script ResRef autocomplete |
| **utw** | ✅ Full | TabUTWEditorState | GFFObject (UTW format) | Waypoint blueprint editor |
| **vis** | ⚠️ Fallback | TabVISEditorState → Binary | VISObject | Visibility files - redirects to binary viewer |
| **wav/mp3** | ✅ Full | AudioPlayerState (inline) | (audio) | Audio playback - inline audio player |
| **(default)** | ❌ Missing | TabBinaryViewerState | None | Unknown types - binary hex viewer |

## Summary

### Full Editors
- 2DA, ERF/MOD, GFF, GUI, LIP, LYT/TXI/TXT/NSS/NCS (TabTextEditorState), MDL/MDX, PTH, TPC/TGA, UTC, UTD, UTE, UTI, UTM, UTP, UTS, UTT, UTW, WAV/MP3, WOK/BWM/DWK/PWK, plus default binary viewer for unknown types.

### Partial Editors (3)
- GIT, IFO, JRL

### Fallback/Stub Editors (7)
- **GFF fallback**: DLG, FAC, LTR
- **Binary fallback**: SSF, TLK, VIS
- **ERF fallback**: SAV

### Missing (1+)
- BIK (commented out), any unknown extension → binary viewer

## Priority for Implementation

### High Priority (stub → real editor)
1. **DLG** - Dialog editor (node tree/graph) - Parser: `DLGObject`, `DLGNode`
2. **GIT** - Expand instance placement/geometry workflows - Parser: `GFFObject` (GIT format)
3. **TLK** - Talk table editor (string list) - Parser: `TLKObject`, `TLKString`

### Medium Priority (binary → real editor)
4. **SSF** - Sound set editor (sound mapping) - Parser: `SSFObject`
5. **VIS** - Visibility matrix editor - Parser: `VISObject`

### Medium Priority (ERF → real editor)
6. **SAV** - Save game editor (structured data) - Parser: `ERFObject` + internal GFF structures

### Lower Priority (GFF → specialized)
7. **FAC** - Faction editor (reputation table) - Parser: `GFFObject` (FAC format)
8. **JRL** - Expand journal parity workflows (advanced UX/context actions) - Parser: `GFFObject` (JRL format)
9. **LTR** - Letter editor (loot/letter data) - Parser: `LTRObject`

## TS Parser Locations

All parsers are in `src/resource/*`:
- `BIFObject.ts`, `BIKObject.ts`, `CExoLocString.ts`, `CExoLocSubString.ts`, `DLGNode.ts`, `DLGObject.ts`, `ERFObject.ts`, `GFFField.ts`, `GFFObject.ts`, `GFFStruct.ts`, `KEYObject.ts`, `LIPObject.ts`, `LTRObject.ts`, `LYTObject.ts`, `ResourceTypeInfo.ts`, `ResourceTypes.ts`, `RIMObject.ts`, `SSFObject.ts`, `TGAObject.ts`, `TLKObject.ts`, `TLKString.ts`, `TPCObject.ts`, `TwoDAObject.ts`, `TXI.ts`, `VISObject.ts`

## Maintenance

- Keep this matrix in sync with `FileTypeManager.onOpenResource()` and each tab’s actual UI (full vs fallback).
- See `TABSTATE_EDITORFILE_CONTRACT.md` for TabState/EditorFile and `EditorTabManager` restoration.
