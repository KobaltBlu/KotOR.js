# NWScript OR Chain Detector: setGlobalVariables/setLocalVariables

## Overview

The NWScript decompiler detects OR chain patterns (e.g. `GetGlobalBoolean("X") || GetGlobalBoolean("Y")`) and simplifies them. The OR chain detector uses `NWScriptExpressionBuilder` to process bytecode instructions; the expression builder needs global and local variable mappings to emit symbolic names (e.g. `K_PAZAAK_WON`) instead of raw calls (e.g. `GetGlobalBoolean(123)`).

## Note (original game vs. KotOR.js)

The original game client runs compiled NWScript bytecode only; it does not ship a script-to-source tool. NCS-to-NSS reconstruction in KotOR.js is an editor/debugging feature. This implementation mirrors the existing `NWScriptANDChainDetector` pattern, which already uses `setGlobalVariables` and `setLocalVariables` for correct variable name resolution.

## KotOR.js Implementation

- **NWScriptANDChainDetector**: Already has `setGlobalVariables`, `setLocalVariables`; passes them to its internal `exprBuilder` so GetGlobalBoolean/GetLocalInt etc. resolve to names.
- **NWScriptORChainDetector**: Previously had only `setFunctionParameters`; the internal `exprBuilder` in `analyzeORChainPattern` did not receive global/local mappings, so OR chains involving global/local variables were not properly named.
- **Fix**: Add `setGlobalVariables` and `setLocalVariables` to `NWScriptORChainDetector`, store them, and pass them to the `exprBuilder` before processing instructions—matching the AND chain detector.
