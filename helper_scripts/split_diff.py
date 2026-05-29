#!/usr/bin/env python3
"""
Split a unified diff into cosmetic-only and logic-only portions.

Cosmetic changes:
  - Import path rewrites  (relative → @/ alias, or vice versa, or reorder)
  - `any` → concrete type replacements  (param: any → param: Type)
  - Type annotation additions  (: Type added, `as Type`, interface casts)
  - let → const
  - Whitespace / formatting (trailing space, blank lines, newline-at-EOF)
  - Logging additions  (createScopedLogger, log.trace/debug/info/warn/error)
  - Unused-param underscore prefix  (param → _param)
  - eslint-disable / eslint-enable comments
  - Comment-only changes (added/removed/changed comments)
  - Config plumbing that enables the above (@/ alias in webpack/tsconfig/jest, new deps for logging/types)
  - Pure property/key reordering in JSON-like configs
  - `console.*` → `log.*` replacements
  - Semicolon additions/removals
  - Removing empty constructors
  - Adding `override` keyword

Logic changes:
  - New files with real implementation (not just re-exports or type stubs)
  - New test files
  - Changed control flow, new methods, removed methods with behavior
  - Anything that changes runtime behavior beyond type narrowing
"""

import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def strip_diff_prefix(line: str) -> str:
    """Remove leading +/- from a diff line to get raw content."""
    if line.startswith(('+', '-')) and not line.startswith(('+++', '---')):
        return line[1:]
    return line


def normalize_ws(s: str) -> str:
    """Collapse all whitespace for comparison."""
    return re.sub(r'\s+', ' ', s).strip()


def is_blank(raw: str) -> bool:
    return raw.strip() == ''


def is_comment_line(raw: str) -> bool:
    s = raw.strip()
    return (s.startswith('//') or s.startswith('/*') or s.startswith('*') or
            s.startswith('#') or s == '*/')


def is_import_line(raw: str) -> bool:
    s = raw.strip()
    return bool(re.match(r'^(import\s|export\s+\*\s+from\s|export\s+\{)', s))


def is_log_line(raw: str) -> bool:
    s = raw.strip()
    return bool(re.match(r'(const\s+log\s*=\s*createScopedLogger|log\.(trace|debug|info|warn|error)\()', s))


def is_logger_import(raw: str) -> bool:
    s = raw.strip()
    return 'createScopedLogger' in s or 'LogScope' in s


def is_eslint_comment(raw: str) -> bool:
    s = raw.strip()
    return 'eslint-disable' in s or 'eslint-enable' in s


# Files whose entire diff is cosmetic infrastructure
COSMETIC_CONFIG_FILES = {
    'webpack.config.js',
    'tsconfig.json',
    'tsconfig.electron.json',
    'tsconfig.forge.json',
    'tsconfig.game.json',
    'tsconfig.launcher.json',
    'tsconfig.debugger.json',
    'tsconfig.eslint.json',
    'tsconfig.webview.json',
    'tsconfig.kotorjs.json',
    'jest.config.js',
    '.eslintrc.json',
    '.eslintrc.js',
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint-errors.json',
    'README.md',
}

# New files that are purely logic (tests, new implementations)
# Will be detected heuristically below


def file_is_cosmetic_config(path: str) -> bool:
    base = path.split('/')[-1] if '/' in path else path
    return base in COSMETIC_CONFIG_FILES


# ---------------------------------------------------------------------------
# Hunk-level classification
# ---------------------------------------------------------------------------

def classify_hunk_lines(removed_lines: list[str], added_lines: list[str], file_path: str) -> str:
    """
    Classify a set of removed/added lines as 'cosmetic' or 'logic'.
    Returns 'cosmetic' or 'logic'.
    """
    # Empty hunk
    if not removed_lines and not added_lines:
        return 'cosmetic'

    # All blank line changes
    r_raw = [strip_diff_prefix(l) for l in removed_lines]
    a_raw = [strip_diff_prefix(l) for l in added_lines]

    if all(is_blank(r) for r in r_raw) and all(is_blank(a) for a in a_raw):
        return 'cosmetic'

    # Pure comment changes
    if all(is_comment_line(r) or is_blank(r) for r in r_raw) and \
       all(is_comment_line(a) or is_blank(a) for a in a_raw):
        return 'cosmetic'

    # Pure import rewrites (same symbols, different paths)
    if all(is_import_line(r) or is_blank(r) for r in r_raw) and \
       all(is_import_line(a) or is_blank(a) for a in a_raw):
        return 'cosmetic'

    # Pure logging additions (no removals, or only removing console.*)
    if not removed_lines and all(is_log_line(a) or is_logger_import(a) or is_blank(a) for a in a_raw):
        return 'cosmetic'

    # console.log → log.* replacement
    if all('console.' in strip_diff_prefix(r) for r in removed_lines if strip_diff_prefix(r).strip()) and \
       all(is_log_line(a) or is_blank(a) for a in a_raw):
        return 'cosmetic'

    # eslint-disable comment additions
    if not removed_lines and all(is_eslint_comment(a) or is_blank(a) for a in a_raw):
        return 'cosmetic'

    # For paired changes, check if they're cosmetic transformations
    if removed_lines and added_lines:
        # Normalize both sides and compare
        r_norm = [normalize_ws(strip_diff_prefix(l)) for l in removed_lines if strip_diff_prefix(l).strip()]
        a_norm = [normalize_ws(strip_diff_prefix(l)) for l in added_lines if strip_diff_prefix(l).strip()]

        # Filter out pure logging/eslint additions from added side
        a_logic = [n for n, raw in zip(a_norm, [strip_diff_prefix(l) for l in added_lines if strip_diff_prefix(l).strip()])
                    if not is_log_line(raw) and not is_logger_import(raw) and not is_eslint_comment(raw) and not is_blank(raw)]
        r_logic = [n for n in r_norm if n]

        # If after filtering log/eslint additions, both sides match → cosmetic
        if r_logic == a_logic:
            return 'cosmetic'

        # Check for type-only changes (any→Type, added annotations, let→const, _prefix)
        if len(r_logic) == len(a_logic) and len(r_logic) > 0:
            all_cosmetic = True
            for r, a in zip(r_logic, a_logic):
                if not is_cosmetic_transform(r, a):
                    all_cosmetic = False
                    break
            if all_cosmetic:
                return 'cosmetic'

        # Check if removed is subset + added has only cosmetic extras
        if len(a_logic) > len(r_logic):
            # Extra lines are all logging/type/cosmetic
            pass  # Fall through to logic

    return 'logic'


