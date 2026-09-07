/**
 * Odyssey listen-pattern matcher (K1 + K2 parity).
 *
 * routines:
 * - ParseString (K1)
 * - TestString (K1 / K2 Aspyr)
 * - NewNode
 *
 * Node types (NewNode param):
 * 0 LITERAL, 1 ANY (**), 2 ALT, 3 JOIN, 4 *w, 5 *p, 6 *a, 7 *n, 8 *A, 9 END
 *
 * Character classes consume exactly one character per successful visit. Because
 * TestString re-enters non-literal nodes on backtrack (advancing from that
 * node's prior endPos), a lone `*n` / `*w` / `*a` / `*p` effectively matches
 * one-or-more of that class — the same outcome NWN Lexicon documented, produced
 * by Odyssey's backtracker rather than a greedy quantifier in the grammar.
 *
 * Captures returned here are the per-node slices EventHandler case 7 stores on
 * the object (TestString substrings[1..n], skipping the full-input slot).
 *
 * @file listen-pattern.ts
 */

/** expression node type values. */
export const enum ExprNodeType {
  LITERAL = 0,
  ANY = 1,
  ALT = 2,
  JOIN = 3,
  SPACE = 4,
  PUNCT = 5,
  ALPHA = 6,
  DIGIT = 7,
  ALNUM = 8,
  END = 9,
}

interface ExprNode {
  type: ExprNodeType;
  /** Literal text (type LITERAL only). Already lowercased when !caseSensitive. */
  text?: string;
  next: ExprNode | null;
  /** Left-side chain for ALT. */
  child: ExprNode | null;
  visits: number;
  endPos: number;
}

interface ExprList {
  head: ExprNode | null;
  last: ExprNode | null;
  tail: ExprNode | null;
}

export interface ListenPatternMatchResult {
  matched: boolean;
  /**
   * Per-node captures in order (literals, **, single-char classes).
   * Equivalent to what GetMatchedSubstring indexes after a listen event.
   */
  substrings: string[];
}

function newNode(type: ExprNodeType, text?: string): ExprNode {
  return { type, text, next: null, child: null, visits: 0, endPos: 0 };
}

function newList(): ExprList {
  return { head: null, last: null, tail: null };
}

function appendNode(list: ExprList, node: ExprNode): void {
  if(!list.head){
    list.head = node;
    list.last = node;
    list.tail = node;
    return;
  }
  node.next = list.last!.next;
  list.last!.next = node;
  if(list.last === list.tail){
    list.tail = node;
  }
  list.last = node;
}

/**
 * Parse an Aurora/Odyssey listen pattern into a node list.
 * Returns null on parse error (invalid escape, unbalanced groups, empty `|` left side).
 */
export function parsePattern(pattern: string, caseSensitive = false): ExprNode | null {
  if(typeof pattern !== 'string'){ return null; }

  let source = pattern;
  if(!caseSensitive){
    source = source.toLowerCase();
  }

  const stack: ExprList[] = [newList()];
  let depth = 0;
  let i = 0;
  const len = source.length;

  while(i < len){
    const c = source[i];
    const list = stack[depth];

    if(c === '('){
      depth += 1;
      stack.push(newList());
      i += 1;
      continue;
    }

    if(c === ')'){
      if(depth < 1){ return null; }
      const child = stack.pop()!;
      depth -= 1;
      const parent = stack[depth];
      if(child.head){
        // ParseString `)` case: parent.last becomes
        // child.tail (true chain end / JOIN), NOT child.last (alt insert point).
        if(!parent.head){
          parent.head = child.head;
          parent.tail = child.tail;
        }else{
          if(child.tail){
            child.tail.next = parent.last!.next;
          }
          parent.last!.next = child.head;
          if(parent.last === parent.tail){
            parent.tail = child.tail;
          }
        }
        parent.last = child.tail;
      }
      i += 1;
      continue;
    }

    if(c === '|'){
      if(!list.head){ return null; }
      const join = newNode(ExprNodeType.JOIN);
      appendNode(list, join);
      const alt = newNode(ExprNodeType.ALT);
      alt.child = list.head;
      alt.next = join;
      list.head = alt;
      list.last = alt;
      i += 1;
      continue;
    }

    if(c === '*'){
      i += 1;
      if(i >= len){ return null; }
      const n = source[i];
      let type: ExprNodeType;
      switch(n){
        case '*': type = ExprNodeType.ANY; break;
        case 'w': type = ExprNodeType.SPACE; break;
        case 'p': type = ExprNodeType.PUNCT; break;
        case 'a': type = ExprNodeType.ALPHA; break;
        case 'n': type = ExprNodeType.DIGIT; break;
        case 'A': type = ExprNodeType.ALNUM; break;
        default: return null;
      }
      appendNode(list, newNode(type));
      i += 1;
      continue;
    }

    let lit = '';
    while(i < len){
      const ch = source[i];
      if(ch === '*' || ch === '|' || ch === '(' || ch === ')'){ break; }
      lit += ch;
      i += 1;
    }
    if(lit.length){
      appendNode(list, newNode(ExprNodeType.LITERAL, lit));
    }
  }

  if(depth > 0){ return null; }

  const root = stack[0];
  const end = newNode(ExprNodeType.END);
  if(!root.head){
    root.head = end;
  }else if(root.tail){
    root.tail.next = end;
  }else{
    let n = root.head;
    while(n.next){ n = n.next; }
    n.next = end;
  }
  return root.head;
}

