import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";

const TXI_DIRECTIVES = [
  "proceduretype",
  "mipmap",
  "filter",
  "defaultwidth",
  "defaultheight",
  "downsamplemin",
  "downsamplemax",
  "decal",
  "blending",
  "compresstexture",
  "isbumpmap",
  "islightmap",
  "cube",
  "bumpmapscaling",
  "bumpmaptexture",
  "bumpyshinytexture",
  "envmaptexture",
  "wateralpha",
  "numx",
  "numy",
  "fps",
  "numchars",
  "fontheight",
  "baselineheight",
  "texturewidth",
  "spacingr",
  "spacingb",
  "caretindent",
  "upperleftcoords",
  "lowerrightcoords",
] as const;

/** Regex for known directive at line start (case-insensitive). */
const TXI_DIRECTIVE_LINE_RE = new RegExp(
  `^\\s*(${TXI_DIRECTIVES.join("|")})\\b`,
  "i",
);

/**
 * Monaco language registration for KotOR `.txi` (texture extra info) files.
 * Keys are case-insensitive in the engine parser; highlighting matches common style.
 */
export class TXILanguageService {
  private static didInit = false;

  static initTXILanguage(): void {
    if (TXILanguageService.didInit) {
      return;
    }
    TXILanguageService.didInit = true;

    monacoEditor.languages.register({ id: "txi" });

    const tokenConfig: monacoEditor.languages.IMonarchLanguage = {
      ignoreCase: true,
      tokenizer: {
        root: [
          [/^\s*\/\/.*/, "comment"],
          [/^\s*#.*$/, "comment"],
          [/^\s*$/, "white"],
          [
            /^\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*$/,
            "number",
          ],
          [TXI_DIRECTIVE_LINE_RE, "keyword", "@afterkey"],
          [/^\s*([a-zA-Z_]\w*)\b/, "identifier", "@afterkey"],
          [/./, ""],
        ],
        afterkey: [
          [/\s+/, "white"],
          [/\/\/.*$/, "comment", "@pop"],
          [/#.*$/, "comment", "@pop"],
          [
            /\b(cycle|water|random|ringtexdistort)\b/i,
            { token: "keyword.value", next: "@pop" },
          ],
          [/\b(punchthrough|additive)\b/i, { token: "keyword.value", next: "@pop" }],
          [/0[xX][0-9a-fA-F]+/, "number.hex", "@pop"],
          [/[+-]?[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/, "number.float", "@pop"],
          [/[+-]?[0-9]+/, "number", "@pop"],
          [/[^\s#]+/, "string", "@pop"],
          [/$/, "", "@pop"],
        ],
      },
    };

    monacoEditor.languages.setMonarchTokensProvider("txi", tokenConfig);

    monacoEditor.languages.setLanguageConfiguration("txi", {
      comments: { lineComment: "//" },
      brackets: [],
      autoClosingPairs: [],
      surroundingPairs: [],
    });

    monacoEditor.editor.defineTheme("txi-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "569CD6" },
        { token: "keyword.value", foreground: "D4D4D4" },
        { token: "comment", foreground: "6A9955" },
        { token: "number", foreground: "B5CEA8" },
        { token: "number.hex", foreground: "D7BA7D" },
        { token: "number.float", foreground: "B5CEA8" },
        { token: "string", foreground: "CE9178" },
        { token: "identifier", foreground: "9CDCFE" },
      ],
      colors: {
        "editor.foreground": "#FFFFFF",
      },
    });
  }
}
