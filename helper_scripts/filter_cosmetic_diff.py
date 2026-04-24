#!/usr/bin/env python3
"""
filter_cosmetic_diff.py – Strip cosmetic-only hunks from a unified diff.

Cosmetic patterns detected and normalised away:
  - let  →  const
  - Import path changes  (../foo  →  @/foo)  and import reordering
  - console.log/warn/error  →  log.debug/info/warn/error
  - Logger infrastructure   (createScopedLogger, const log = …)
  - Unused-parameter _ prefix   (_delta  →  delta)
  - String() wrapping in arguments
  - catch(e: any)  →  catch(e: unknown) + error-wrapping expression
  - Simple return-type additions  (: void)
  - Comment / JSDoc / eslint-directive lines
  - Blank-line additions / removals
  - Compile-time-only type-alias additions  (type Foo = …)

Usage:
    python filter_cosmetic_diff.py  input.diff  output.diff
"""

import re
import sys

# ---------------------------------------------------------------------------
# Normalisation – make a line look the same whether it's the old or new form
# ---------------------------------------------------------------------------

def normalize(line: str) -> str:
    s = line

    # let → const
    s = re.sub(r'\blet\b', 'const', s)

    # Unify every logging call to a single token
    s = re.sub(r'\bconsole\.(log|warn|error|info|debug)\b', '_LOG_', s)
    s = re.sub(r'\blog\.(log|warn|error|info|debug|trace)\b', '_LOG_', s)

    # Remove String() wrapping:  String(x) → x
    s = re.sub(r'\bString\(([^)]*)\)', r'\1', s)

    # Error-wrapping idiom: x instanceof Error ? x : new Error(String(x)) → x
    s = re.sub(
        r'(\w+)\s+instanceof\s+Error\s*\?\s*\1\s*:\s*new\s+Error\([^)]*\)',
        r'\1', s,
    )

    # Import paths:  "../foo" or "./foo"  →  "@/foo"
    s = re.sub(r'''(from\s*["'])\.\.?/''', r'\1@/', s)

    # Remove single _ prefix from identifiers  (_delta → delta)
    #   negative look-behind avoids touching __dunder names
    s = re.sub(r'(?<![.\w_])_([a-zA-Z]\w*)', r'\1', s)

    # catch-clause type annotation:  catch (e: any) / catch (e: unknown) → catch(e)
    s = re.sub(r'catch\s*\(\s*(\w+)\s*:\s*\w+\s*\)', r'catch(\1)', s)

    # Return-type ": void" before { or at end-of-line
    s = re.sub(r'\)\s*:\s*void\s*\{', ') {', s)
    s = re.sub(r'\)\s*:\s*void\s*$', ')', s)

    # Normalize user-message string replacements (non-functional text):
    #   "decompilation/decompiled/decompiler" → "conversion/reconstructed/converter"
    s = re.sub(r'\bdecompilation\b', '_CONVERSION_', s)
    s = re.sub(r'\bdecompiled\b', '_RECONSTRUCTED_', s)
    s = re.sub(r'\bdecompile\b', '_RECONSTRUCT_', s)
    s = re.sub(r'\bdecompiler\b', '_CONVERTER_', s)
    #   "original game behavior" → uniform form
    s = re.sub(r'\bconversion\b', '_MSG_', s)

    # Collapse whitespace so indentation shifts don't matter
    s = re.sub(r'\s+', ' ', s.strip())
    return s


