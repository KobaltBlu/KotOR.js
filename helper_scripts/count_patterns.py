import re, sys
text = open(sys.argv[1], encoding='utf-8', errors='replace').read()
print('log_adds:', len(re.findall(r'^\+\s*log\.(trace|debug|info|warn|error)\(', text, re.MULTILINE)))
print('alias_imports:', len(re.findall(r'^\+import.+@/', text, re.MULTILINE)))
print('any_removals:', len(re.findall(r'^-.*: any\b', text, re.MULTILINE)))
print('config_files:', len(re.findall(r'^diff --git.*(tsconfig|webpack\.config|jest\.config|package\.json)', text, re.MULTILINE)))
print('total_file_diffs:', len(re.findall(r'^diff --git ', text, re.MULTILINE)))
