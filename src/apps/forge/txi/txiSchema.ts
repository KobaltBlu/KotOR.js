/**
 * Odyssey TXI directive schema for Forge highlighting, hover, and autocomplete.
 *
 * @file txiSchema.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type TxiValueKind =
  | "none"
  | "bool"
  | "int"
  | "float"
  | "vector"
  | "resref"
  | "enum"
  | "count"
  | "floats";

export type TxiCompletionKind = "keyword" | "enum" | "snippet";

export interface TxiEnumValue {
  name: string;
  documentation: string;
}

export interface TxiDirective {
  name: string;
  valueKind: TxiValueKind;
  values?: TxiEnumValue[];
  insertSnippet?: string;
  detail: string;
  documentation: string;
}

export interface TxiCompletion {
  label: string;
  insertText: string;
  insertAsSnippet: boolean;
  documentation: string;
  detail: string;
  kind: TxiCompletionKind;
  sortText: string;
}

export interface TxiIssue {
  line: number;
  message: string;
}

const BOOL_DOC = "0 or 1.";

function boolDirective(name: string, detail: string, documentation: string): TxiDirective {
  return {
    name,
    valueKind: "bool",
    insertSnippet: `${name} \${1|1,0|}`,
    detail,
    documentation: `${documentation} ${BOOL_DOC}`,
  };
}

function intDirective(name: string, detail: string, documentation: string, sample = "1"): TxiDirective {
  return {
    name,
    valueKind: "int",
    insertSnippet: `${name} \${1:${sample}}`,
    detail,
    documentation,
  };
}

function floatDirective(name: string, detail: string, documentation: string, sample = "1.0"): TxiDirective {
  return {
    name,
    valueKind: "float",
    insertSnippet: `${name} \${1:${sample}}`,
    detail,
    documentation,
  };
}

function resrefDirective(name: string, detail: string, documentation: string): TxiDirective {
  return {
    name,
    valueKind: "resref",
    insertSnippet: `${name} \${1:texture}`,
    detail,
    documentation,
  };
}

const PROCEDURE_VALUES: TxiEnumValue[] = [
  { name: "cycle", documentation: "Flipbook animation using numx / numy / fps." },
  { name: "water", documentation: "Water distortion procedure." },
  { name: "random", documentation: "Random noise procedure." },
  { name: "ringtexdistort", documentation: "Ring distortion procedure." },
  { name: "arturo", documentation: "Arturo procedural texture controller." },
  { name: "perlin", documentation: "Perlin noise procedure." },
  { name: "wave", documentation: "Wave procedure." },
  { name: "life", documentation: "Life (cellular) procedure." },
];

const BLENDING_VALUES: TxiEnumValue[] = [
  { name: "additive", documentation: "Add the texture over the destination (glow, energy, water highlights)." },
  { name: "punchthrough", documentation: "Binary alpha test (cutout). No partial transparency." },
];

export const TXI_DIRECTIVES: TxiDirective[] = [
  {
    name: "proceduretype",
    valueKind: "enum",
    values: PROCEDURE_VALUES,
    insertSnippet: `proceduretype \${1|cycle,water,random,ringtexdistort,arturo,perlin,wave,life|}`,
    detail: "Procedure",
    documentation: "Attaches a procedural texture controller. cycle is the grid flipbook used by most animated maps.",
  },
  {
    name: "blending",
    valueKind: "enum",
    values: BLENDING_VALUES,
    insertSnippet: `blending \${1|additive,punchthrough|}`,
    detail: "Material",
    documentation: "Material blend mode for this texture.",
  },
  resrefDirective("bumpmaptexture", "Material", "Bump or normal map resref sampled by this material."),
  resrefDirective("bumpyshinytexture", "Material", "Shiny/env bump map resref (same role as envmaptexture)."),
  resrefDirective("envmaptexture", "Material", "Environment cube-map resref (for example CM_Baremetal)."),
  floatDirective("wateralpha", "Material", "Water mix factor when combined with an env map.", "0.4"),
  boolDirective("decal", "Material", "Draw as a double-sided decal (no depth write)."),
  intDirective("renderbmlmtype", "Material", "Bumped lightmap render type."),

  boolDirective("mipmap", "Texture", "Generate mipmaps."),
  boolDirective("filter", "Texture", "Enable texture filtering."),
  boolDirective("cube", "Texture", "Treat the image as a cube map (six faces)."),
  boolDirective("maptexelstopixels", "Texture", "Map texels to pixels (UI/font texel snap)."),
  boolDirective("temporary", "Texture", "Mark the texture as temporary / not cached long-term."),
  boolDirective("useglobalalpha", "Texture", "Modulate with the current global alpha."),
  boolDirective("isenvironmentmapped", "Texture", "Texture itself is used as an environment map."),
  intDirective("isbumpmap", "Texture", "Mark this image as a bump map (0 or 1)."),
  boolDirective("isdiffusebumpmap", "Texture", "Use this bump map on diffuse lighting."),
  boolDirective("isspecularbumpmap", "Texture", "Use this bump map on specular lighting."),
  boolDirective("islightmap", "Texture", "Treat this image as a lightmap."),
  boolDirective("compresstexture", "Texture", "Store compressed when packing TPC."),
  intDirective("defaultwidth", "Texture", "Default width hint for procedural generation.", "256"),
  intDirective("defaultheight", "Texture", "Default height hint for procedural generation.", "256"),
  intDirective("downsamplemin", "Texture", "Minimum downsample level."),
  intDirective("downsamplemax", "Texture", "Maximum downsample level."),
  intDirective("filerange", "Texture", "Number of sequential file variants (procedure sequences)."),
  intDirective("clamp", "Texture", "Clamp UV addressing flags."),
  intDirective("numx", "Animation", "Flipbook columns (used with proceduretype cycle).", "4"),
  intDirective("numy", "Animation", "Flipbook rows (used with proceduretype cycle).", "4"),
  intDirective("fps", "Animation", "Flipbook frames per second.", "8"),
  floatDirective("gamma", "Texture", "Gamma correction factor."),
  floatDirective("alphamean", "Texture", "Mean alpha used by some blend heuristics."),
  floatDirective("bumpmapscaling", "Bump", "Bump height scale."),
  floatDirective("bumpintensity", "Bump", "Overall bump intensity."),
  floatDirective("diffusebumpintensity", "Bump", "Diffuse bump intensity."),
  floatDirective("specularbumpintensity", "Bump", "Specular bump intensity."),
  floatDirective("envmapalpha", "Material", "Environment-map alpha."),
  {
    name: "specularcolor",
    valueKind: "vector",
    insertSnippet: "specularcolor ${1:1} ${2:1} ${3:1}",
    detail: "Material",
    documentation: "Specular RGB color (three floats).",
  },

  {
    name: "channelscale",
    valueKind: "floats",
    insertSnippet: "channelscale ${1:1} ${2:1} ${3:1} ${4:1}",
    detail: "Controller",
    documentation: "RGBA channel scale list for the active procedure controller.",
  },
  {
    name: "channeltranslate",
    valueKind: "floats",
    insertSnippet: "channeltranslate ${1:0} ${2:0} ${3:0} ${4:0}",
    detail: "Controller",
    documentation: "RGBA channel translate list for the active procedure controller.",
  },
  floatDirective("channelscale0", "Controller", "Red channel scale override."),
  floatDirective("channelscale1", "Controller", "Green channel scale override."),
  floatDirective("channelscale2", "Controller", "Blue channel scale override."),
  floatDirective("channelscale3", "Controller", "Alpha channel scale override."),
  floatDirective("channeltranslate0", "Controller", "Red channel translate override.", "0.0"),
  floatDirective("channeltranslate1", "Controller", "Green channel translate override.", "0.0"),
  floatDirective("channeltranslate2", "Controller", "Blue channel translate override.", "0.0"),
  floatDirective("channeltranslate3", "Controller", "Alpha channel translate override.", "0.0"),
  intDirective("distort", "Controller", "Enable distortion on the procedure controller."),
  intDirective("distortangle", "Controller", "Distortion angle index."),
  floatDirective("distortionamplitude", "Controller", "Distortion amplitude."),
  floatDirective("speed", "Controller", "Procedure animation speed."),

  intDirective("numchars", "Font", "Glyph count. Follow with matching coord lists.", "95"),
  floatDirective("fontheight", "Font", "Font cell height (normalized)."),
  floatDirective("baselineheight", "Font", "Baseline as a fraction of height."),
  floatDirective("texturewidth", "Font", "Font texture width used to place glyphs."),
  floatDirective("spacingr", "Font", "Right-side glyph spacing."),
  floatDirective("spacingb", "Font", "Bottom glyph spacing."),
  floatDirective("caretindent", "Font", "Caret indent used by GUI text."),
  {
    name: "upperleftcoords",
    valueKind: "count",
    insertSnippet: "upperleftcoords ${1:95}",
    detail: "Font",
    documentation: "Count of upper-left UV corners, followed by that many `x y z` lines.",
  },
  {
    name: "lowerrightcoords",
    valueKind: "count",
    insertSnippet: "lowerrightcoords ${1:95}",
    detail: "Font",
    documentation: "Count of lower-right UV corners, followed by that many `x y z` lines.",
  },
];

const BY_NAME = new Map<string, TxiDirective>();
for (let i = 0; i < TXI_DIRECTIVES.length; i++) {
  BY_NAME.set(TXI_DIRECTIVES[i].name, TXI_DIRECTIVES[i]);
}

export const TXI_DIRECTIVE_NAMES: string[] = TXI_DIRECTIVES.map((item) => item.name);

export const TXI_DIRECTIVE_SET: Set<string> = new Set(TXI_DIRECTIVE_NAMES);

export const TXI_ENUM_VALUES: string[] = Array.from(
  new Set(
    TXI_DIRECTIVES.flatMap((item) => (item.values || []).map((value) => value.name)),
  ),
);

export function getTxiDirective(name: string): TxiDirective | undefined {
  return BY_NAME.get(String(name || "").trim().toLowerCase());
}

export function monarchDirectiveRegex(): RegExp {
  const keys = TXI_DIRECTIVE_NAMES.slice()
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^\\s*(${keys.join("|")})\\b`, "i");
}

export function monarchEnumRegex(): RegExp {
  const names = TXI_ENUM_VALUES.slice()
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${names.join("|")})\\b`, "i");
}

function isCommentOrEmpty(line: string): boolean {
  const trimmed = line.trim();
  return !trimmed || trimmed.startsWith("//") || trimmed.startsWith("#");
}

function isCoordinateLine(line: string): boolean {
  return /^\s*[+-]?\d+(?:\.\d+)?\s+[+-]?\d+(?:\.\d+)?\s+[+-]?\d+(?:\.\d+)?\s*(?:\/\/.*|#.*)?$/.test(line);
}

export function splitTxiKeyAndPrefix(lineUntilCursor: string): { key: string; hasValueSlot: boolean; valuePrefix: string; keyPrefix: string } {
  const match = /^(\s*)([A-Za-z_][\w]*)?(.*)$/.exec(lineUntilCursor);
  const leading = match?.[1] || "";
  const token = match?.[2] || "";
  const rest = match?.[3] || "";
  const hasValueSlot = /^\s+/.test(rest) || (lineUntilCursor.endsWith(" ") && !!token);
  if (!hasValueSlot) {
    return { key: "", hasValueSlot: false, valuePrefix: "", keyPrefix: token };
  }
  const valuePrefix = rest.trim();
  return { key: token.toLowerCase(), hasValueSlot: true, valuePrefix, keyPrefix: leading + token };
}

function matchesPrefix(name: string, prefix: string): boolean {
  if (!prefix) return true;
  return name.toLowerCase().startsWith(prefix.toLowerCase());
}

const SNIPPETS: TxiCompletion[] = [
  {
    label: "cycle flipbook",
    insertText: "proceduretype cycle\nnumx ${1:4}\nnumy ${2:4}\nfps ${3:8}",
    insertAsSnippet: true,
    documentation: "Animated texture grid used by lightsabers, water overlays, and UI pulses.",
    detail: "Snippet",
    kind: "snippet",
    sortText: "z_cycle",
  },
  {
    label: "additive glow",
    insertText: "blending additive",
    insertAsSnippet: false,
    documentation: "Glow / energy additive blend.",
    detail: "Snippet",
    kind: "snippet",
    sortText: "z_additive",
  },
  {
    label: "env map",
    insertText: "envmaptexture ${1:CM_Baremetal}",
    insertAsSnippet: true,
    documentation: "Attach a cube-map reflection.",
    detail: "Snippet",
    kind: "snippet",
    sortText: "z_env",
  },
];

export function completeTxi(lineUntilCursor: string): TxiCompletion[] {
  const trimmed = lineUntilCursor.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
    return [];
  }

  const parsed = splitTxiKeyAndPrefix(lineUntilCursor);
  if (parsed.hasValueSlot) {
    const directive = getTxiDirective(parsed.key);
    if (!directive) return [];
    if (directive.values) {
      const items: TxiCompletion[] = [];
      for (let i = 0; i < directive.values.length; i++) {
        const value = directive.values[i];
        if (!matchesPrefix(value.name, parsed.valuePrefix)) continue;
        items.push({
          label: value.name,
          insertText: value.name,
          insertAsSnippet: false,
          documentation: value.documentation,
          detail: directive.name,
          kind: "enum",
          sortText: `1_${value.name}`,
        });
      }
      return items;
    }
    if (directive.valueKind === "bool") {
      return [
        { label: "1", insertText: "1", insertAsSnippet: false, documentation: "On / true.", detail: directive.name, kind: "enum", sortText: "1_1" },
        { label: "0", insertText: "0", insertAsSnippet: false, documentation: "Off / false.", detail: directive.name, kind: "enum", sortText: "1_0" },
      ].filter((item) => matchesPrefix(item.label, parsed.valuePrefix));
    }
    return [];
  }

  const items: TxiCompletion[] = [];
  for (let i = 0; i < TXI_DIRECTIVES.length; i++) {
    const directive = TXI_DIRECTIVES[i];
    if (!matchesPrefix(directive.name, parsed.keyPrefix)) continue;
    items.push({
      label: directive.name,
      insertText: directive.insertSnippet || directive.name,
      insertAsSnippet: !!directive.insertSnippet,
      documentation: directive.documentation,
      detail: directive.detail,
      kind: "keyword",
      sortText: `0_${directive.name}`,
    });
  }
  if (!parsed.keyPrefix) {
    for (let i = 0; i < SNIPPETS.length; i++) {
      items.push(SNIPPETS[i]);
    }
  }
  return items;
}

export function hoverTxi(line: string): { name: string; detail: string; documentation: string } | undefined {
  const trimmed = line.trim();
  if (isCommentOrEmpty(trimmed) || isCoordinateLine(trimmed)) return undefined;
  const token = trimmed.split(/\s+/)[0];
  const directive = getTxiDirective(token);
  if (directive) {
    return { name: directive.name, detail: directive.detail, documentation: directive.documentation };
  }
  const asValue = TXI_ENUM_VALUES.find((name) => name.toLowerCase() === token.toLowerCase());
  if (asValue) {
    for (let i = 0; i < TXI_DIRECTIVES.length; i++) {
      const values = TXI_DIRECTIVES[i].values;
      if (!values) continue;
      const found = values.find((value) => value.name === asValue);
      if (found) {
        return { name: found.name, detail: TXI_DIRECTIVES[i].name, documentation: found.documentation };
      }
    }
  }
  return undefined;
}

export function validateTxi(text: string): TxiIssue[] {
  const issues: TxiIssue[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;
    if (isCoordinateLine(raw)) continue;
    const [directiveRaw, ...rest] = line.split(/\s+/);
    const directive = directiveRaw.toLowerCase();
    if (!TXI_DIRECTIVE_SET.has(directive)) {
      issues.push({ line: i + 1, message: `Unknown directive "${directiveRaw}"` });
      continue;
    }
    if ((directive === "upperleftcoords" || directive === "lowerrightcoords") && rest.length) {
      const n = Number.parseInt(rest[0], 10);
      if (!Number.isFinite(n) || n < 0) {
        issues.push({ line: i + 1, message: `"${directive}" requires a non-negative point count` });
      }
    }
    const info = getTxiDirective(directive);
    if (info?.valueKind === "enum" && rest.length) {
      const allowed = new Set((info.values || []).map((value) => value.name));
      if (!allowed.has(rest[0].toLowerCase())) {
        issues.push({
          line: i + 1,
          message: `"${directive}" expected ${Array.from(allowed).join(" | ")}, got "${rest[0]}"`,
        });
      }
    }
  }
  return issues;
}
