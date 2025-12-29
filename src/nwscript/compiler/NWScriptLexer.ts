import type { Token, SourceSpan } from "./NWScriptToken";

const KEYWORDS = new Map<string, string>([
  ["switch", "SWITCH"],
  ["case", "CASE"],
  ["default", "DEFAULT"],
  ["if", "IF"],
  ["else", "ELSE"],
  ["while", "WHILE"],
  ["do", "DO"],
  ["for", "FOR"],
  ["continue", "CONTINUE"],
  ["const", "CONST"],
  ["void", "VOID"],
  ["int", "INT"],
  ["string", "STRING"],
  ["float", "FLOAT"],
  ["vector", "VECTOR"],
  ["struct", "STRUCT"],
  ["action", "ACTION"],
  ["object", "OBJECT"],
  ["object_id", "OBJECT"],

  ["return", "RETURN"],
  ["break", "BREAK"],

  ["#include", "INCLUDE"],
  ["#define", "DEFINE"],

  ["true", "TRUE"],
  ["false", "FALSE"],
  ["null", "NULL"],

  ["OBJECT_SELF", "OBJECT_SELF"],
  ["OBJECT_INVALID", "OBJECT_INVALID"],
]);

const TWO_CHAR_OPS = new Set([
  "==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "%=",
  "||", "&&",
  "<<", ">>",
  "|=", "&=", "^=",
  "++", "--",
]);

const THREE_CHAR_OPS = new Set([
  ">>>",
  "<<=",
  ">>=",
]);

const FOUR_CHAR_OPS = new Set([
  ">>>=",
]);

const SINGLE_CHARS = new Set([
  "{", "}", "(", ")", "[", "]",
  ",", ":", ";", "?", ".",
  "=", "<", ">", "+", "-", "*", "/", "%", "!",
  "|", "&", "^", "~",
]);

function span(line: number, col: number, line2: number, col2: number): SourceSpan {
  return {
    first_line: line,
    first_column: col,
    last_line: line2,
    last_column: col2,
  };
}

export class NWScriptLexer {
  private src: string;
  private i = 0;

  private line = 1;
  private col = 0;

  constructor(source: string) {
    this.src = source ?? "";
  }

  peekChar(offset = 0): string {
    const idx = this.i + offset;
    return idx >= 0 && idx < this.src.length ? this.src[idx] : "\0";
  }

  nextChar(): string {
    const ch = this.peekChar(0);
    if (ch === "\0") return ch;

    this.i++;

    if (ch === "\n") {
      this.line++;
      this.col = 0;
    } else {
      this.col++;
    }
    return ch;
  }

  private makeToken(type: Token["type"], value: string, startLine: number, startCol: number, endLine: number, endCol: number): Token {
    return { type, value, source: span(startLine, startCol, endLine, endCol) };
  }

