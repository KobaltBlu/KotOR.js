/**
 * Shared per-tick wall-clock budget for path planning (DFS / traverse).
 * Reset once at the start of AIScheduler.update so all movers share one slice.
 *
 * @file path-plan-budget.ts
 */

/** Total path-planning wall-clock budget per tick (ms). */
export const PATH_PLAN_BUDGET_MS = 4;

/** Cap passed into a single ComputedPath.search / DFS call (ms). */
export const PATH_PLAN_SEARCH_SLICE_MS = 3;

let deadlineMs = 0;

/** Arm a fresh budget window for the current tick. */
export function resetPathPlanBudget(): void {
  deadlineMs = performance.now() + PATH_PLAN_BUDGET_MS;
}

/** Remaining ms in the tick budget (0 when exhausted). */
export function pathPlanBudgetRemainingMs(): number {
  return Math.max(0, deadlineMs - performance.now());
}

/** True when the shared tick budget is spent. */
export function isPathPlanBudgetExhausted(): boolean {
  return performance.now() >= deadlineMs;
}

/**
 * Budget to pass into one path search — min(remaining, search slice).
 * Returns 0 when exhausted (caller should treat as Incomplete / skip).
 */
export function takePathPlanSearchBudgetMs(): number {
  return Math.min(PATH_PLAN_SEARCH_SLICE_MS, pathPlanBudgetRemainingMs());
}