def strip_comments_in_lines(lines: list[str]) -> list[str]:
    cleaned: list[str] = []
    in_block = False

    for line in lines:
        out_chars: list[str] = []
        i = 0
        n = len(line)
        in_single = False
        in_double = False
        in_template = False
        escape = False

        while i < n:
            ch = line[i]
            nxt = line[i + 1] if i + 1 < n else ''

            if in_block:
                if ch == '*' and nxt == '/':
                    in_block = False
                    i += 2
                else:
                    i += 1
                continue

            if in_single:
                out_chars.append(ch)
                if escape:
                    escape = False
                elif ch == '\\':
                    escape = True
                elif ch == "'":
                    in_single = False
                i += 1
                continue

            if in_double:
                out_chars.append(ch)
                if escape:
                    escape = False
                elif ch == '\\':
                    escape = True
                elif ch == '"':
                    in_double = False
                i += 1
                continue

            if in_template:
                out_chars.append(ch)
                if escape:
                    escape = False
                elif ch == '\\':
                    escape = True
                elif ch == '`':
                    in_template = False
                i += 1
                continue

            if ch == '/' and nxt == '/':
                break
            if ch == '/' and nxt == '*':
                in_block = True
                i += 2
                continue

            if ch == "'":
                in_single = True
                out_chars.append(ch)
                i += 1
                continue
            if ch == '"':
                in_double = True
                out_chars.append(ch)
                i += 1
                continue
            if ch == '`':
                in_template = True
                out_chars.append(ch)
                i += 1
                continue

            out_chars.append(ch)
            i += 1

        cleaned.append(''.join(out_chars))

    return cleaned


# ---------------------------------------------------------------------------
# Standalone cosmetic lines (can appear as pure additions / removals)
# ---------------------------------------------------------------------------

def is_cosmetic_standalone(line: str) -> bool:
    s = line.strip()
    if not s:
        return True
    # Comments / JSDoc
    if s.startswith('//') or s.startswith('/*') or s.startswith('*') or s.startswith('*/') or s.startswith('/**'):
        return True
    # eslint directives
    if 'eslint-disable' in s:
        return True
    # Logger infrastructure
    if 'createScopedLogger' in s:
        return True
    if re.match(r'^const\s+log\s*=', s):
        return True
    # Import lines (path-only or reorder changes)
    if re.match(r'^import[\s{]', s):
        return True
    # Compile-time type-alias definition
    if re.match(r'^type\s+\w+', s) and '=' in s:
        return True
    # Comment-like output string text changes
    if re.match(r"^lines\.push\(\s*['\"]//", s):
        return True
    if re.match(r"^return\s*[`'\"]//", s):
        return True
    return False


# ---------------------------------------------------------------------------
# Decide whether every change in a hunk is cosmetic
# ---------------------------------------------------------------------------

def hunk_is_cosmetic(hunk_body: list) -> bool:
    removed = []
    added   = []
    for raw in hunk_body:
        line = raw.rstrip('\n\r')
        if line.startswith('-'):
            removed.append(line[1:])
        elif line.startswith('+'):
            added.append(line[1:])
        # context lines and "\ No newline …" are ignored

    # Nothing changed → cosmetic (degenerate hunk)
    if not removed and not added:
        return True

    # Strip comments (including multiline block comments) before evaluating cosmetic content
    removed_no_comments = strip_comments_in_lines(removed)
    added_no_comments = strip_comments_in_lines(added)

    # Drop lines that are independently cosmetic
    real_removed = [l for l in removed_no_comments if not is_cosmetic_standalone(l)]
    real_added   = [l for l in added_no_comments   if not is_cosmetic_standalone(l)]

    # Every line was standalone-cosmetic
    if not real_removed and not real_added:
        return True

    # Structural mismatch → real change
    if len(real_removed) != len(real_added):
        return False

    # Pair up and compare after normalisation
    for r, a in zip(real_removed, real_added):
        if normalize(r) != normalize(a):
            return False
    return True


# ---------------------------------------------------------------------------
# Main driver – parse / filter / write
# ---------------------------------------------------------------------------