  private skipWhitespaceAndComments(): void {
    while (true) {
      const ch = this.peekChar(0);

      // whitespace
      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
        this.nextChar();
        continue;
      }

      // // comment
      if (ch === "/" && this.peekChar(1) === "/") {
        this.nextChar(); this.nextChar();
        while (this.peekChar(0) !== "\n" && this.peekChar(0) !== "\0") this.nextChar();
        continue;
      }

      // /* comment */
      if (ch === "/" && this.peekChar(1) === "*") {
        this.nextChar(); this.nextChar();
        while (true) {
          if (this.peekChar(0) === "\0") return;
          if (this.peekChar(0) === "*" && this.peekChar(1) === "/") {
            this.nextChar(); this.nextChar();
            break;
          }
          this.nextChar();
        }
        continue;
      }

      break;
    }
  }

  next(): Token {
    this.skipWhitespaceAndComments();

    const startLine = this.line;
    const startCol = this.col;

    const ch = this.peekChar(0);
    if (ch === "\0") {
      return this.makeToken("eof", "eof", startLine, startCol, this.line, this.col);
    }

    // string literal: "..."
    if (ch === "\"") {
      this.nextChar(); // opening quote
      let out = "";
      while (true) {
        const c = this.peekChar(0);
        if (c === "\0") break;
        if (c === "\"") {
          this.nextChar();
          break;
        }
        // NOTE: your old lexer did not really handle escapes; keep that behavior for now.
        out += this.nextChar();
      }
      return this.makeToken("string", out, startLine, startCol, this.line, this.col);
    }

    // else if (single keyword)
    if (this.src.slice(this.i).match(/^else\s+if\b/)) {
      // consume "else", whitespace, "if"
      this.nextChar(); this.nextChar(); this.nextChar(); this.nextChar(); // else
      while (this.peekChar(0) === " " || this.peekChar(0) === "\t" || this.peekChar(0) === "\r" || this.peekChar(0) === "\n") this.nextChar();
      this.nextChar(); this.nextChar(); // if
      return this.makeToken("keyword", "ELSEIF", startLine, startCol, this.line, this.col);
    }

    // hex literal
    if (ch === "0" && (this.peekChar(1) === "x" || this.peekChar(1) === "X")) {
      this.nextChar(); this.nextChar();
      let hexDigits = "";
      while (/[0-9a-fA-F]/.test(this.peekChar(0))) {
        hexDigits += this.nextChar();
      }
      return this.makeToken("hex", "0x" + hexDigits, startLine, startCol, this.line, this.col);
    }

    // number: float or int (match your old: int.frac(f)? OR int)
    if (/[0-9]/.test(ch)) {
      let s = "";
      while (/[0-9]/.test(this.peekChar(0))) s += this.nextChar();

      if (this.peekChar(0) === "." && /[0-9]/.test(this.peekChar(1))) {
        s += this.nextChar(); // .
        while (/[0-9]/.test(this.peekChar(0))) s += this.nextChar();
        if (this.peekChar(0) === "f" || this.peekChar(0) === "F") this.nextChar();
        return this.makeToken("float", s, startLine, startCol, this.line, this.col);
      }

      return this.makeToken("int", s, startLine, startCol, this.line, this.col);
    }

    // identifier or keyword (also handles #include/#define)
    if (/[A-Za-z_#]/.test(ch)) {
      let s = "";
      while (/[A-Za-z0-9_#]/.test(this.peekChar(0))) s += this.nextChar();

      const kw = KEYWORDS.get(s) ?? KEYWORDS.get(s.toLowerCase());
      if (kw) return this.makeToken("keyword", kw, startLine, startCol, this.line, this.col);

      return this.makeToken("name", s, startLine, startCol, this.line, this.col);
    }

    // operators (longest first)
    const four = this.src.slice(this.i, this.i + 4);
    if (FOUR_CHAR_OPS.has(four)) {
      for (let k = 0; k < 4; k++) this.nextChar();
      return this.makeToken("op", four, startLine, startCol, this.line, this.col);
    }
    const three = this.src.slice(this.i, this.i + 3);
    if (THREE_CHAR_OPS.has(three)) {
      for (let k = 0; k < 3; k++) this.nextChar();
      return this.makeToken("op", three, startLine, startCol, this.line, this.col);
    }
    const two = this.src.slice(this.i, this.i + 2);
    if (TWO_CHAR_OPS.has(two)) {
      this.nextChar(); this.nextChar();
      return this.makeToken("op", two, startLine, startCol, this.line, this.col);
    }

    // single char punct/op
    if (SINGLE_CHARS.has(ch)) {
      this.nextChar();
      const t = (ch === "{" || ch === "}" || ch === "(" || ch === ")" || ch === "[" || ch === "]" ||
                 ch === "," || ch === ":" || ch === ";" || ch === "?" || ch === ".")
        ? "punct"
        : "op";
      return this.makeToken(t, ch, startLine, startCol, this.line, this.col);
    }

    // unknown char: consume and return as op (keeps parser moving)
    this.nextChar();
    return this.makeToken("op", ch, startLine, startCol, this.line, this.col);
  }
}