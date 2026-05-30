/**
 * Whitespace / comment handling for Aurora MDL ASCII (MDLedit-style `#` line comments).
 */

export interface AsciiToken {
  readonly text: string;
  readonly line: number;
}

/** Strip `#` comments and normalize newlines to `\n`. */
export function preprocessMdlAscii(source: string): string {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => {
      const hash = line.indexOf("#");
      return hash >= 0 ? line.slice(0, hash) : line;
    })
    .join("\n");
}

/**
 * Split into non-whitespace tokens; each token records 1-based source line.
 */
export function tokenizeMdlAscii(source: string): AsciiToken[] {
  const text = preprocessMdlAscii(source);
  const out: AsciiToken[] = [];
  let line = 1;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "\n") {
      line++;
      i++;
      continue;
    }
    if (c <= " " && c !== "\n") {
      i++;
      continue;
    }
    const start = i;
    while (i < text.length) {
      const ch = text[i];
      if (ch === "\n" || (ch <= " " && ch !== "\n")) break;
      i++;
    }
    out.push({ text: text.slice(start, i), line });
  }
  return out;
}

export class MdlAsciiTokenStream {
  readonly tokens: AsciiToken[];
  pos = 0;

  constructor(tokens: AsciiToken[]) {
    this.tokens = tokens;
  }

  get eof(): boolean {
    return this.pos >= this.tokens.length;
  }

  peek(): AsciiToken | undefined {
    return this.tokens[this.pos];
  }

  take(): AsciiToken {
    const t = this.tokens[this.pos++];
    if (!t) throw new MdlAsciiParseError("Unexpected end of file", 0);
    return t;
  }

  takeIf(pred: (t: AsciiToken) => boolean): AsciiToken | undefined {
    const p = this.peek();
    if (p && pred(p)) return this.take();
    return undefined;
  }

  expectWord(expectedLower: string): AsciiToken {
    const t = this.take();
    if (t.text.toLowerCase() !== expectedLower) {
      throw new MdlAsciiParseError(`Expected '${expectedLower}', got '${t.text}'`, t.line);
    }
    return t;
  }

  takeNumber(): number {
    const t = this.take();
    const n = Number(t.text);
    if (!Number.isFinite(n)) {
      throw new MdlAsciiParseError(`Expected number, got '${t.text}'`, t.line);
    }
    return n;
  }

  takeInt(): number {
    return Math.floor(this.takeNumber());
  }

  /** Optional leading word match (case-insensitive). */
  matchWord(w: string): boolean {
    const p = this.peek();
    if (p && p.text.toLowerCase() === w.toLowerCase()) {
      this.pos++;
      return true;
    }
    return false;
  }
}

export class MdlAsciiParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(message + (line > 0 ? ` (line ${line})` : ""));
    this.name = "MdlAsciiParseError";
  }
}
