## Summary
This PR applies a broad lint/type-safety hardening pass across KotOR.js and Forge codepaths.

### Primary purpose
- Reduce unsafe typing patterns flagged by TypeScript ESLint (especially `no-unsafe-*` families).
- Replace loosely typed error handling with explicit `unknown` catch parameters and safer narrowing patterns.
- Add/propagate stronger explicit types in hotspots where implicit/`any`-like flows surfaced.

### Secondary refactors included in the same pass
- Normalize import paths toward alias-based `@/` imports for consistency.
- Standardize logging to scoped logger usage (`createScopedLogger`) and remove ad-hoc console-style usage.
- Apply lint-driven cleanup changes (unused parameter prefixing like `_delta`, minor `const`/signature tidy-ups).

## Scope notes
- Large mechanical refactor touching many files across `src/actions`, `src/apps/forge`, engine/runtime, and related utilities.
- Intent is code health and static-safety improvement; behavior changes are not the goal.

## Validation
- Updated from generated diff artifacts and reviewed for dominant change patterns in this branch.
- Main risk is regression from broad churn; recommended follow-up is targeted smoke checks in Forge editors and core runtime flows.
