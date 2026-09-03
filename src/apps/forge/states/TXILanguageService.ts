import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import {
  completeTxi,
  hoverTxi,
  monarchDirectiveRegex,
  monarchEnumRegex,
  validateTxi,
} from "@/apps/forge/txi/txiSchema";

/**
 * Monaco language registration for KotOR `.txi` (texture extra info) files.
 * Keys are case-insensitive; highlighting and autocomplete match that.
 *
 * @file TXILanguageService.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

const LANGUAGE_ID = "txi";

function dummyRange(): monacoEditor.IRange {
  return {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 1,
  };
}

export class TXILanguageService {
  private static didInit = false;

  static initTXILanguage(): void {
    if (TXILanguageService.didInit) {
      return;
    }
    TXILanguageService.didInit = true;

    monacoEditor.languages.register({ id: LANGUAGE_ID });

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
          [monarchDirectiveRegex(), "keyword", "@afterkey"],
          [/^\s*([a-zA-Z_]\w*)\b/, "identifier", "@afterkey"],
          [/./, ""],
        ],
        afterkey: [
          [/\s+/, "white"],
          [/\/\/.*$/, "comment", "@pop"],
          [/#.*$/, "comment", "@pop"],
          [monarchEnumRegex(), { token: "keyword.value", next: "@pop" }],
          [/0[xX][0-9a-fA-F]+/, "number.hex", "@pop"],
          [/[+-]?[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/, "number.float", "@pop"],
          [/[+-]?[0-9]+/, "number", "@pop"],
          [/[^\s#]+/, "string", "@pop"],
          [/$/, "", "@pop"],
        ],
      },
    };

    monacoEditor.languages.setMonarchTokensProvider(LANGUAGE_ID, tokenConfig);

    monacoEditor.languages.setLanguageConfiguration(LANGUAGE_ID, {
      comments: { lineComment: "//" },
      wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\s]+)/g,
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

    monacoEditor.editor.defineTheme("txi-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "0000FF" },
        { token: "keyword.value", foreground: "333333" },
        { token: "comment", foreground: "008000" },
        { token: "number", foreground: "098658" },
        { token: "number.hex", foreground: "B89500" },
        { token: "number.float", foreground: "098658" },
        { token: "string", foreground: "A31515" },
        { token: "identifier", foreground: "001080" },
      ],
      colors: {
        "editor.foreground": "#333333",
      },
    });

    monacoEditor.languages.registerCompletionItemProvider(LANGUAGE_ID, {
      triggerCharacters: [" ", "\t"],
      provideCompletionItems: (model, position) => {
        const line = model.getLineContent(position.lineNumber);
        const until = line.substring(0, position.column - 1);
        const word = model.getWordUntilPosition(position);
        const range: monacoEditor.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const suggestions = completeTxi(until).map((item) => {
          const kind =
            item.kind === "snippet"
              ? monacoEditor.languages.CompletionItemKind.Snippet
              : item.kind === "enum"
                ? monacoEditor.languages.CompletionItemKind.EnumMember
                : monacoEditor.languages.CompletionItemKind.Keyword;
          return {
            label: item.label,
            kind,
            insertText: item.insertText,
            insertTextRules: item.insertAsSnippet
              ? monacoEditor.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            documentation: { value: item.documentation },
            detail: item.detail,
            sortText: item.sortText,
            range: range || dummyRange(),
          } as monacoEditor.languages.CompletionItem;
        });
        return { suggestions };
      },
    });

    monacoEditor.languages.registerHoverProvider(LANGUAGE_ID, {
      provideHover: (model, position) => {
        const line = model.getLineContent(position.lineNumber);
        const info = hoverTxi(line);
        if (!info) {
          return null;
        }
        const word = model.getWordAtPosition(position);
        const range = word
          ? {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            }
          : undefined;
        return {
          range,
          contents: [
            { value: `**${info.name}** — ${info.detail}` },
            { value: info.documentation },
          ],
        };
      },
    });
  }

  static validateTXI(text: string): monacoEditor.editor.IMarkerData[] {
    return validateTxi(text).map((issue) => ({
      severity: monacoEditor.MarkerSeverity.Warning,
      startLineNumber: issue.line,
      startColumn: 1,
      endLineNumber: issue.line,
      endColumn: 1000,
      message: issue.message,
    }));
  }
}
