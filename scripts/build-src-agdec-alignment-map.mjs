/**
 * Builds docs/agent-native/src-agdec-alignment-map.json with one entry per TypeScript file under src/.
 * Merge manual seeds into generated defaults; re-run after adding files or updating seeds.
 *
 * Usage: node scripts/build-src-agdec-alignment-map.mjs
 *
 * Anchor discovery: prefer inspect-memory / read-bytes / disassembly-scoped search-everything / get-references / execute-script (findBytes)—not search-symbols as primary (see .cursor/k1-binary-exe-coverage-model.md §2a).
 * When HTTP MCP tools fail, mirror lookups with agentdecompile-cli (see .cursor/k1-binary-exe-coverage-model.md §2b for env-based server URL; never commit credentials):
 *   uvx --refresh --from git+https://github.com/bolabaden/agentdecompile agentdecompile-cli --server-url "<URL>" list project-files
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(repoRoot, 'src');
const outPath = path.join(repoRoot, 'docs', 'agent-native', 'src-agdec-alignment-map.json');

/** @type {Record<string, { status: string, agdec_refs: object[], notes?: string }>} */
const MANUAL_SEEDS = {
  'src/resource/GFFObject.ts': {
    status: 'partial',
    notes:
      'Header parse + table validation reviewed vs CResGFF::OnResourceServiced (0x00410740); CreateGFFFile (0x00411260). V3.2-only gate matches packed compare at header+4. K1 GOG + Win32 Amazon + Xbox default.xbe + macOS bundle (__cstring) + TSL Win32 (Steam / GOG Aspyr / CD 1.0 / CD 1.0b) NUL-terminated V3.2 literal VAs verified via read-bytes / execute-script (findBytes); Win PE uses .rdata; XBE/Mac use platform section names and different image bases. Full export/buildStruct stack not exhaustively traced.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResGFF::OnResourceServiced',
        address: '0x00410740',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResGFF::CreateGFFFile',
        address: '0x00411260',
      },
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResGFFStruct',
        layout_note: '12 bytes: id, data_or_offset, field_count',
      },
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResGFFField',
        layout_note: '12 bytes: type, label_index, data_or_data_offset',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        address: '0x0073e2c8',
        text: 'V3.2',
        layout_note:
          'Pointer to this string also stored at 0x0078d3cc (DATA); xrefs include OnResourceServiced / CreateGFFFile sites.',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_steam_aspyr_swkotor2.exe',
        address: '0x0099c43c',
        text: 'V3.2',
        layout_note: 'NUL-terminated in .rdata; first occurrence from ASCII scan (Steam Aspyr survey).',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_gog_aspyr_swkotor2.exe',
        address: '0x0099794c',
        text: 'V3.2',
        layout_note: 'First NUL-terminated V3.2 in .rdata (GOG Aspyr); same embedded-table tail pattern as Steam survey.',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_CD_1.0b_swkotor2.exe',
        address: '0x007b6290',
        text: 'V3.2',
        layout_note: 'First NUL-terminated V3.2 in .rdata (Win CD 1.0b); pointers/immediate tail layout differs from digital builds.',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_CD_1.0_swkotor2.exe',
        address: '0x007b6290',
        text: 'V3.2',
        layout_note: 'Same first-hit VA as CD 1.0b (segments + execute-script survey agree).',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_win_amazongames_swkotor.exe',
        address: '0x00882ed4',
        text: 'V3.2',
        layout_note: 'First NUL-terminated V3.2 in .rdata (Amazon Games Win32 build).',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_xbox_default.xbe',
        address: '0x003e6650',
        text: 'V3.2',
        layout_note: 'First NUL-terminated V3.2 in .rdata (XBE mapped image; inspect-memory segments).',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_mac_swkotor.app',
        address: '0x003d79fc',
        text: 'V3.2',
        layout_note: 'In __cstring (Mach-O); first-hit execute-script + read-bytes survey.',
      },
    ],
  },
  'src/resource/GFFObject.test.ts': {
    status: 'partial',
    notes: 'Contract tests for GFF parse/export; agdec anchors inherited from GFFObject.ts.',
    agdec_refs: [{ inherits_from: 'src/resource/GFFObject.ts' }],
  },
  'src/resource/KEYObject.ts': {
    status: 'partial',
    notes:
      'Static .key V1 layout (64-byte header, 12-byte BIF rows, 22-byte key rows, res id mask 0x3FFFFFFF) aligned via loader disassembly review; runtime CKeyTableEntry stride differs.',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoKeyTable',
      },
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CKeyTableEntry',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::AddKeyTable',
        address: '0x00406e20',
        note: 'Fuzzy symbol match from search-everything; confirm callers when extending.',
      },
    ],
  },
  'src/resource/TLKObject.ts': {
    status: 'partial',
    notes:
      'TLK V3.0 token compare path (not GFF); K1 GOG CTlkTable::FetchInternal READ-ref verified against NUL-terminated literal VA (see string_literal). K1 Amazon + Xbox + macOS __cstring + TSL Steam / GOG Aspyr / CD 1.0 / CD 1.0b add parallel literals (verify FetchInternal xrefs per SKU when extending). Prior K1 GOG seed pointed at .data pointer slot, not string bytes.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CTlkTable::FetchInternal',
        address: '0x0041e1a0',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        address: '0x0073ecd4',
        text: 'V3.0',
        layout_note: 'Pointer at 0x0078d3ec (DATA); instruction xref READ inside FetchInternal.',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_steam_aspyr_swkotor2.exe',
        address: '0x0099c490',
        text: 'V3.0',
        layout_note: 'NUL-terminated; followed by embedded "TLK " token table material in .rdata (read-bytes survey).',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_gog_aspyr_swkotor2.exe',
        address: '0x009979a0',
        text: 'V3.0',
        layout_note: 'NUL-terminated; same TLK-table tail pattern as Steam Aspyr survey.',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_CD_1.0b_swkotor2.exe',
        address: '0x007b6c9c',
        text: 'V3.0',
        layout_note: 'NUL-terminated in .rdata (CD 1.0b); following bytes differ from digital Aspyr builds.',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_CD_1.0_swkotor2.exe',
        address: '0x007b6c9c',
        text: 'V3.0',
        layout_note: 'Same VA as CD 1.0b first-hit survey.',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_win_amazongames_swkotor.exe',
        address: '0x00883150',
        text: 'V3.0',
        layout_note: 'NUL-terminated; followed by Invalid STRREF diagnostic text (read-bytes survey).',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_xbox_default.xbe',
        address: '0x003f43b4',
        text: 'V3.0',
        layout_note: 'NUL-terminated in .rdata; first-hit execute-script (near CACHE:/MODULES cluster).',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_mac_swkotor.app',
        address: '0x003d7940',
        text: 'V3.0',
        layout_note: 'In __cstring after RIM leak fragment (read-bytes @ 0x003d7934).',
      },
    ],
  },
  'src/resource/BIFObject.ts': {
    status: 'partial',
    notes:
      'On-disk header BIFF + V1 + var/fixed counts + var table offset (20 bytes) and 16-byte variable index rows match documented Aurora BIF. Native archive reader not fully disassembly-traced; GetResObject uses BIF type string for resource dispatch. K1 Xbox: BIF\\0DIR\\0ERF\\0 after CACHE: stub (read-bytes @ 0x003f4328); DATA xref from GetResObject @ 0x001403d2. K1 macOS: BIF\\0ERF\\0DIR\\0 after CD0: (read-bytes @ 0x003d78e8); DATA xref from GetResObject @ 0x0038e2ce. K1 Amazon: after RIM leak / %s%03d, cluster BIF\\0ERF\\0DIR\\0 @ 0x00882dd8; DATA xref FUN_0062afd0 @ 0x0062b121. TSL Steam: ERF\\0BIF\\0 after RIM leak; DATA xref FUN_00712970 @ 0x00712a56. TSL GOG: DIR\\0ERF\\0BIF\\0; DATA xref FUN_0061c2d0 @ 0x0061c3b6. TSL Win CD 1.0 / 1.0b: BIF\\0DIR\\0ERF\\0 (read-bytes @ 0x007b5868); Ghidra may show no DATA xrefs on CD builds.',
    agdec_refs: [
      {
        kind: 'string_literal',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        address: '0x0073d8dc',
        text: 'BIF',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_steam_aspyr_swkotor2.exe',
        address: '0x0099c3dc',
        text: 'BIF',
        layout_note: 'Adjacent ERF literal @ 0x0099c3d8 (same .rdata cluster as "%03d" / RIM leak message).',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_gog_aspyr_swkotor2.exe',
        address: '0x009978a4',
        text: 'BIF',
        layout_note: 'Follows DIR\\0 and ERF\\0 @ 0x00997898 (read-bytes); DATA ref @ 0x0061c3b6 in FUN_0061c2d0.',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_CD_1.0b_swkotor2.exe',
        address: '0x007b587c',
        text: 'BIF',
        layout_note: 'RIM leak message → BIF\\0DIR\\0ERF\\0… cluster (read-bytes @ 0x007b5868); order differs from Aspyr digital.',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_CD_1.0_swkotor2.exe',
        address: '0x007b587c',
        text: 'BIF',
        layout_note: 'Same leak-cluster VA as CD 1.0b (read-bytes @ 0x007b5868).',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_win_amazongames_swkotor.exe',
        address: '0x00882de4',
        text: 'BIF',
        layout_note: 'Cluster read-bytes @ 0x00882dd8; DATA ref @ 0x0062b121 in FUN_0062afd0.',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_xbox_default.xbe',
        address: '0x003f433c',
        text: 'BIF',
        layout_note: 'K1 GOG order BIF\\0DIR\\0ERF\\0 (read-bytes @ 0x003f4328); DATA ref GetResObject @ 0x001403d2.',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_mac_swkotor.app',
        address: '0x003d7900',
        text: 'BIF',
        layout_note: 'Amazon-style BIF\\0ERF\\0DIR\\0 (read-bytes @ 0x003d78e8); DATA ref GetResObject @ 0x0038e2ce.',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'LocateBifFile',
        address: '0x0040d200',
      },
    ],
  },
  'src/resource/GFFStruct.ts': {
    status: 'partial',
    notes: 'In-memory GFF tree; on-disk struct row layout matches CResGFFStruct (12 bytes) as parsed in GFFObject.',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResGFFStruct',
        layout_note: '12 bytes',
      },
    ],
  },
  'src/resource/GFFField.ts': {
    status: 'partial',
    notes:
      'Field types and export layout tie to CResGFFField (12 bytes) and GFFObject build paths; per-type payload sizes not all re-walked here.',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResGFFField',
        layout_note: '12 bytes',
      },
    ],
  },
  'src/resource/ERFObject.ts': {
    status: 'partial',
    notes:
      'parseHeader matches CERFHeader (160 bytes) on CERFFile: file_type, version, language_count, localized_string_size, entry_count, offsets to localized/key/resource sections, build_year/day, description_str_ref, 116-byte reserved. Accepts ERF/MOD/SAV with V1.0 like native archives. Key/resource row layouts vs CERF types not fully traced in this pass. K1 Xbox ERF @ 0x003f4344 (DATA xref GetResObject @ 0x00140309). K1 macOS ERF @ 0x003d7904 (DATA xref GetResObject @ 0x0038e2f1). K1 Amazon ERF @ 0x00882de8 (FUN_0062afd0 @ 0x0062b096). TSL Steam @ 0x0099c3d8; TSL GOG @ 0x009978a0; TSL CD 1.0 / 1.0b @ 0x007b5884 (read-bytes @ 0x007b5868).',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CERFHeader',
        layout_note: '160 bytes',
      },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CERFFile' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CERFRes' },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        address: '0x0073d8e4',
        text: 'ERF',
        note: 'Referenced from CExoResMan::GetResObject (push @ 0x00407589)',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_steam_aspyr_swkotor2.exe',
        address: '0x0099c3d8',
        text: 'ERF',
        layout_note: 'Packed with BIF @ 0x0099c3dc; cluster verified read-bytes @ 0x0099c3b0.',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_gog_aspyr_swkotor2.exe',
        address: '0x009978a0',
        text: 'ERF',
        layout_note: 'Between DIR\\0 and BIF\\0 (see read-bytes @ 0x00997898).',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_CD_1.0b_swkotor2.exe',
        address: '0x007b5884',
        text: 'ERF',
        layout_note: 'After BIF\\0DIR\\0 in leak-adjacent cluster (read-bytes @ 0x007b5868).',
      },
      {
        kind: 'string_literal',
        program_path: '/TSL/k2_win_CD_1.0_swkotor2.exe',
        address: '0x007b5884',
        text: 'ERF',
        layout_note: 'Same VA as CD 1.0b leak-cluster survey.',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_win_amazongames_swkotor.exe',
        address: '0x00882de8',
        text: 'ERF',
        layout_note: 'Between BIF\\0 and DIR\\0 (read-bytes @ 0x00882dd8); DATA ref @ 0x0062b096 in FUN_0062afd0.',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_xbox_default.xbe',
        address: '0x003f4344',
        text: 'ERF',
        layout_note: 'After BIF\\0DIR\\0 (read-bytes @ 0x003f4328); DATA ref GetResObject @ 0x00140309.',
      },
      {
        kind: 'string_literal',
        program_path: '/K1/k1_mac_swkotor.app',
        address: '0x003d7904',
        text: 'ERF',
        layout_note: 'Between BIF\\0 and DIR\\0 (read-bytes @ 0x003d78e8); DATA ref GetResObject @ 0x0038e2f1.',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/RIMObject.ts': {
    status: 'partial',
    notes:
      'On-disk RIM V1.0 (four-char type + version + 32-byte resource rows); resourcesOffset 0 coerced to 120 matches tolerant vanilla behavior. CExoResMan::GetResObject compares packed extensions against a contiguous table at 0x0073d8dc (BIF, DIR, ERF, …)—0x0073d8e0 is DIR, not RIM. Rim file loading also tied to resman (rim_key_table / AsyncRimLoadThreadProc).',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan',
        field_note: 'rim_key_table@0x1c, rims_are_modules@0x54',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'AsyncRimLoadThreadProc',
        address: '0x00409b90',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/TwoDAObject.ts': {
    status: 'partial',
    notes:
      'Implements text .2da (2DA + V2.b/V2.0) parsing and export; binary has no obvious V2.b string. Runtime 2D array graph uses C2DA / CRes2DA and CTwoDimArrays (see CSWRules). Text vs in-memory native paths differ.',
    agdec_refs: [
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CRes2DA' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'C2DA' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CTwoDimArrays' },
    ],
  },
  'src/resource/resRefLayout.ts': {
    status: 'partial',
    notes:
      '16-byte fixed-slot ResRef + GFF length-prefixed payload matches structure CResRef (internal union resref_internal char[16]) in K1 DB; constructors at 0x00405ed0 / 0x00406d80 etc.',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResRef',
        layout_note: '16 bytes resref_internal',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResRef::CResRef(char*)',
        address: '0x00406d80',
        note: 'High-call-volume string ctor; spot-check archive/GFF readers.',
      },
    ],
  },
  'src/resource/resRefLayout.test.ts': {
    status: 'partial',
    notes: 'Unit tests for ResRef read/write helpers; anchors inherited from resRefLayout.ts.',
    agdec_refs: [{ inherits_from: 'src/resource/resRefLayout.ts' }],
  },
  'src/resource/SSFObject.ts': {
    status: 'partial',
    notes:
      'On-disk SSF V1.1 header (12 bytes) + strref table; runtime ties to CResHelper<CResSSF,2060> on CSoundSet (resource kind 2060 matches ResourceTypes.ssf). CResSSF::OnResourceServiced not traced in this pass; 28-slot read/write matches KotOR game-data tooling convention—native fixed slot count not exhaustively traced.',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResHelper<CResSSF,2060>',
        layout_note: '28 bytes: vtable, requested, CResSSF*, CResRef',
      },
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CSoundSet',
        note: 'Field embeds CResHelper<CResSSF,2060> per K1 structure archive.',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/SSFObject.test.ts': {
    status: 'partial',
    notes: 'Contract tests for SSF parse/serialize; agdec anchors inherited from SSFObject.ts.',
    agdec_refs: [{ inherits_from: 'src/resource/SSFObject.ts' }],
  },
  'src/resource/TPCObject.ts': {
    status: 'partial',
    notes:
      '128-byte .tpc header + mips/TXI tail implemented here; no dedicated CResTPC symbol in K1 DB snapshot. Related native texture paths: CResDDS (2033), CResTGA, plus generic CRes/CExoResMan::GetResObject dispatch. Resource ID 3007 (.tpc) not observed as CResHelper template parameter in sampled helper list—needs deeper ResMan table walk.',
    agdec_refs: [
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResDDS' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResTGA' },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/TPCObject.test.ts': {
    status: 'partial',
    notes: 'TPC roundtrip / header tests; agdec anchors inherited from TPCObject.ts.',
    agdec_refs: [{ inherits_from: 'src/resource/TPCObject.ts' }],
  },
  'src/resource/ResourceTypes.ts': {
    status: 'partial',
    notes:
      'Central numeric ID map; verified subsets tie to K1 CResHelper<A,B> template params where present (e.g. CResHelper<CResNSS,2009>, CResNCS 2010, CRes2DA 2017, CResTXI 2022, CResDDS 2033, CResSSF 2060, CResLYT 3000, CResMDX 3008). Many IDs are Aurora-era extensions—only partially correlated.',
    agdec_refs: [
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CResNSS,2009>' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CResNCS,2010>' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CRes2DA,2017>' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CResTXI,2022>' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CResDDS,2033>' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CResSSF,2060>' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CResLYT,3000>' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CResMDX,3008>' },
    ],
  },
  'src/resource/TXI.ts': {
    status: 'partial',
    notes:
      'Text-side .txi key/value parser for texture metadata; native counterpart loads via CResTXI / CResHelper<CResTXI,2022> (CAuroraTXI embeds helper). OnResourceServiced body not walked here.',
    agdec_refs: [
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResTXI' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CResTXI,2022>' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CAuroraTXI' },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/TXI.test.ts': {
    status: 'partial',
    notes: 'TXI parse tests; anchors inherited from TXI.ts.',
    agdec_refs: [{ inherits_from: 'src/resource/TXI.ts' }],
  },
  'src/resource/LIPObject.ts': {
    status: 'partial',
    notes:
      'On-disk LIP V1.0 header/keyframe layout implemented here (resource type 3004 per ResourceTypes.lip). No CResLIP / CResHelper<...,3004> hit in sampled K1 helper inventory—correlation deferred to deeper ResMan/type table review.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/LIPObject.test.ts': {
    status: 'partial',
    notes: 'LIP parse tests; anchors inherited from LIPObject.ts.',
    agdec_refs: [{ inherits_from: 'src/resource/LIPObject.ts' }],
  },
  'src/resource/TGAObject.ts': {
    status: 'partial',
    notes:
      'Uncompressed TGA type-2 reader/writer; native texture resource uses CResTGA (extends CRes). Resource kind ID 3 (.tga) per ResourceTypes.',
    agdec_refs: [
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResTGA' },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/WAVObject.ts': {
    status: 'partial',
    notes:
      'KotOR-specific RIFF/WAVE wrappers (VO duplicate header, SFX 470-byte prefix, MP3-in-WAV). No CResWAV symbol in K1 DB snapshot; audio payloads typically resolved through generic resource buffers / Miles—needs targeted xref pass.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/WAVObject.test.ts': {
    status: 'partial',
    notes: 'WAV deobfuscation tests; anchors inherited from WAVObject.ts.',
    agdec_refs: [{ inherits_from: 'src/resource/WAVObject.ts' }],
  },
  'src/resource/LYTObject.ts': {
    status: 'partial',
    notes:
      'ASCII .lyt layout parser (#MAXLAYOUT ASCII); native resource graph uses CResLYT with CResHelper<CResLYT,3000>.',
    agdec_refs: [
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResLYT' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CResLYT,3000>' },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/LYTObject.test.ts': {
    status: 'partial',
    notes: 'LYT tests; anchors inherited from LYTObject.ts.',
    agdec_refs: [{ inherits_from: 'src/resource/LYTObject.ts' }],
  },
  'src/resource/VISObject.ts': {
    status: 'partial',
    notes: 'ASCII .vis room visibility graph; native counterpart CResVIS (resource kind 3001).',
    agdec_refs: [
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResVIS' },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/VISObject.test.ts': {
    status: 'partial',
    notes: 'VIS tests; anchors inherited from VISObject.ts.',
    agdec_refs: [{ inherits_from: 'src/resource/VISObject.ts' }],
  },
  'src/loaders/TPCLoader.ts': {
    status: 'partial',
    notes:
      'JS-side lookup of .tpc (ResourceTypes.tpc / 3007) from ERF texture packs; parallels archive resolution before CRes-backed decode (see TPCObject.ts for header correlation gaps).',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CERFFile' },
    ],
  },
  'src/loaders/TGALoader.ts': {
    status: 'partial',
    notes: 'Loads .tga bytes through TGAObject; native hook CResTGA / resource ID 3.',
    agdec_refs: [
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResTGA' },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/loaders/TextureLoader.ts': {
    status: 'partial',
    notes:
      'Orchestrates TPC/TGA loading paths used by the Web/Electron client; corresponds to engine texture acquisition layered on ResMan-backed assets (CResTGA, .tpc container—see TPCObject seed).',
    agdec_refs: [
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResTGA' },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/engine/BinaryAnalysis.ts': {
    status: 'partial',
    notes:
      'PE spans from inspect-memory (K1 GOG, TSL CD 1.0b, TSL Steam Aspyr, TSL GOG Aspyr). OpenGL proc-name anchors verified earlier (read-bytes K1; strings TSL CD). TS exports TSL_BINARY_LAYOUT=Steam, TSL_GOG_ASPYR_BINARY_LAYOUT, TSL_CD_10B_BINARY_LAYOUT.',
    agdec_refs: [
      {
        kind: 'program_layout',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        regions_note:
          'GOG: Headers 00400000–00400fff; .text 00401000–0073cfff; .rdata 0073d000–0078cfff; .data 0078d000–007a3fff + uninit.; .rsrc 00836000–0086cfff.',
      },
      {
        kind: 'program_layout',
        program_path: '/TSL/k2_win_CD_1.0b_swkotor2.exe',
        regions_note:
          'CD 1.0b: Headers 00400000–00400bff; .text 00401000–007b4fff; .rdata 007b5000–0080b7ff; .data 0080c000–008ba037; .rsrc 008bb000–008f19ff.',
      },
      {
        kind: 'program_layout',
        program_path: '/TSL/k2_win_steam_aspyr_swkotor2.exe',
        regions_note:
          'Steam Aspyr: Headers 00400000–004003ff; .text 00401000–009857ff; .rdata 00986000–009f31ff; .data 009f4000–00a81f3b; .rsrc 00a82000–00ab8bff — matches TSL_BINARY_LAYOUT in TS.',
      },
      {
        kind: 'program_layout',
        program_path: '/TSL/k2_win_gog_aspyr_swkotor2.exe',
        regions_note:
          'GOG Aspyr: .text 00401000–00984bff; .rdata 00985000–009f1dff; .data 009f2000–00a7865b; .rsrc 00a79000–00aafbff — matches TSL_GOG_ASPYR_BINARY_LAYOUT in TS.',
      },
      {
        kind: 'address_marker',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        address: '0x0078B146',
        label: 'RDATA_OPENGL_PROC_NAME_SAMPLE',
        layout_note: 'ASCII chain glEnable / glBlendFunc… inside .rdata; not section base.',
      },
      {
        kind: 'address_marker',
        program_path: '/TSL/k2_win_CD_1.0b_swkotor2.exe',
        address: '0x00809C96',
        label: 'RDATA_OPENGL_PROC_NAME_SAMPLE',
        layout_note: '`glEnable` literal VA in .rdata (strings search); replaces invalid out-of-image bookmark.',
      },
    ],
  },
  'src/resource/LTRObject.ts': {
    status: 'partial',
    notes:
      'Binary .ltr letter-table layout (header + float weights); native resource uses CResLTR (~92-byte resource wrapper over CRes). Resource kind 2036 per ResourceTypes.ltr.',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResLTR',
        layout_note: '~92 bytes over CRes base',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/LTRObject.test.ts': {
    status: 'partial',
    notes: 'LTR parse tests; anchors inherited from LTRObject.ts.',
    agdec_refs: [{ inherits_from: 'src/resource/LTRObject.ts' }],
  },
  'src/loaders/MDLLoader.ts': {
    status: 'partial',
    notes:
      'Loads MDL (2002) + companion MDX (3008); native types CResMDL and CResHelper<CResMDX,3008> (model geometry extension). Binary MDL parse stack not fully traced in this pass.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDL' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CResMDX,3008>' },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/loaders/ResourceLoader.ts': {
    status: 'partial',
    notes:
      'JS cache/layered lookup over KEY/RIM/ERF mirrors CExoResMan archive resolution at a high level; per-type demand loading not mapped line-for-line.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CExoKeyTable' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CKeyTableEntry' },
    ],
  },
  'src/loaders/TemplateLoader.ts': {
    status: 'partial',
    notes:
      'Deprecated helper loading UTC/UTP-style templates as GFF; ties to CResGFF / template BIF resolution same family as GFFObject.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResGFF::OnResourceServiced',
        address: '0x00410740',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/CExoLocString.ts': {
    status: 'partial',
    notes:
      'In-memory localized string list + TLK strref; native CExoLocString is 8 bytes (internal pointer + strref-sized field) on CSWSObject / stats paths—JS shape is behavioral equivalent, not byte-identical.',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoLocString',
        layout_note: '8 bytes: CExoLocStringInternal*, strref-related int',
      },
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CSWSObject',
        note: 'Embeds CExoLocString for names',
      },
    ],
  },
  'src/resource/CExoLocSubString.ts': {
    status: 'partial',
    notes:
      'Per-language/gender substring bucket used by CExoLocString serialization; aligns with engine loc-string components without matching CExoLocStringInternal layout byte-for-byte here.',
    agdec_refs: [{ inherits_from: 'src/resource/CExoLocString.ts' }],
  },
  'src/resource/DLGObject.ts': {
    status: 'partial',
    notes:
      'Conversation graph backed by GFF parse (see GFFObject); .dlg resource kind 2029. Runtime DLG resource type naming varies in DB—treat as GFF-derived module asset.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CResGFF::OnResourceServiced',
        address: '0x00410740',
      },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/resource/DLGNode.ts': {
    status: 'partial',
    notes:
      'Single DLG node record shape in TS; native storage is GFF field graph—anchors inherited from DLGObject/GFF stack.',
    agdec_refs: [{ inherits_from: 'src/resource/DLGObject.ts' }],
  },
  'src/resource/BIKObject.ts': {
    status: 'partial',
    notes:
      'Stock client treats .bik as resource kind 2063 (see ResourceTypes); playback uses native video decode—this implementation streams frames via a dedicated worker instead.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
      { inherits_from: 'src/resource/ResourceTypes.ts' },
    ],
  },
  'src/nwscript/NWScript.ts': {
    status: 'partial',
    notes:
      'Interprets compiled .ncs bytecode for the same NWScript VM family as stock; native CVirtualMachineInternal ties script loading to CResHelper<CResNCS,2010> / CResNCS. Per-opcode parity not fully audited.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CVirtualMachineInternal' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResHelper<CResNCS,2010>' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResNCS' },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/nwscript/NWScriptStack.ts': {
    status: 'partial',
    notes:
      'Operand stack modeled after CVirtualMachineStack (stack pointer, base pointer, typed slots); JS uses NWScriptStackVariable rather than VM_STACK_TYPES-backed raw buffers.',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CVirtualMachineStack',
        layout_note: 'stack_pointer, base_pointer, total_size, types*, data*, vm*',
      },
      { inherits_from: 'src/nwscript/NWScript.ts' },
    ],
  },
  'src/resource/TLKString.ts': {
    status: 'partial',
    notes: 'Single TLK row fields after header/token parse; CTlkTable::FetchInternal path inherited from TLKObject.',
    agdec_refs: [{ inherits_from: 'src/resource/TLKObject.ts' }],
  },
  'src/resource/MDLBinaryReader.ts': {
    status: 'partial',
    notes:
      'Binary geometry reader for MDL payload (resource kind 2002); complements MDLLoader native CResMDL / MDX helper correlation—header/node walk not fully traced against OnResourceServiced.',
    agdec_refs: [
      { inherits_from: 'src/loaders/MDLLoader.ts' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDL' },
    ],
  },
  'src/resource/ResourceHeuristics.ts': {
    status: 'partial',
    notes:
      'Maps extensions and magic probes to ResourceTypes keys used by loader dispatch; no separate native symbol beyond resource-manager type IDs.',
    agdec_refs: [{ inherits_from: 'src/resource/ResourceTypes.ts' }],
  },
  'src/nwscript/NWScriptOPCodes.ts': {
    status: 'partial',
    notes:
      'Numeric opcode constants for .ncs bytecode; aligned with Bioware-era NWScript VM numbering documented for Neverwinter Nights data formats (see file header link). Native execution ties to CVirtualMachineInternal / CVirtualMachineCmdImplementer families—not opcode-by-opcode disassembly traced here.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CVirtualMachineInternal' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CVirtualMachineCmdImplementer' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWVirtualMachineCommands' },
      { inherits_from: 'src/nwscript/NWScript.ts' },
    ],
  },
  'src/nwscript/NWScriptOPCodes.test.ts': {
    status: 'partial',
    notes: 'Opcode constant smoke tests; anchors inherited from NWScriptOPCodes.ts.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptOPCodes.ts' }],
  },
  'src/nwscript/NWScriptInstructionInfo.ts': {
    status: 'partial',
    notes: 'Human-readable opcode names keyed by numeric opcode; mirrors NWScriptOPCodes numbering.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptOPCodes.ts' }],
  },
  'src/nwscript/NWScriptInstruction.ts': {
    status: 'partial',
    notes:
      'Decoded instruction record plus OP_CALL_MAP into NWScriptInstructionSet handlers; stock VM consumes the same opcode bytes from CResNCS-backed script buffers.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResNCS' },
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
      { inherits_from: 'src/nwscript/NWScript.ts' },
    ],
  },
  'src/nwscript/NWScriptInstructionSet.ts': {
    status: 'partial',
    notes:
      'CALL_* implementations for stack/control-flow opcodes; semantic parity with stock opcode handlers asserted via engine behavior rather than per-function native addresses in this pass.',
    agdec_refs: [
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CVirtualMachineStack' },
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
      { inherits_from: 'src/nwscript/NWScriptStack.ts' },
    ],
  },
  'src/nwscript/NWScriptInstance.ts': {
    status: 'partial',
    notes:
      'Per-run script state (instruction map, stack, caller object, store-state slots); models script execution context held alongside native CVirtualMachineScript entries at a high level.',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CVirtualMachineInternal',
        note: 'Contains CVirtualMachineScript[8] script slots',
      },
      { inherits_from: 'src/nwscript/NWScript.ts' },
    ],
  },
  'src/nwscript/NWScriptStackVariable.ts': {
    status: 'partial',
    notes:
      'Typed stack slot wrapper; corresponds to VM_STACK_TYPES-discriminated stack entries in CVirtualMachineStack.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptStack.ts' }],
  },
  'src/nwscript/NWScriptSubroutine.ts': {
    status: 'partial',
    notes:
      'Call-frame helper (return PC, delayed commands); JS-side structuring for nested calls—native subroutine bookkeeping not mapped line-for-line.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptInstance.ts' }],
  },
  'src/nwscript/NWScriptConstants.ts': {
    status: 'partial',
    notes:
      'NW_TRUE/NW_FALSE integer sentinels for BOOL stack values; matches NWScript boolean convention used alongside VM_STACK_TYPES BOOL slots.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScript.ts' }],
  },
  'src/nwscript/NWScriptDef.ts': {
    status: 'partial',
    notes:
      'Shared Actions registry populated by game-specific tables (K1/K2); parallels native engine command lookup behind CVirtualMachineCmdImplementer / CSWVirtualMachineCommands indirection.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWVirtualMachineCommands' },
      { inherits_from: 'src/nwscript/NWScript.ts' },
    ],
  },
  'src/nwscript/NWScriptDefK1.ts': {
    status: 'partial',
    notes:
      'KotOR I engine command implementations keyed by ACTION ID (0..771) invoked via OP_ACTION (0x05); native dispatch table not opcode-logged per handler in this pass.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWVirtualMachineCommands' },
      { kind: 'data_type', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CVirtualMachineCmdImplementer' },
      { inherits_from: 'src/nwscript/NWScriptDef.ts' },
    ],
  },
  'src/nwscript/NWScriptDefK2.ts': {
    status: 'partial',
    notes:
      'TSL extends K1 commands with IDs 772..876 after merging shared handlers; treat extended indices as TSL-binary behavioral targets—no separate per-ID agdec confirmation here.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/nwscript/decompiler/NWScriptDecompiler.ts': {
    status: 'partial',
    notes:
      'Forge/tooling pipeline that reconstructs NSS-like source from decoded .ncs; not present in retail binaries—anchors only through shared bytecode representation.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/NWScript.ts' },
      { inherits_from: 'src/nwscript/NWScriptInstruction.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptControlFlowGraph.ts': {
    status: 'partial',
    notes:
      'Static CFG over NWScriptInstruction stream using branch/store-state opcodes; analysis-only layer atop the same control-transfer ops the VM executes.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
      { inherits_from: 'src/nwscript/NWScriptInstruction.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptBasicBlock.ts': {
    status: 'partial',
    notes:
      'Linear instruction sequence node in the decompiler CFG; corresponds to a slice of decoded bytecode with a single entry and exit branch.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/decompiler/NWScriptControlFlowGraph.ts' },
      { inherits_from: 'src/nwscript/NWScriptInstruction.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptEdge.ts': {
    status: 'partial',
    notes: 'CFG adjacency metadata (fallthrough, jumps, loop classification); not a stock runtime type.',
    agdec_refs: [{ inherits_from: 'src/nwscript/decompiler/NWScriptBasicBlock.ts' }],
  },
  'src/nwscript/decompiler/NWScriptFunctionAnalyzer.ts': {
    status: 'partial',
    notes:
      'Recovers subroutine boundaries from JSR/RETN and store-state patterns; mirrors how compiled .ncs exposes entry points without claiming native debug-symbol parity.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/decompiler/NWScriptControlFlowGraph.ts' },
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptGlobalVariableAnalyzer.ts': {
    status: 'partial',
    notes:
      'Heuristic global-init detection from RSADD/CONST/CPDOWNSP/MOVSP sequences; pattern-based only—no structure field mapping to CVirtualMachineInternal here.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/decompiler/NWScriptControlFlowGraph.ts' },
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptLocalVariableAnalyzer.ts': {
    status: 'partial',
    notes: 'Local slot detection layered on global-init knowledge; inherits global analyzer assumptions.',
    agdec_refs: [{ inherits_from: 'src/nwscript/decompiler/NWScriptGlobalVariableAnalyzer.ts' }],
  },
  'src/nwscript/decompiler/NWScriptControlStructureBuilder.ts': {
    status: 'partial',
    notes:
      'Lifts if/while/switch-shaped regions from CFG using compare-and-branch opcode idioms; structural recovery only.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/decompiler/NWScriptControlFlowGraph.ts' },
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptVariableTracker.ts': {
    status: 'partial',
    notes:
      'Tracks BP/SP stack slot references for naming; driven by the same copy/move opcodes the VM uses for locals/globals.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/NWScriptInstruction.ts' },
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptExpression.ts': {
    status: 'partial',
    notes: 'Decompiler-side expression IR (not executed by the stock VM).',
    agdec_refs: [{ inherits_from: 'src/nwscript/decompiler/NWScriptDecompiler.ts' }],
  },
  'src/nwscript/decompiler/NWScriptExpressionBuilder.ts': {
    status: 'partial',
    notes: 'Rebuilds expression trees from opcode-driven stack effects during decompilation.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/decompiler/NWScriptExpression.ts' },
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptStackSimulator.ts': {
    status: 'partial',
    notes: 'Abstract stack walk for decompilation; approximates VM SP semantics without executing native handlers.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/decompiler/NWScriptExpression.ts' },
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptStatementBuilder.ts': {
    status: 'partial',
    notes: 'Maps CFG regions plus simulated stack state into statement-level structure for AST construction.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/decompiler/NWScriptControlFlowGraph.ts' },
      { inherits_from: 'src/nwscript/decompiler/NWScriptStackSimulator.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptANDChainDetector.ts': {
    status: 'partial',
    notes: 'Short-circuit AND pattern matcher over comparison + JZ chains; optimization for readable NSS output.',
    agdec_refs: [{ inherits_from: 'src/nwscript/decompiler/NWScriptExpressionBuilder.ts' }],
  },
  'src/nwscript/decompiler/NWScriptORChainDetector.ts': {
    status: 'partial',
    notes: 'OR-chain pattern matcher over equality + LOGORII idioms; optimization for readable NSS output.',
    agdec_refs: [{ inherits_from: 'src/nwscript/decompiler/NWScriptExpressionBuilder.ts' }],
  },
  'src/nwscript/decompiler/NWScriptAST.ts': {
    status: 'partial',
    notes: 'Structured AST node taxonomy for recovered NSS-like source; tooling-only.',
    agdec_refs: [{ inherits_from: 'src/nwscript/decompiler/NWScriptDecompiler.ts' }],
  },
  'src/nwscript/decompiler/NWScriptASTBuilder.ts': {
    status: 'partial',
    notes: 'Fuses control-structure tree and statement lists into AST programs/functions.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/decompiler/NWScriptAST.ts' },
      { inherits_from: 'src/nwscript/decompiler/NWScriptStatementBuilder.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptControlNodeToASTConverter.ts': {
    status: 'partial',
    notes: 'Bridges ControlNode hierarchy to NWScriptAST nodes before code generation.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/decompiler/NWScriptControlStructureBuilder.ts' },
      { inherits_from: 'src/nwscript/decompiler/NWScriptAST.ts' },
    ],
  },
  'src/nwscript/decompiler/NWScriptASTCodeGenerator.ts': {
    status: 'partial',
    notes: 'Pretty-prints AST to NSS text; final decompiler stage.',
    agdec_refs: [{ inherits_from: 'src/nwscript/decompiler/NWScriptAST.ts' }],
  },
  'src/nwscript/compiler/NWScriptToken.ts': {
    status: 'partial',
    notes: 'Lexer token and span types for NSS source; compiler frontend only.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScript.ts' }],
  },
  'src/nwscript/compiler/NWScriptLexer.ts': {
    status: 'partial',
    notes: 'Character scanner and keyword/operator classification for NSS input.',
    agdec_refs: [{ inherits_from: 'src/nwscript/compiler/NWScriptToken.ts' }],
  },
  'src/nwscript/compiler/ASTTypes.ts': {
    status: 'partial',
    notes: 'Concrete parse-tree node shapes emitted before semantic analysis.',
    agdec_refs: [{ inherits_from: 'src/nwscript/compiler/NWScriptToken.ts' }],
  },
  'src/nwscript/compiler/ASTSemanticTypes.ts': {
    status: 'partial',
    notes: 'Annotated AST after semantic passes (scopes, types, stack metadata).',
    agdec_refs: [{ inherits_from: 'src/nwscript/compiler/ASTTypes.ts' }],
  },
  'src/nwscript/compiler/CompilerNodeTypes.ts': {
    status: 'partial',
    notes: 'Compiler-specific overlays on semantic nodes (block ranges, IR hints).',
    agdec_refs: [{ inherits_from: 'src/nwscript/compiler/ASTSemanticTypes.ts' }],
  },
  'src/nwscript/compiler/NWScriptASTBuilder.ts': {
    status: 'partial',
    notes:
      'Incremental AST construction / recovery helpers sharing lexer token spans; pairs with parser-driven compilation.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/compiler/NWScriptLexer.ts' },
      { inherits_from: 'src/nwscript/compiler/ASTTypes.ts' },
    ],
  },
  'src/nwscript/compiler/NWScriptParser.ts': {
    status: 'partial',
    notes:
      'NSS grammar + engine action/type tables feeding semantic analysis; output must align with NWScriptDef command indices for ACTION emission.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/compiler/NWScriptASTBuilder.ts' },
      { inherits_from: 'src/nwscript/compiler/CompilerNodeTypes.ts' },
      { inherits_from: 'src/nwscript/NWScriptDef.ts' },
    ],
  },
  'src/nwscript/compiler/NWScriptASTCodeGen.ts': {
    status: 'partial',
    notes: 'Serializes concrete AST nodes back to NSS-like text (round-trip / debugging aid).',
    agdec_refs: [{ inherits_from: 'src/nwscript/compiler/ASTTypes.ts' }],
  },
  'src/nwscript/compiler/NWScriptIRBuilder.ts': {
    status: 'partial',
    notes:
      'Optional label-based IR lowering toward bytecode layout; shares opcode vocabulary with final .ncs emission.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/compiler/ASTSemanticTypes.ts' },
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
    ],
  },
  'src/nwscript/compiler/NWScriptCompiler.ts': {
    status: 'partial',
    notes:
      'NSS→NCS code generator emitting NWScript VM opcodes and ACTION IDs; output format targets CResNCS-compatible bytecode streams.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResNCS' },
      { inherits_from: 'src/nwscript/compiler/CompilerNodeTypes.ts' },
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
    ],
  },
  'src/apps/forge/helpers/ScriptCompiler.ts': {
    status: 'partial',
    notes:
      'Forge helper bridging NSS parse/compile (NWScriptParser + NWScriptCompiler) and NCS decompile (NWScript); Forge-only surface, not a stock binary subsystem.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/NWScript.ts' },
      { inherits_from: 'src/nwscript/decompiler/NWScriptDecompiler.ts' },
      { inherits_from: 'src/nwscript/compiler/NWScriptParser.ts' },
      { inherits_from: 'src/nwscript/compiler/NWScriptCompiler.ts' },
    ],
  },
  'src/nwscript/events/NWScriptEvent.ts': {
    status: 'partial',
    notes:
      'Script event payload (typed lists) deserialized from GFF Event structs; aligns with module/event storage that feeds script callbacks.',
    agdec_refs: [
      { inherits_from: 'src/resource/GFFObject.ts' },
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/nwscript/events/NWScriptEventFactory.ts': {
    status: 'partial',
    notes:
      'Constructs typed NWScriptEvent subclasses from GFFStruct Event layout (EventType, IntList, FloatList, StringList, ObjectList).',
    agdec_refs: [
      { inherits_from: 'src/nwscript/events/NWScriptEvent.ts' },
      { inherits_from: 'src/resource/GFFObject.ts' },
    ],
  },
  'src/nwscript/events/EventActivateItem.ts': {
    status: 'partial',
    notes: 'EventType.ActivateItem parameter layout; inherits generic event list contract.',
    agdec_refs: [{ inherits_from: 'src/nwscript/events/NWScriptEvent.ts' }],
  },
  'src/nwscript/events/EventConversation.ts': {
    status: 'partial',
    notes: 'EventType.Conversation parameter layout; inherits generic event list contract.',
    agdec_refs: [{ inherits_from: 'src/nwscript/events/NWScriptEvent.ts' }],
  },
  'src/nwscript/events/EventSpellCastAt.ts': {
    status: 'partial',
    notes: 'EventType.SpellCastAt parameter layout; inherits generic event list contract.',
    agdec_refs: [{ inherits_from: 'src/nwscript/events/NWScriptEvent.ts' }],
  },
  'src/nwscript/events/EventUserDefined.ts': {
    status: 'partial',
    notes: 'EventType.UserDefined parameter layout; inherits generic event list contract.',
    agdec_refs: [{ inherits_from: 'src/nwscript/events/NWScriptEvent.ts' }],
  },
  'src/nwscript/events/index.ts': {
    status: 'na',
    notes: 'Barrel re-exports only; no standalone binary correlate.',
    agdec_refs: [],
  },
  'src/interface/nwscript/INWScriptDefAction.ts': {
    status: 'partial',
    notes:
      'Contract for NWScriptDef command table entries (name, types, handler); parallels native engine command metadata consumed at ACTION dispatch.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDef.ts' }],
  },
  'src/interface/nwscript/INWScriptStoreState.ts': {
    status: 'partial',
    notes:
      'Serialized continuation frame for STORE_STATE-style deferral: stack snapshots plus NWScriptInstruction/NWScriptInstance linkage.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/NWScriptInstance.ts' },
      { inherits_from: 'src/nwscript/NWScriptInstruction.ts' },
      { inherits_from: 'src/nwscript/NWScriptOPCodes.ts' },
    ],
  },
  'src/interface/nwscript/index.ts': {
    status: 'na',
    notes: 'Barrel re-exports only; no standalone binary correlate.',
    agdec_refs: [],
  },
  'src/enums/nwscript/NWScriptByteCode.ts': {
    status: 'partial',
    notes:
      'Numeric opcode ids duplicated from NWScriptOPCodes for enum-style imports; must stay in sync with VM bytecode stream.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptOPCodes.ts' }],
  },
  'src/enums/nwscript/NWScriptDataType.ts': {
    status: 'partial',
    notes:
      'NWScript stack/engine type ids (void/int/float/string/object/engine structs); align with CONST opcode trailing type bytes and ACTION signatures.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptOPCodes.ts' }, { inherits_from: 'src/nwscript/NWScript.ts' }],
  },
  'src/enums/nwscript/NWScriptTypes.ts': {
    status: 'partial',
    notes:
      'Composite unary/binary NWScript type codes used by compiler/runtime helpers (pairs with NWCompileDataTypes patterns).',
    agdec_refs: [{ inherits_from: 'src/enums/nwscript/NWScriptDataType.ts' }],
  },
  'src/enums/nwscript/NWScriptDefTypes.ts': {
    status: 'partial',
    notes: 'Subset of NWScriptDataType-style ids referenced by def/metadata helpers.',
    agdec_refs: [{ inherits_from: 'src/enums/nwscript/NWScriptDataType.ts' }],
  },
  'src/enums/nwscript/NWScriptEventType.ts': {
    status: 'partial',
    notes:
      'EventType discriminator values for GFF Event structs and NWScriptEvent subclasses; must match saved module event payloads.',
    agdec_refs: [{ inherits_from: 'src/nwscript/events/NWScriptEvent.ts' }],
  },
  'src/enums/nwscript/NWModuleObjectType.ts': {
    status: 'partial',
    notes:
      'Script-visible object-type bitmasks (GetObjectType family). Runtime correlation: every CSWSObject/CSWCObject embeds CGameObject at game_object with GAME_OBJECT_TYPES at object_type (+0x8 on CGameObject); numeric parity still validated via NWScriptDef usage.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/NWScriptDefK1.ts' },
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CGameObject',
        layout_note: 'object_type @ +0x8 → GAME_OBJECT_TYPES',
      },
    ],
  },
  'src/enums/nwscript/CreatureClassType.ts': {
    status: 'partial',
    notes: 'KotOR class indices for NWScript/stat paths; handler parity via NWScriptDef tables.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/nwscript/CreatureType.ts': {
    status: 'partial',
    notes: 'Creature-type query discriminator constants for script APIs; aligned with NWScriptDef usage.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/nwscript/Perception.ts': {
    status: 'partial',
    notes: 'Perception state ints passed through NWScript commands; spot-checked via script behavior only.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/nwscript/ReputationType.ts': {
    status: 'partial',
    notes: 'Reputation bucket ints for faction scripting; aligned with NWScriptDef handlers.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/nwscript/SkillType.ts': {
    status: 'partial',
    notes: 'Skill index constants for KotOR skill APIs in NWScriptDef.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/nwscript/StandardFaction.ts': {
    status: 'partial',
    notes: 'Standard faction ids for reputation/script hooks; KotOR-specific extensions included.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/nwscript/SubSkillType.ts': {
    status: 'partial',
    notes: 'Trap-related sub-skill ids referenced by NWScript actions.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/nwscript/index.ts': {
    status: 'na',
    notes: 'Barrel re-exports only; no standalone binary correlate.',
    agdec_refs: [],
  },
  'src/enums/actions/ActionType.ts': {
    status: 'partial',
    notes:
      'Creature current-action queue type IDs (move, attack, cast, etc.). K1 agdec structure survey: CSWSObject.action_nodes @ 0xFC is CExoLinkedList<CSWSObjectActionNode>; per-opcode numeric parity still validated via gameplay/NWScriptDef, not per-field here.',
    agdec_refs: [
      { inherits_from: 'src/nwscript/NWScriptDefK1.ts' },
      {
        kind: 'class',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CSWSObject',
        layout_note: 'action_nodes @ 0xFC → CExoLinkedList<CSWSObjectActionNode>',
      },
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CGameObject',
        layout_note: 'Base object header; GAME_OBJECT_TYPES at +0x8',
      },
    ],
  },
  'src/enums/actions/ActionParameterType.ts': {
    status: 'partial',
    notes: 'Serialized action parameter discriminant values for action payloads.',
    agdec_refs: [{ inherits_from: 'src/enums/actions/ActionType.ts' }],
  },
  'src/enums/actions/ActionStatus.ts': {
    status: 'partial',
    notes: 'High-level action execution state used by the TS action queue layer.',
    agdec_refs: [{ inherits_from: 'src/enums/actions/ActionType.ts' }],
  },
  'src/enums/actions/index.ts': {
    status: 'na',
    notes: 'Barrel re-exports only; no standalone binary correlate.',
    agdec_refs: [],
  },
  'src/enums/engine/GameEngineType.ts': {
    status: 'partial',
    notes:
      'Host-selected title variant (KotOR vs TSL); drives which script tables and assets apply—not a single exported exe symbol.',
    agdec_refs: [],
  },
  'src/enums/engine/GameEngineEnv.ts': {
    status: 'na',
    notes: 'KotOR.js host embedding discriminant (Node vs web); not an Odyssey binary artifact.',
    agdec_refs: [],
  },
  'src/enums/engine/EngineMode.ts': {
    status: 'partial',
    notes: 'Coarse engine UI/game mode state mirrored for TS runtime.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/EngineState.ts': {
    status: 'partial',
    notes: 'Run/pause/exit lifecycle flag mirrored for TS runtime.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/AutoPauseState.ts': {
    status: 'partial',
    notes: 'Auto-pause trigger categories mirrored from classic client behavior.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/FadeOverlayState.ts': {
    status: 'partial',
    notes: 'Screen fade overlay progression mirrored for TS rendering.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/EngineDebugType.ts': {
    status: 'partial',
    notes: 'Debug classification for KotOR.js diagnostics.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/FeedbackOption.ts': {
    status: 'partial',
    notes: 'Feedback/UI option ids mirrored for TS HUD messaging.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/FeedbackMessageColor.ts': {
    status: 'partial',
    notes: 'Feedback message color buckets mirrored for TS HUD styling.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/TutorialMessage.ts': {
    status: 'partial',
    notes: 'Tutorial message discriminant mirrored for TS tutorial prompts.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/UIIconTimerType.ts': {
    status: 'partial',
    notes: 'UI icon timer classification mirrored for TS party HUD timers.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/MapNorthAxis.ts': {
    status: 'partial',
    notes: 'Minimap north-axis convention mirrored for TS map rendering.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/MapMode.ts': {
    status: 'partial',
    notes: 'Minimap interaction mode mirrored for TS map UI.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/MiniGameType.ts': {
    status: 'partial',
    notes: 'Minigame discriminant mirrored for TS minigame routing.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/TextSprite3DType.ts': {
    status: 'partial',
    notes: '3D floating text classification mirrored for TS world labels.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/LightPriority.ts': {
    status: 'partial',
    notes: 'Dynamic light priority bucket mirrored for TS lighting.',
    agdec_refs: [{ inherits_from: 'src/enums/engine/GameEngineType.ts' }],
  },
  'src/enums/engine/TalentObjectType.ts': {
    status: 'partial',
    notes: 'Talent kind bitmask values consumed by spell/feat/skill script APIs.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/engine/PerceptionMask.ts': {
    status: 'partial',
    notes: 'Perception bitmask inputs for AI/script-visible perception checks.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/engine/PerceptionType.ts': {
    status: 'partial',
    notes: 'Perception outcome ordinal aligned with lexicon-era NWScript semantics.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/engine/ExperienceType.ts': {
    status: 'partial',
    notes: 'XP category discriminator passed through script-facing XP helpers.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/engine/ReputationConstant.ts': {
    status: 'partial',
    notes: 'Reputation score band constants used by faction/reputation script APIs.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/engine/TalkVolume.ts': {
    status: 'partial',
    notes: 'Conversation volume ordinal for dialog/script speech helpers.',
    agdec_refs: [{ inherits_from: 'src/nwscript/NWScriptDefK1.ts' }],
  },
  'src/enums/engine/index.ts': {
    status: 'na',
    notes: 'Barrel re-exports only; no standalone binary correlate.',
    agdec_refs: [],
  },
  'src/enums/module/ModuleObjectType.ts': {
    status: 'partial',
    notes:
      'TS-side bitmask for module object kinds. Native game objects expose GAME_OBJECT_TYPES via CGameObject.object_type (single byte); encoding differs from this shifted bitmask—compare when bridging TS ModuleObject ↔ CSWSObject.',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CGameObject',
        layout_note: 'object_type: GAME_OBJECT_TYPES',
      },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' },
    ],
  },
  'src/enums/module/ModuleObjectScript.ts': {
    status: 'partial',
    notes:
      'Reserved script hook resref suffix strings for module/creature/placeable events; resolved through script resource loading same family as CExoResMan::GetResObject.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
      { inherits_from: 'src/nwscript/NWScript.ts' },
    ],
  },
  'src/enums/module/ModuleObjectConstant.ts': {
    status: 'partial',
    notes:
      'Engine object-id sentinels (invalid / player). Align conceptually with CGameObject id ulong field semantics—exact bit patterns not re-derived from agdec in this pass.',
    agdec_refs: [
      {
        kind: 'data_type',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CGameObject',
        layout_note: 'id @ +0x4',
      },
    ],
  },
  'src/enums/module/ModuleTriggerType.ts': {
    status: 'partial',
    notes:
      'Trigger classification for module triggers; CSWSObject-derived trigger server types consume similar discriminants.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/ModulePlaceableState.ts': {
    status: 'partial',
    notes: 'Placeable usable/open states mirrored for TS simulation.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/ModulePlaceableObjectSound.ts': {
    status: 'partial',
    notes: 'Placeable ambient sound categories.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/ModulePlaceableAnimState.ts': {
    status: 'partial',
    notes: 'Placeable animation state ids; parallels animation fields on server objects.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/ModuleItemProperty.ts': {
    status: 'partial',
    notes: 'Item property opcode ids (2DA-backed in stock data); not individually traced to native tables here.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/enums/module/ModuleItemCostTable.ts': {
    status: 'partial',
    notes: 'Item cost table row discriminant for KotOR item pricing helpers.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/enums/module/ModuleDoorOpenState.ts': {
    status: 'partial',
    notes: 'Door open/closed state mirrored against door server object behavior.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/ModuleDoorInteractSide.ts': {
    status: 'partial',
    notes: 'Door interaction side constants.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/ModuleDoorAnimation.ts': {
    status: 'partial',
    notes: 'Door animation identifiers.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/ModuleDoorAnimState.ts': {
    status: 'partial',
    notes: 'Door animation playback states.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/ModuleCreatureArmorSlot.ts': {
    status: 'partial',
    notes: 'Creature equip slot indices for inventory/armor UI and combat.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/ModuleCreatureAnimState.ts': {
    status: 'partial',
    notes: 'Creature animation state ids; aligns with animation integer on CSWSObject layout.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/ModuleCreatureAmbientState.ts': {
    status: 'partial',
    notes: 'Ambient animation behavior buckets for creatures.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/AreaTerrainFlag.ts': {
    status: 'partial',
    notes: 'Walkmesh / terrain capability flags for areas.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSArea' }],
  },
  'src/enums/module/AreaOfEffectShape.ts': {
    status: 'partial',
    notes: 'AoE shape discriminants for persistent area effects.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSObject' }],
  },
  'src/enums/module/AreaMapDirection.ts': {
    status: 'partial',
    notes: 'Automap orientation helpers.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWCArea' }],
  },
  'src/enums/module/WeatherCondition.ts': {
    status: 'partial',
    notes: 'Weather enum mirrored for area atmosphere.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSArea' }],
  },
  'src/enums/module/index.ts': {
    status: 'na',
    notes: 'Barrel re-exports only; no standalone binary correlate.',
    agdec_refs: [],
  },
  'src/enums/minigames/PazaakCards.ts': {
    status: 'partial',
    notes:
      'Deck/card index constants for the card minigame; native CSWPazaak carries CPazaakCard[40] at cards, and CPazaakPlayer nests hand/board arrays sized for script slot enums.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWPazaak' }],
  },
  'src/enums/minigames/PazaakCardGUITextures.ts': {
    status: 'partial',
    notes: 'GUI control tags for card face/back textures on CSWGuiPazaakCard-derived layout.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWGuiPazaakCard' }],
  },
  'src/enums/minigames/PazaakHandSlots.ts': {
    status: 'partial',
    notes: 'Hand column indices; CPazaakPlayer.hand_cards is CPazaakCard[4].',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWPazaak' }],
  },
  'src/enums/minigames/PazaakTableSlots.ts': {
    status: 'partial',
    notes: 'Board grid indices; CPazaakPlayer.board_cards is CPazaakCard[9].',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWPazaak' }],
  },
  'src/enums/minigames/PazaakSideDeckSlots.ts': {
    status: 'partial',
    notes: 'Side-deck columns; CSWGuiPazaakStart lays out sidedeck CPazaakCard[10] alongside sidedeck_gui.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWGuiPazaakStart' }],
  },
  'src/enums/minigames/PazaakTurnMode.ts': {
    status: 'partial',
    notes: 'Player vs opponent turn ownership; CSWPazaak separates CPazaakPlayer player vs enemy blobs.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWPazaak' }],
  },
  'src/enums/minigames/PazaakTurnState.ts': {
    status: 'partial',
    notes: 'High-level turn progression states for TS simulation; native CSWPazaak drives authoritative flow.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWPazaak' }],
  },
  'src/enums/minigames/index.ts': {
    status: 'na',
    notes: 'Barrel re-exports only; no standalone binary correlate.',
    agdec_refs: [],
  },
  'src/enums/gui/Anchor.ts': {
    status: 'partial',
    notes: 'GUI anchor point ints for layout; consumed when resolving control extents alongside CSWGuiExtent.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWGuiExtent' }],
  },
  'src/enums/gui/GUIControlAlignment.ts': {
    status: 'partial',
    notes: 'Text/control alignment buckets for GUI controls; parallels alignment fields on compiled GUI widgets.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWGuiControl' }],
  },
  'src/enums/gui/GUIControlType.ts': {
    status: 'partial',
    notes:
      'Numeric control-type ids matching Aurora GUI lists (panel/label/button/etc.). Native hierarchy: CSWGuiPanel owns CResGFF plus CSWGuiControl trees rooted at GuiControlMethods vtables.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWGuiControl' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWGuiPanel' },
    ],
  },
  'src/enums/gui/GUIControlTypeMask.ts': {
    status: 'partial',
    notes: 'Bitmask companion to GUIControlType for filtering.',
    agdec_refs: [{ inherits_from: 'src/enums/gui/GUIControlType.ts' }],
  },
  'src/enums/gui/GUISliderDirection.ts': {
    status: 'partial',
    notes: 'Slider orientation for CSWGuiScrollBar-backed widgets.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWGuiScrollBar' }],
  },
  'src/enums/gui/MenuContainerMode.ts': {
    status: 'partial',
    notes: 'Inventory/container UI mode discriminant for KotOR.js menus; anchored to generic CSWGui panel shells.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWGuiPanel' }],
  },
  'src/enums/gui/MenuSaveLoadMode.ts': {
    status: 'partial',
    notes: 'Save/load screen mode discriminant; tied to CSWGui panel implementations hosting slot lists.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWGuiPanel' }],
  },
  'src/enums/gui/index.ts': {
    status: 'na',
    notes: 'Barrel re-exports only; no standalone binary correlate.',
    agdec_refs: [],
  },
  'src/enums/odyssey/OdysseyModelAnimationManagerState.ts': {
    status: 'partial',
    notes:
      'Runtime animation manager states for the TS model viewer; MDX-side animation chunks drive authoritative playback.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDX' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CAurObject' },
    ],
  },
  'src/enums/odyssey/OdysseyModelClass.ts': {
    status: 'partial',
    notes: 'MDL node/controller class ids as interpreted from binary MDL headers.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDL' }],
  },
  'src/enums/odyssey/OdysseyModelControllerType.ts': {
    status: 'partial',
    notes: 'Controller keyframe/light emitter controller discriminants inside compiled model data.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDL' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDX' },
    ],
  },
  'src/enums/odyssey/OdysseyModelEmitterBlendMode.ts': {
    status: 'partial',
    notes: 'Emitter blend mode flags mirrored from MDX emitter records.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDX' }],
  },
  'src/enums/odyssey/OdysseyModelEmitterFlag.ts': {
    status: 'partial',
    notes: 'Emitter capability bitmask mirrored from MDX emitter records.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDX' }],
  },
  'src/enums/odyssey/OdysseyModelEmitterRenderMode.ts': {
    status: 'partial',
    notes: 'Emitter render mode enumerants for ribbon/mesh particles.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDX' }],
  },
  'src/enums/odyssey/OdysseyModelEmitterSpawnType.ts': {
    status: 'partial',
    notes: 'Emitter spawn style discriminant inside MDX geometry.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDX' }],
  },
  'src/enums/odyssey/OdysseyModelEmitterUpdateMode.ts': {
    status: 'partial',
    notes: 'Emitter update/tick mode bits from MDX emitter sections.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDX' }],
  },
  'src/enums/odyssey/OdysseyModelEngine.ts': {
    status: 'partial',
    notes: 'Engine-side model format revision hints for KotOR.js loaders.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDL' }],
  },
  'src/enums/odyssey/OdysseyModelFlag.ts': {
    status: 'partial',
    notes: 'MDL root/controller flags as read from binary streams.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDL' }],
  },
  'src/enums/odyssey/OdysseyModelMDXFlag.ts': {
    status: 'partial',
    notes: 'MDX mesh/part flags interpreted during geometry decode.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDX' }],
  },
  'src/enums/odyssey/OdysseyModelNodeType.ts': {
    status: 'partial',
    notes: 'Node kind discriminants for MDL hierarchies (mesh/light/emitter references).',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDL' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResMDX' },
    ],
  },
  'src/enums/odyssey/OdysseyWalkMeshType.ts': {
    status: 'partial',
    notes:
      'Walkmesh collision representation hints; runtime loads binary walkmesh via CSWCollisionMesh with CResBWM backing and WalkmeshFace indices.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWCollisionMesh' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CResBWM' },
    ],
  },
  'src/enums/odyssey/index.ts': {
    status: 'na',
    notes: 'Barrel re-exports only; no standalone binary correlate.',
    agdec_refs: [],
  },
  'src/engine/minigames/PazaakDeck.ts': {
    status: 'partial',
    notes:
      'Authoring labels → CPazaakCard index mapping for deck rows; aligns conceptually with native sidedeck width (10) though table-driven parity is not proven here.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWPazaak' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWGuiPazaakStart' },
    ],
  },
  'src/enums/combat/CombatActionType.ts': {
    status: 'partial',
    notes:
      'Combat-round action discriminant. K1 agdec: CSWSCombatRoundAction (~136-byte analyzed struct) models queued combat actions linked from CSWSCombatRound.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSCombatRoundAction' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSCombatRound' },
      { inherits_from: 'src/enums/actions/ActionType.ts' },
    ],
  },
  'src/enums/combat/AttackResult.ts': {
    status: 'partial',
    notes:
      'Attack outcome integers used after combat rolls; ties to combat round resolution (native attack result paths not enumerated per-value here).',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CCombatInformation' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSCombatRoundAction' },
    ],
  },
  'src/enums/combat/DamageType.ts': {
    status: 'partial',
    notes:
      'Damage element buckets. K1 agdec cross-ref: CSWSCombatRoundAction exposes damage-related fields; CCombatInformation carries damage_die metadata—exact TS enum↔native mapping still partial.',
    agdec_refs: [
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSCombatRoundAction' },
      { kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CCombatInformation' },
    ],
  },
  'src/enums/combat/CombatFeatType.ts': {
    status: 'partial',
    notes: 'Feat ids referenced during combat special attacks; data-driven via 2DA in stock.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/enums/combat/WeaponType.ts': {
    status: 'partial',
    notes: 'Weapon category constants for attack animations and proficiencies.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CCombatInformation' }],
  },
  'src/enums/combat/WeaponWield.ts': {
    status: 'partial',
    notes: 'Weapon wield stance constants.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CCombatInformation' }],
  },
  'src/enums/combat/WeaponSize.ts': {
    status: 'partial',
    notes: 'Weapon size classification for wield checks.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CCombatInformation' }],
  },
  'src/enums/combat/BaseItemType.ts': {
    status: 'partial',
    notes: 'Baseitems.2da row indices for items.',
    agdec_refs: [
      {
        kind: 'function',
        program_path: '/K1/k1_win_gog_swkotor.exe',
        name: 'CExoResMan::GetResObject',
        address: '0x004074d0',
      },
    ],
  },
  'src/enums/combat/DiceType.ts': {
    status: 'partial',
    notes: 'Dice notation enums for damage/healing rolls.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CCombatInformation' }],
  },
  'src/enums/combat/ProjectilePath.ts': {
    status: 'partial',
    notes: 'Projectile trajectory style constants.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSCombatRoundAction' }],
  },
  'src/enums/combat/RoundTypes.ts': {
    status: 'partial',
    notes: 'Combat round phase/type helpers.',
    agdec_refs: [{ kind: 'class', program_path: '/K1/k1_win_gog_swkotor.exe', name: 'CSWSCombatRound' }],
  },
  'src/enums/combat/index.ts': {
    status: 'na',
    notes: 'Barrel re-exports only; no standalone binary correlate.',
    agdec_refs: [],
  },
};

