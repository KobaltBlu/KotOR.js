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
| **are** | ⚠️ Fallback | TabAREEditorState → GFF | GFFObject | Area files - redirects to GFF editor |
| **bik** | ❌ Missing | None (commented out) | BIKObject | Movie files - no viewer implemented |
| **bwm/dwk/pwk/wok** | ✅ Full | TabWOKEditorState | WalkmeshObject (need to verify) | 3D walkmesh editor with face/vertex/edge modes |
| **dlg** | ⚠️ Fallback | TabDLGEditorState → GFF | DLGObject, DLGNode | Dialog files - redirects to GFF editor |
| **erf** | ✅ Full | TabERFEditorState | ERFObject | Archive viewer with resource list |
| **fac** | ⚠️ Fallback | TabFACEditorState → GFF | GFFObject (FAC format) | Faction files - redirects to GFF editor |
| **gff/res** | ✅ Full | TabGFFEditorState | GFFObject | Generic GFF tree editor |
| **git** | ⚠️ Fallback | TabGITEditorState → GFF | GFFObject (GIT format) | Game instance template - redirects to GFF |
| **gui** | ✅ Full | TabGUIEditorState | GFFObject | GUI files - specialized editor |
| **ifo** | ⚠️ Fallback | TabIFOEditorState → GFF | GFFObject (IFO format) | Module info - redirects to GFF editor |
| **jrl** | ⚠️ Fallback | TabJRLEditorState → GFF | GFFObject (JRL format) | Journal files - redirects to GFF editor |
| **lip** | ✅ Full | TabLIPEditorState | LIPObject | Lip-sync keyframe editor |
| **ltr** | ⚠️ Fallback | TabLTREditorState → GFF | LTRObject | Letter/loot files - redirects to GFF editor |
| **lyt** | ✅ Full | TabTextEditorState | LYTObject | Layout text files - text editor |
| **mdl/mdx** | ✅ Full | TabModelViewerState | MDLObject (need to verify path) | 3D model viewer |
| **mod** | ✅ Full | TabERFEditorState | ERFObject | Module archives - same as ERF |
| **ncs** | ✅ Full | TabTextEditorState | (binary script, decompiled to NSS) | Compiled scripts - text editor |
| **nss** | ✅ Full | TabTextEditorState | (text) | Script files - Monaco editor with syntax highlighting |
| **pth** | ✅ Full | TabPTHEditorState | (need to verify parser) | Path files - specialized editor |
| **sav** | ⚠️ Fallback | TabSAVEditorState → ERF | ERFObject | Save game archives - redirects to ERF viewer |
| **ssf** | ⚠️ Fallback | TabSSFEditorState → Binary | SSFObject | Sound set files - redirects to binary viewer |
| **tlk** | ⚠️ Fallback | TabTLKEditorState → Binary | TLKObject, TLKString | Talk table - redirects to binary viewer |
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
| **vis** | ⚠️ Fallback | TabVISEditorState → Binary | VISObject | Visibility files - redirects to binary viewer |
| **wav/mp3** | ✅ Full | AudioPlayerState (inline) | (audio) | Audio playback - inline audio player |
| **(default)** | ❌ Missing | TabBinaryViewerState | None | Unknown types - binary hex viewer |

## Summary

### Full Editors
- 2DA, ERF/MOD, GFF, GUI, LIP, LYT/TXI/TXT/NSS/NCS (TabTextEditorState), MDL/MDX, PTH, TPC/TGA, UTC, UTD, UTE, UTI, UTM, UTP, UTS, UTT, UTW, WAV/MP3, WOK/BWM/DWK/PWK, plus default binary viewer for unknown types.

### Fallback/Stub Editors (11)
- **GFF fallback**: ARE, DLG, FAC, GIT, IFO, JRL, LTR
- **Binary fallback**: SSF, TLK, VIS
- **ERF fallback**: SAV

### Missing (1+)
- BIK (commented out), any unknown extension → binary viewer

## Priority for Implementation

### High Priority (stub → real editor)
1. **DLG** - Dialog editor (node tree/graph) - Parser: `DLGObject`, `DLGNode`
2. **ARE** - Area editor (rooms, environment) - Parser: `GFFObject` (ARE format)
3. **GIT** - Instance placement editor - Parser: `GFFObject` (GIT format)
4. **IFO** - Module info editor - Parser: `GFFObject` (IFO format)

### Medium Priority (binary → real editor)
5. **TLK** - Talk table editor (string list) - Parser: `TLKObject`, `TLKString`
6. **SSF** - Sound set editor (sound mapping) - Parser: `SSFObject`
7. **VIS** - Visibility matrix editor - Parser: `VISObject`

### Medium Priority (ERF → real editor)
8. **SAV** - Save game editor (structured data) - Parser: `ERFObject` + internal GFF structures

### Lower Priority (GFF → specialized)
9. **FAC** - Faction editor (reputation table) - Parser: `GFFObject` (FAC format)
10. **JRL** - Journal editor (quest tree) - Parser: `GFFObject` (JRL format)
11. **LTR** - Letter editor (loot/letter data) - Parser: `LTRObject`

## TS Parser Locations

All parsers are in `src/resource/*`:
- `BIFObject.ts`, `BIKObject.ts`, `CExoLocString.ts`, `CExoLocSubString.ts`, `DLGNode.ts`, `DLGObject.ts`, `ERFObject.ts`, `GFFField.ts`, `GFFObject.ts`, `GFFStruct.ts`, `KEYObject.ts`, `LIPObject.ts`, `LTRObject.ts`, `LYTObject.ts`, `ResourceTypeInfo.ts`, `ResourceTypes.ts`, `RIMObject.ts`, `SSFObject.ts`, `TGAObject.ts`, `TLKObject.ts`, `TLKString.ts`, `TPCObject.ts`, `TwoDAObject.ts`, `TXI.ts`, `VISObject.ts`

## Maintenance

- Keep this matrix in sync with `FileTypeManager.onOpenResource()` and each tab’s actual UI (full vs fallback).
- See `TABSTATE_EDITORFILE_CONTRACT.md` for TabState/EditorFile and `EditorTabManager` restoration.