function charMatchesClass(type: ExprNodeType, ch: string): boolean {
  switch(type){
    case ExprNodeType.SPACE: return ch === ' ';
    case ExprNodeType.PUNCT: return ch === '.' || ch === '?' || ch === '!';
    case ExprNodeType.ALPHA: return ch >= 'a' && ch <= 'z';
    case ExprNodeType.DIGIT: return ch >= '0' && ch <= '9';
    case ExprNodeType.ALNUM:
      return (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
    default: return false;
  }
}

function resetVisits(node: ExprNode | null): void {
  const seen = new Set<ExprNode>();
  const stack: ExprNode[] = [];
  if(node){ stack.push(node); }
  while(stack.length){
    const n = stack.pop()!;
    if(seen.has(n)){ continue; }
    seen.add(n);
    n.visits = 0;
    n.endPos = 0;
    if(n.next){ stack.push(n.next); }
    if(n.child){ stack.push(n.child); }
  }
}

/**
 * Test `text` against an Odyssey listen `pattern`.
 * On success, `substrings` holds per-node captures (EventHandler case 7 list).
 */
export function testStringAgainstPattern(
  pattern: string,
  text: string,
  caseSensitive = false
): ListenPatternMatchResult {
  const empty: ListenPatternMatchResult = { matched: false, substrings: [] };
  if(typeof pattern !== 'string' || typeof text !== 'string'){
    return empty;
  }

  const head = parsePattern(pattern, caseSensitive);
  if(!head){ return empty; }

  const original = text;
  const input = caseSensitive ? text : text.toLowerCase();
  const len = input.length;

  resetVisits(head);

  // path[0] is a dummy JOIN (pushes NewNode(3) before walking).
  const path: ExprNode[] = [newNode(ExprNodeType.JOIN)];

  let pos = 0;
  let node: ExprNode | null = head;
  let steps = 0;
  const STEP_LIMIT = 100000;

  const buildCaptures = (): string[] => {
    const captures: string[] = [];
    let prev = 0;
    for(let i = 1; i < path.length; i++){
      const n = path[i];
      if(n.type === ExprNodeType.ALT){ continue; }
      captures.push(original.substring(prev, n.endPos));
      prev = n.endPos;
    }
    return captures;
  };

  /**
   * Pop path entries until a retriable (non-literal) node is found.
   * Restores `pos` to that node's endPos (local_38 = node[2]).
   */
  const backtrack = (): ExprNode | null => {
    while(path.length > 1){
      const top = path.pop()!;
      pos = top.endPos;
      if(top.type === ExprNodeType.LITERAL){
        continue;
      }
      return top;
    }
    return null;
  };

  while(node){
    if(++steps > STEP_LIMIT){ return empty; }
    node.visits += 1;
    let failed = false;

    switch(node.type){
      case ExprNodeType.LITERAL: {
        path.push(node);
        const lit = node.text || '';
        let ok = true;
        for(let j = 0; j < lit.length; j++){
          if(pos + j >= len || input[pos + j] !== lit[j]){
            ok = false;
            break;
          }
        }
        if(!ok){
          failed = true;
          break;
        }
        pos += lit.length;
        node.endPos = pos;
        node = node.next;
        if(node){ node.visits = 0; }
        break;
      }

      case ExprNodeType.ANY: {
        path.push(node);
        if(pos === len){
          if(node.visits > 1){
            // Cannot expand past end — hard fail (clears and returns 0).
            return empty;
          }
        }else if(node.visits > 1){
          pos += 1;
        }
        node.endPos = pos;
        node = node.next;
        if(node){ node.visits = 0; }
        break;
      }

      case ExprNodeType.ALT: {
        path.push(node);
        node.endPos = pos;
        if(node.visits === 1){
          // Right side first.
          node = node.next;
        }else if(node.visits === 2 && node.child){
          node.child.visits = 0;
          node = node.child;
        }else{
          // Exhausted both sides — pop self before further backtrack (deleteAt).
          path.pop();
          failed = true;
          break;
        }
        if(node){ node.visits = 0; }
        break;
      }

      case ExprNodeType.JOIN: {
        node = node.next;
        if(node){ node.visits = 0; }
        break;
      }

      case ExprNodeType.SPACE:
      case ExprNodeType.PUNCT:
      case ExprNodeType.ALPHA:
      case ExprNodeType.DIGIT:
      case ExprNodeType.ALNUM: {
        if(pos === len){
          return empty;
        }
        path.push(node);
        if(!charMatchesClass(node.type, input[pos])){
          // pops the just-pushed node before general backtrack.
          path.pop();
          failed = true;
          break;
        }
        pos += 1;
        node.endPos = pos;
        node = node.next;
        if(node){ node.visits = 0; }
        break;
      }

      case ExprNodeType.END: {
        if(pos === len){
          return { matched: true, substrings: buildCaptures() };
        }
        failed = true;
        break;
      }

      default:
        node = node.next;
        if(node){ node.visits = 0; }
        break;
    }

    if(failed){
      node = backtrack();
      if(!node){ return empty; }
    }
  }

  return empty;
}