function walkTsFiles(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue;
      walkTsFiles(p, acc);
    } else if (/\.tsx?$/.test(ent.name)) {
      acc.push(path.relative(repoRoot, p).split(path.sep).join('/'));
    }
  }
  return acc;
}

function main() {
  const files = walkTsFiles(srcRoot).sort();
  const filesMap = {};
  for (const f of files) {
    filesMap[f] = MANUAL_SEEDS[f] ?? { status: 'pending', agdec_refs: [], notes: '' };
  }

  const byStatus = {};
  for (const v of Object.values(filesMap)) {
    byStatus[v.status] = (byStatus[v.status] ?? 0) + 1;
  }

  const doc = {
    meta: {
      description:
        'Maps each file under src/ to user-agdec-http anchors (functions, types, addresses) and review status. Regenerate with: node scripts/build-src-agdec-alignment-map.mjs',
      default_program: '/K1/k1_win_gog_swkotor.exe',
      generated_at: new Date().toISOString(),
      src_file_count: files.length,
      status_legend: {
        pending: 'No agdec-http pass yet for this file.',
        partial: 'Some hotspots verified; file not fully walked.',
        aligned: 'Reviewer considers binary-facing logic matched for current scope.',
        na: 'No expected native binary correlate (barrel file, pure UI, etc.).',
        blocked: 'Needed MCP/decompile unavailable; retry later.',
      },
      counts_by_status: byStatus,
      remaining_pending: byStatus.pending ?? 0,
    },
    files: filesMap,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2), 'utf8');
  console.error(`Wrote ${files.length} entries -> ${path.relative(repoRoot, outPath)}`);
}

main();
