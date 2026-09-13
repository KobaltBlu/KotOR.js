import { NWScriptLexer } from "@/nwscript/compiler/NWScriptLexer";
import type { SourceSpan, Token, TokenType } from "@/nwscript/compiler/NWScriptToken";

export type NssTokenSpan = {
  className: string;
  text: string;
};

function tokenClassName(type: TokenType): string {
  switch(type){
    case 'keyword':
      return 'nss-tok-keyword';
    case 'string':
      return 'nss-tok-string';
    case 'comment':
      return 'nss-tok-comment';
    case 'int':
    case 'float':
    case 'hex':
      return 'nss-tok-number';
    case 'name':
      return 'nss-tok-ident';
    case 'op':
    case 'punct':
      return 'nss-tok-punct';
    default:
      return 'nss-tok-plain';
  }
}

function sliceSpan(lines: string[], span: SourceSpan): string {
  const first = Math.max(0, span.first_line);
  const last = Math.max(first, span.last_line);
  if(first >= lines.length){
    return '';
  }
  if(first === last){
    const line = lines[first] ?? '';
    return line.slice(span.first_column, span.last_column);
  }
  const parts: string[] = [];
  parts.push((lines[first] ?? '').slice(span.first_column));
  for(let i = first + 1; i < last && i < lines.length; i++){
    parts.push(lines[i] ?? '');
  }
  if(last < lines.length){
    parts.push((lines[last] ?? '').slice(0, span.last_column));
  }
  return parts.join('\n');
}

function buildLineSpans(
  lineText: string,
  pieces: Array<{ start: number; end: number; className: string }>,
): NssTokenSpan[] {
  pieces.sort((a, b) => a.start - b.start || a.end - b.end);
  const spans: NssTokenSpan[] = [];
  let cursor = 0;
  for(const piece of pieces){
    const start = Math.max(0, Math.min(piece.start, lineText.length));
    const end = Math.max(start, Math.min(piece.end, lineText.length));
    if(start > cursor){
      spans.push({ className: 'nss-tok-plain', text: lineText.slice(cursor, start) });
    }
    if(end > start){
      spans.push({ className: piece.className, text: lineText.slice(start, end) });
    }
    cursor = Math.max(cursor, end);
  }
  if(cursor < lineText.length){
    spans.push({ className: 'nss-tok-plain', text: lineText.slice(cursor) });
  }
  if(!spans.length){
    spans.push({ className: 'nss-tok-plain', text: lineText.length ? lineText : '\u00a0' });
  }
  return spans;
}

/**
 * Lex full NSS once and produce per-line highlighted spans (preserves whitespace /
 * multi-line block comments via original source slices).
 */
export function highlightNssDocument(nss: string): NssTokenSpan[][] {
  const lines = nss.length ? nss.split('\n') : [''];
  const piecesPerLine: Array<Array<{ start: number; end: number; className: string }>> =
    lines.map((): Array<{ start: number; end: number; className: string }> => []);

  const lexer = new NWScriptLexer(nss);
  while(true){
    const token: Token = lexer.next();
    if(token.type === 'eof'){
      break;
    }
    const className = tokenClassName(token.type);
    const text = sliceSpan(lines, token.source);
    if(!text.length){
      continue;
    }
    const parts = text.split('\n');
    const startLine = token.source.first_line;
    for(let i = 0; i < parts.length; i++){
      const lineIndex = startLine + i;
      if(lineIndex < 0 || lineIndex >= lines.length){
        continue;
      }
      const part = parts[i];
      const startCol = i === 0 ? token.source.first_column : 0;
      const endCol = startCol + part.length;
      piecesPerLine[lineIndex].push({ start: startCol, end: endCol, className });
    }
  }

  return lines.map((lineText, index) => buildLineSpans(lineText, piecesPerLine[index]));
}
