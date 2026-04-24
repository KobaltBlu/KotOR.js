import sys
from pathlib import Path

p = Path(sys.argv[1])
lines = p.read_text(encoding='utf-8', errors='replace').splitlines()

state = 'start'  # start|file_header|hunks
issues = []
file_count = 0
hunk_count = 0

for i, line in enumerate(lines, start=1):
    if line.startswith('diff --git '):
        state = 'file_header'
        file_count += 1
        continue

    if state == 'start':
        if line.strip() == '':
            continue
        issues.append((i, line[:200]))
        continue

    if state == 'file_header':
        if line.startswith(('index ', 'new file mode ', 'deleted file mode ', 'similarity index ', 'rename from ', 'rename to ', 'old mode ', 'new mode ', '--- ', '+++ ')):
            continue
        if line.startswith('@@ '):
            state = 'hunks'
            hunk_count += 1
            continue
        if line.strip() == '':
            continue
        if line.startswith('diff --git '):
            state = 'file_header'
            file_count += 1
            continue
        issues.append((i, line[:200]))
        continue

    if state == 'hunks':
        if line.startswith('@@ '):
            hunk_count += 1
            continue
        if line.startswith((' ', '+', '-', '\\ No newline at end of file')):
            continue
        if line.startswith('diff --git '):
            state = 'file_header'
            file_count += 1
            continue
        if line.strip() == '':
            # blank context lines in hunks should start with space, so this is suspicious
            issues.append((i, '<blank line without prefix in hunk>'))
            continue
        issues.append((i, line[:200]))

print(f'files={file_count} hunks={hunk_count} issues={len(issues)}')
for ln, txt in issues[:50]:
    print(f'{ln}: {txt}')
if len(issues) > 50:
    print(f'... {len(issues)-50} more')