def process_diff(inpath: str, outpath_logic: str, outpath_cosmetic: str) -> dict:
    with open(inpath, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()

    logic_result: list[str] = []
    cosmetic_result: list[str] = []
    i, n = 0, len(lines)
    total_hunks = filt_hunks = total_files = filt_files = 0

    while i < n:
        # Pass through any leading / inter-file text that is not a diff header
        if not lines[i].startswith('diff --git'):
            logic_result.append(lines[i])
            cosmetic_result.append(lines[i])
            i += 1
            continue

        # ---- collect file header (diff --git … --- … +++ …) ----
        file_hdr: list[str] = []
        while i < n and not lines[i].startswith('@@'):
            file_hdr.append(lines[i])
            i += 1
            if i < n and lines[i].startswith('diff --git'):
                break  # binary or mode-only file, no hunks

        total_files += 1
        had_hunks = False
        kept_hunks: list[tuple[str, list[str]]] = []
        cosmetic_hunks: list[tuple[str, list[str]]] = []

        # ---- collect hunks ----
        while i < n and not lines[i].startswith('diff --git'):
            if lines[i].startswith('@@'):
                had_hunks = True
                hdr = lines[i]
                body: list[str] = []
                i += 1
                while (i < n
                       and not lines[i].startswith('@@')
                       and not lines[i].startswith('diff --git')):
                    body.append(lines[i])
                    i += 1
                total_hunks += 1
                if hunk_is_cosmetic(body):
                    filt_hunks += 1
                    cosmetic_hunks.append((hdr, body))
                else:
                    kept_hunks.append((hdr, body))
            else:
                i += 1

        # ---- emit logic changes ----
        if kept_hunks:
            logic_result.extend(file_hdr)
            for h, b in kept_hunks:
                logic_result.append(h)
                logic_result.extend(b)
        elif not had_hunks:
            # binary / mode-only change – always keep
            logic_result.extend(file_hdr)

        # ---- emit cosmetic changes ----
        if cosmetic_hunks:
            cosmetic_result.extend(file_hdr)
            for h, b in cosmetic_hunks:
                cosmetic_result.append(h)
                cosmetic_result.extend(b)
        elif had_hunks and not cosmetic_hunks and not kept_hunks:
            # file is entirely cosmetic
            filt_files += 1
            cosmetic_result.extend(file_hdr)

    with open(outpath_logic, 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(logic_result)
    with open(outpath_cosmetic, 'w', encoding='utf-8', newline='\n') as f:
        f.writelines(cosmetic_result)

    return {
        'total_files':    total_files,
        'filtered_files': filt_files,
        'kept_files':     total_files - filt_files,
        'total_hunks':    total_hunks,
        'filtered_hunks': filt_hunks,
        'kept_hunks':     total_hunks - filt_hunks,
    }


if __name__ == '__main__':
    if len(sys.argv) < 2 or len(sys.argv) > 4:
        print(f"Usage: {sys.argv[0]} input.diff [output_logic.diff] [output_cosmetic.diff]", file=sys.stderr)
        print(f"       If outputs not specified, they default to:", file=sys.stderr)
        print(f"         - input_logic.diff (logic changes only)", file=sys.stderr)
        print(f"         - input_cosmetic.diff (filtered cosmetic changes)", file=sys.stderr)
        sys.exit(1)
    
    inpath = sys.argv[1]
    
    # Generate default output paths based on input filename
    if len(sys.argv) == 2:
        base = inpath.rsplit('.', 1)[0] if '.' in inpath else inpath
        outpath_logic = f"{base}_logic.diff"
        outpath_cosmetic = f"{base}_cosmetic.diff"
    elif len(sys.argv) == 3:
        outpath_logic = sys.argv[2]
        base = inpath.rsplit('.', 1)[0] if '.' in inpath else inpath
        outpath_cosmetic = f"{base}_cosmetic.diff"
    else:
        outpath_logic = sys.argv[2]
        outpath_cosmetic = sys.argv[3]
    
    stats = process_diff(inpath, outpath_logic, outpath_cosmetic)
    print(f"Files: {stats['total_files']} total, "
          f"{stats['filtered_files']} fully-cosmetic removed, "
          f"{stats['kept_files']} kept")
    print(f"Hunks: {stats['total_hunks']} total, "
          f"{stats['filtered_hunks']} cosmetic removed, "
          f"{stats['kept_hunks']} kept")
    print(f"\nOutput files:")
    print(f"  Logic-only changes: {outpath_logic}")
    print(f"  Cosmetic-only changes: {outpath_cosmetic}")