def is_cosmetic_transform(removed_norm: str, added_norm: str) -> bool:
    """Check if a single normalized line change is purely cosmetic."""
    if removed_norm == added_norm:
        return True

    # let → const
    if removed_norm.replace('let ', 'const ') == added_norm:
        return True
    if re.sub(r'\blet\b', 'const', removed_norm) == added_norm:
        return True

    # any → specific type  (e.g. "param: any" → "param: Type")
    r_no_any = re.sub(r':\s*any\b', ': TYPE', removed_norm)
    a_no_type = re.sub(r':\s*\S+', ': TYPE', added_norm)
    # More nuanced: strip all type annotations and compare structure
    r_stripped = strip_types(removed_norm)
    a_stripped = strip_types(added_norm)
    if r_stripped == a_stripped:
        return True

    # Unused param prefix: param → _param
    r_under = re.sub(r'\b(\w)', r'_\1', removed_norm)  # too aggressive, try specific
    if re.sub(r'\b(anim|e|fl|faces)\b', lambda m: '_' + m.group(1), removed_norm) == added_norm:
        return True
    # Generic: only difference is _ prefix on identifiers
    if re.sub(r'\b_(\w+)\b', r'\1', added_norm) == re.sub(r'\b_(\w+)\b', r'\1', removed_norm):
        # But also check that the rest is the same structure
        pass

    # Type cast additions: (x as any) → (x as Type) or adding `as Type`
    r_no_cast = re.sub(r'\s+as\s+\w[\w.<>\[\]|&{},\s]*', '', removed_norm)
    a_no_cast = re.sub(r'\s+as\s+\w[\w.<>\[\]|&{},\s]*', '', added_norm)
    if r_no_cast == a_no_cast:
        return True

    # Semicolon addition/removal
    if removed_norm.rstrip(';') == added_norm.rstrip(';'):
        return True

    # override keyword addition
    if 'override ' + removed_norm == added_norm or removed_norm.replace('override ', '') == added_norm.replace('override ', ''):
        return True

    # console.xxx → log.xxx
    if re.sub(r'console\.(log|error|warn|debug|info)', r'log.\1', removed_norm) == added_norm:
        return True

    return False


def strip_types(s: str) -> str:
    """Strip type annotations for structural comparison."""
    # Remove `: Type` patterns
    s = re.sub(r':\s*[\w<>\[\]|&{},.\s\'"]+(?=[,)\]=;{]|$)', '', s)
    # Remove `as Type` casts
    s = re.sub(r'\s+as\s+[\w<>\[\]|&{},.\s]+', '', s)
    # Remove generic type params
    s = re.sub(r'<[\w,\s|&.]+>', '', s)
    return normalize_ws(s)


# ---------------------------------------------------------------------------
# File-level new-file classification
# ---------------------------------------------------------------------------

def is_new_file_cosmetic(lines: list[str], file_path: str) -> bool:
    """For entirely new files (not in upstream), decide if cosmetic or logic."""
    # Config files
    if file_is_cosmetic_config(file_path):
        return True

    # Pure re-export index files
    content_lines = [l[1:] for l in lines if l.startswith('+') and not l.startswith('+++')]
    non_blank = [l for l in content_lines if l.strip()]

    if all(re.match(r'\s*(export\s+\*\s+from|import\s)', l) for l in non_blank if l.strip()):
        return True

    # Type definition files (.d.ts)
    if file_path.endswith('.d.ts'):
        return True

    # Test files → logic (they test new logic)
    if '.test.' in file_path or '.spec.' in file_path:
        return False

    # New utility files that are only types/interfaces
    if all(re.match(r'\s*(export\s+)?(interface|type|enum|const\s+enum)\s', l) or
           is_comment_line(l) or is_blank(l) or is_import_line(l) or
           l.strip() in ('{', '}', '};', '},', '')
           for l in non_blank):
        return True

    return False


