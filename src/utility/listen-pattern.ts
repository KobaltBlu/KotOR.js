/**
 * Aurora/NWN listen-pattern matcher (KotOR inherits the same engine rules).
 *
 * From Noel (BioWare) / NWN Lexicon SetListenPattern:
 * - `**` — zero or more characters
 * - `*w` — one or more whitespace
 * - `*n` — one or more numeric
 * - `*p` — one or more punctuation
 * - `*a` — one or more alphabetic
 * - `|` — or
 * - `( )` — grouping blocks
 *
 * Matching is case-insensitive. Captures for `**` wildcards (and literal
 * segments between them) populate matched substrings for GetMatchedSubstring.
 *
 * @file listen-pattern.ts
 */

export interface ListenPatternMatchResult {
  matched: boolean;
  /** Captured pieces for GetMatchedSubstring; empty when no match. */
  substrings: string[];
}

/**
 * Convert an Aurora listen pattern to a RegExp + capture map.
 * Returns null if the pattern cannot be compiled.
 */
function buildPatternRegex(pattern: string): RegExp | null {
  if(typeof pattern !== 'string'){ return null; }
  let i = 0;
  let out = '^';
  const len = pattern.length;

  while(i < len){
    const c = pattern[i];
    if(c === '*' && i + 1 < len){
      const n = pattern[i + 1];
      if(n === '*'){
        // zero or more of any char — capturing
        out += '(.*)';
        i += 2;
        continue;
      }
      if(n === 'w' || n === 'W'){
        out += '(\\s+)';
        i += 2;
        continue;
      }
      if(n === 'n' || n === 'N'){
        out += '(\\d+)';
        i += 2;
        continue;
      }
      if(n === 'p' || n === 'P'){
        out += '([^\\w\\s]+)';
        i += 2;
        continue;
      }
      if(n === 'a' || n === 'A'){
        out += '([A-Za-z]+)';
        i += 2;
        continue;
      }
    }
    if(c === '('){
      out += '(?:';
      i += 1;
      continue;
    }
    if(c === ')'){
      out += ')';
      i += 1;
      continue;
    }
    if(c === '|'){
      out += '|';
      i += 1;
      continue;
    }
    // Escape regex metacharacters for literal match
    if(/[\\^$.+?{}[\]()]/.test(c)){
      out += '\\' + c;
    }else{
      out += c;
    }
    i += 1;
  }
  out += '$';
  try{
    return new RegExp(out, 'i');
  }catch{
    return null;
  }
}

/**
 * Test `text` against an Aurora listen `pattern`.
 * On success, `substrings` holds capture groups in order (for GetMatchedSubstring).
 */
export function testStringAgainstPattern(pattern: string, text: string): ListenPatternMatchResult {
  const empty: ListenPatternMatchResult = { matched: false, substrings: [] };
  if(typeof pattern !== 'string' || typeof text !== 'string'){
    return empty;
  }
  const re = buildPatternRegex(pattern);
  if(!re){ return empty; }
  const m = re.exec(text);
  if(!m){ return empty; }
  // m[0] is full match; captures are m[1..]
  const substrings: string[] = [];
  for(let i = 1; i < m.length; i++){
    substrings.push(m[i] ?? '');
  }
  // Retail FOO** on "foobar" → ["foo","bar"]: when pattern has a leading
  // literal before **, the engine also exposes the literal as substring 0.
  // Our capturing `**` only yields the wildcard parts. Reconstruct by
  // walking the pattern for literal segments adjacent to `**`.
  const reconstructed = reconstructSubstrings(pattern, text, substrings);
  return { matched: true, substrings: reconstructed };
}

/**
 * NWN GetMatchedSubstring semantics for patterns like `FOO**` / `**foo**bar**`:
 * alternating literal + wildcard pieces are all returned as substrings.
 */
function reconstructSubstrings(
  pattern: string,
  text: string,
  captures: string[]
): string[] {
  // If the pattern has no `**`, return typed captures (*w/*n/*p/*a) as-is.
  if(pattern.indexOf('**') < 0){
    return captures;
  }

  const parts: string[] = [];
  let i = 0;
  let captureIdx = 0;
  const len = pattern.length;
  let textPos = 0;
  const lowerText = text.toLowerCase();

  while(i < len){
    if(pattern[i] === '*' && i + 1 < len && pattern[i + 1] === '*'){
      const cap = captures[captureIdx++] ?? '';
      parts.push(cap);
      textPos += cap.length;
      i += 2;
      continue;
    }
    if(pattern[i] === '*' && i + 1 < len && /[wnpaWNPA]/.test(pattern[i + 1])){
      const cap = captures[captureIdx++] ?? '';
      parts.push(cap);
      textPos += cap.length;
      i += 2;
      continue;
    }
    if(pattern[i] === '(' || pattern[i] === ')' || pattern[i] === '|'){
      // Grouping/or — fall back to raw captures; full reconstruct is ambiguous.
      return captures.length ? captures : parts;
    }
    // Literal run until next special
    let lit = '';
    while(i < len){
      if(pattern[i] === '*' || pattern[i] === '(' || pattern[i] === ')' || pattern[i] === '|'){
        break;
      }
      lit += pattern[i];
      i += 1;
    }
    if(lit.length){
      parts.push(lit);
      // Advance textPos past this literal (case-insensitive)
      const idx = lowerText.indexOf(lit.toLowerCase(), textPos);
      if(idx >= 0){ textPos = idx + lit.length; }
    }
  }
  return parts.length ? parts : captures;
}

/** Standard associate listen-pattern number → speech token (Aurora ASSOCIATE_COMMAND_*). */
export const ASSOCIATE_LISTEN_PATTERNS: ReadonlyArray<{ pattern: string; number: number }> = [
  { pattern: 'NW_ATTACK_MY_TARGET', number: -3 },
  { pattern: 'NW_FOLLOW_ME', number: -5 },
  { pattern: 'NW_GUARD_ME', number: -7 },
  { pattern: 'NW_STAND_GROUND', number: -2 },
  { pattern: 'NW_HEAL_ME', number: -4 },
  { pattern: 'NW_MASTER_FAILED_CLOSE', number: -11 },
  { pattern: 'NW_MASTER_FAILED_OPEN', number: -12 },
  { pattern: 'NW_MASTER_SAW_TRAP', number: -13 },
  { pattern: 'NW_MASTER_UNDER_ATTACK', number: -6 },
  { pattern: 'NW_PICKLOCK', number: -9 },
  { pattern: 'NW_DISARMTRAP', number: -10 },
];
