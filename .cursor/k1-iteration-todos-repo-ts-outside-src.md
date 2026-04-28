# K1 plan — TypeScript **outside** `src/` (repo satellite)

**Not** part of the **1490** [k1-iteration-todos-exhaustive.md](k1-iteration-todos-exhaustive.md) rows. The game client reference binary does not apply line-by-line; treat as **editor / LSP / tooling** unless you document a specific NWScript or data-path contract.

**Regenerate:** `python .cursor/scripts/regenerate_repo_ts_outside_src_checklist.py`

**Verify:** `python .cursor/scripts/diff_repo_ts_outside_src.py` (exit 0)

---

- [ ] EXT-0001: `completion-provider.ts` (`extensions/kotor-forge-vscode/server/src/completion-provider.ts`)
- [ ] EXT-0002: `diagnostic-provider.ts` (`extensions/kotor-forge-vscode/server/src/diagnostic-provider.ts`)
- [ ] EXT-0003: `expression-evaluator.ts` (`extensions/kotor-forge-vscode/server/src/expression-evaluator.ts`)
- [ ] EXT-0004: `game-version-detector.ts` (`extensions/kotor-forge-vscode/server/src/game-version-detector.ts`)
- [ ] EXT-0005: `interpreter.ts` (`extensions/kotor-forge-vscode/server/src/interpreter.ts`)
- [ ] EXT-0006: `kotor-definitions.ts` (`extensions/kotor-forge-vscode/server/src/kotor-definitions.ts`)
- [ ] EXT-0007: `kotor-scriptlib.ts` (`extensions/kotor-forge-vscode/server/src/kotor-scriptlib.ts`)
- [ ] EXT-0008: `kotor-validator.ts` (`extensions/kotor-forge-vscode/server/src/kotor-validator.ts`)
- [ ] EXT-0009: `logger.ts` (`extensions/kotor-forge-vscode/server/src/logger.ts`)
- [ ] EXT-0010: `nwscript-ast.ts` (`extensions/kotor-forge-vscode/server/src/nwscript-ast.ts`)
- [ ] EXT-0011: `nwscript-lexer.ts` (`extensions/kotor-forge-vscode/server/src/nwscript-lexer.ts`)
- [ ] EXT-0012: `nwscript-parser.ts` (`extensions/kotor-forge-vscode/server/src/nwscript-parser.ts`)
- [ ] EXT-0013: `nwscript-runtime.ts` (`extensions/kotor-forge-vscode/server/src/nwscript-runtime.ts`)
- [ ] EXT-0014: `semantic-analyzer.ts` (`extensions/kotor-forge-vscode/server/src/semantic-analyzer.ts`)
- [ ] EXT-0015: `server.ts` (`extensions/kotor-forge-vscode/server/src/server.ts`)
- [ ] EXT-0016: `syntax-validator.ts` (`extensions/kotor-forge-vscode/server/src/syntax-validator.ts`)
- [ ] EXT-0017: `type-checker.ts` (`extensions/kotor-forge-vscode/server/src/type-checker.ts`)
- [ ] EXT-0018: `variable-tracker.ts` (`extensions/kotor-forge-vscode/server/src/variable-tracker.ts`)
- [ ] EXT-0019: `runner.ts` (`extensions/kotor-forge-vscode/server/test/runner.ts`)
- [ ] EXT-0020: `extension.ts` (`extensions/kotor-forge-vscode/src/extension.ts`)
- [ ] EXT-0021: `KotorDocument.ts` (`extensions/kotor-forge-vscode/src/KotorDocument.ts`)
- [ ] EXT-0022: `kotorTaskProvider.ts` (`extensions/kotor-forge-vscode/src/kotorTaskProvider.ts`)
- [ ] EXT-0023: `kotorTreeView.ts` (`extensions/kotor-forge-vscode/src/kotorTreeView.ts`)
- [ ] EXT-0024: `logger.ts` (`extensions/kotor-forge-vscode/src/logger.ts`)
- [ ] EXT-0025: `client.ts` (`extensions/kotor-forge-vscode/src/lsp/client.ts`)
- [ ] EXT-0026: `debugAdapter.ts` (`extensions/kotor-forge-vscode/src/lsp/debugAdapter.ts`)
- [ ] EXT-0027: `nwscriptFormat.ts` (`extensions/kotor-forge-vscode/src/nwscriptFormat.ts`)
- [ ] EXT-0028: `BaseKotorEditorProvider.ts` (`extensions/kotor-forge-vscode/src/providers/BaseKotorEditorProvider.ts`)
- [ ] EXT-0029: `KotorForgeProvider.ts` (`extensions/kotor-forge-vscode/src/providers/KotorForgeProvider.ts`)
- [ ] EXT-0030: `statusBar.ts` (`extensions/kotor-forge-vscode/src/statusBar.ts`)
- [ ] EXT-0031: `forgeEditorRegistry.ts` (`extensions/kotor-forge-vscode/src/webview/forgeEditorRegistry.ts`)
- [ ] EXT-0032: `ForgeWebviewAdapter.ts` (`extensions/kotor-forge-vscode/src/webview/ForgeWebviewAdapter.ts`)
- [ ] EXT-0033: `index.tsx` (`extensions/kotor-forge-vscode/src/webview/index.tsx`)
- [ ] EXT-0034: `vscode.d.ts` (`extensions/kotor-forge-vscode/src/webview/vscode.d.ts`)
- [ ] EXT-0035: `WebviewApp.tsx` (`extensions/kotor-forge-vscode/src/webview/WebviewApp.tsx`)
- [ ] EXT-0036: `WebviewBridge.ts` (`extensions/kotor-forge-vscode/src/webview/WebviewBridge.ts`)

---
**Total:** 36 (all `.ts` / `.tsx` not under `src/`)