# ---------------------------------------------------------------------------
# Main diff parser and splitter
# ---------------------------------------------------------------------------

def parse_and_split(diff_text: str):
    """Parse unified diff and split into cosmetic/logic file diffs."""
    cosmetic_parts = []
    logic_parts = []

    # Split into per-file diffs
    file_diffs = re.split(r'^(diff --git )', diff_text, flags=re.MULTILINE)

    # First element is empty or preamble
    preamble = file_diffs[0]

    i = 1
    while i < len(file_diffs):
        file_header = file_diffs[i]  # "diff --git "
        file_body = file_diffs[i + 1] if i + 1 < len(file_diffs) else ''
        full_file_diff = file_header + file_body
        i += 2

        # Extract file path
        m = re.match(r'a/(\S+)\s+b/(\S+)', file_body.split('\n')[0])
        if m:
            file_path = m.group(2)
        else:
            # Try from the diff line
            file_path = 'unknown'

        # Check if entirely new file
        is_new = 'new file mode' in full_file_diff.split('@@')[0] if '@@' in full_file_diff else 'new file mode' in full_file_diff
        # Check if deleted file
        is_deleted = 'deleted file mode' in full_file_diff.split('@@')[0] if '@@' in full_file_diff else 'deleted file mode' in full_file_diff

        # Cosmetic config files → always cosmetic
        if file_is_cosmetic_config(file_path):
            cosmetic_parts.append(full_file_diff)
            continue

        # package.json is mixed - put in cosmetic (it has dep additions needed for build)
        if file_path == 'package.json':
            cosmetic_parts.append(full_file_diff)
            continue

        # New files: classify whole file
        if is_new:
            all_lines = [l for l in full_file_diff.split('\n') if l.startswith('+') and not l.startswith('+++')]
            if is_new_file_cosmetic(all_lines, file_path):
                cosmetic_parts.append(full_file_diff)
            else:
                logic_parts.append(full_file_diff)
            continue

        # Deleted files → logic (removing behavior)
        if is_deleted:
            logic_parts.append(full_file_diff)
            continue

        # For modified files: analyze hunk by hunk
        # Split into hunks
        parts = re.split(r'^(@@\s)', full_file_diff, flags=re.MULTILINE)

        file_header_part = parts[0]  # Everything before first @@

        cosmetic_hunks = []
        logic_hunks = []

        j = 1
        while j < len(parts):
            hunk_marker = parts[j]  # "@@ "
            hunk_body = parts[j + 1] if j + 1 < len(parts) else ''
            full_hunk = hunk_marker + hunk_body
            j += 2

            # Extract changed lines
            hunk_lines = full_hunk.split('\n')
            removed = [l for l in hunk_lines if l.startswith('-') and not l.startswith('---')]
            added = [l for l in hunk_lines if l.startswith('+') and not l.startswith('+++')]

            classification = classify_hunk_lines(removed, added, file_path)
            if classification == 'cosmetic':
                cosmetic_hunks.append(full_hunk)
            else:
                logic_hunks.append(full_hunk)

        # Reconstruct file diffs with only their classified hunks
        if cosmetic_hunks:
            cosmetic_file = file_header_part
            for h in cosmetic_hunks:
                cosmetic_file += '@@' + h  # Restore the @@ prefix we split on
            cosmetic_parts.append(cosmetic_file)

        if logic_hunks:
            logic_file = file_header_part
            for h in logic_hunks:
                logic_file += '@@' + h
            logic_parts.append(logic_file)

    return '\n'.join(cosmetic_parts), '\n'.join(logic_parts)


def main():
    if len(sys.argv) < 2:
        print("Usage: split_diff.py <input.diff> [cosmetic_output.diff] [logic_output.diff]")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    cosmetic_path = Path(sys.argv[2]) if len(sys.argv) > 2 else input_path.parent / 'kotorjs_vs_upstream_cosmetic_only.diff'
    logic_path = Path(sys.argv[3]) if len(sys.argv) > 3 else input_path.parent / 'kotorjs_vs_upstream_logic_only.diff'

    diff_text = input_path.read_text(encoding='utf-8', errors='replace')
    cosmetic, logic = parse_and_split(diff_text)

    cosmetic_path.write_text(cosmetic, encoding='utf-8')
    logic_path.write_text(logic, encoding='utf-8')

    # Stats
    c_files = len(re.findall(r'^diff --git ', cosmetic, re.MULTILINE))
    l_files = len(re.findall(r'^diff --git ', logic, re.MULTILINE))
    print(f"Cosmetic: {c_files} file diffs ({len(cosmetic)} bytes)")
    print(f"Logic:    {l_files} file diffs ({len(logic)} bytes)")


if __name__ == '__main__':
    main()
