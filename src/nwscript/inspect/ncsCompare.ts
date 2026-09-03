/**
 * Instruction-level compare of two NCS inspections.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ncsCompare.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { NcsInspectedInstruction, NcsInspection } from "@/nwscript/inspect/ncsInspection";

export type NcsCompareChangeKind = "equal" | "added" | "removed" | "changed";

export interface NcsCompareRow {
  kind: NcsCompareChangeKind;
  left?: NcsInspectedInstruction;
  right?: NcsInspectedInstruction;
}

function instructionSignature(instr: NcsInspectedInstruction): string {
  return [
    instr.opcode.toString(16),
    instr.aux.toString(16),
    instr.size.toString(),
    instr.actionId ?? "",
    instr.argCount ?? "",
    ...instr.parts.map((part) => `${part.kind}:${String(part.value ?? "")}`),
  ].join("|");
}

function lcsIndexPairs(a: string[], b: string[]): Array<{ a: number; b: number }> {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const pairs: Array<{ a: number; b: number }> = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      pairs.push({ a: i - 1, b: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  pairs.reverse();
  return pairs;
}

function zipCompare(
  left: NcsInspectedInstruction[],
  right: NcsInspectedInstruction[],
): NcsCompareRow[] {
  const rows: NcsCompareRow[] = [];
  const n = Math.max(left.length, right.length);
  for (let i = 0; i < n; i++) {
    const l = left[i];
    const r = right[i];
    if (l && r) {
      rows.push({
        kind: instructionSignature(l) === instructionSignature(r) ? "equal" : "changed",
        left: l,
        right: r,
      });
    } else if (l) {
      rows.push({ kind: "removed", left: l });
    } else {
      rows.push({ kind: "added", right: r });
    }
  }
  return rows;
}

function coalesceChanged(rows: NcsCompareRow[]): NcsCompareRow[] {
  const out: NcsCompareRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const cur = rows[i];
    const next = rows[i + 1];
    if (cur.kind === "removed" && next?.kind === "added") {
      out.push({ kind: "changed", left: cur.left, right: next.right });
      i++;
    } else {
      out.push(cur);
    }
  }
  return out;
}

/** Compare two inspections at instruction granularity. */
export function compareNcsInspections(left: NcsInspection, right: NcsInspection): NcsCompareRow[] {
  const a = left.instructions;
  const b = right.instructions;
  if (!a.length && !b.length) {
    return [];
  }
  if (a.length * b.length > 2_000_000) {
    return zipCompare(a, b);
  }

  const matched = lcsIndexPairs(a.map(instructionSignature), b.map(instructionSignature));
  const rows: NcsCompareRow[] = [];
  let i = 0;
  let j = 0;
  for (const pair of matched) {
    while (i < pair.a) {
      rows.push({ kind: "removed", left: a[i++] });
    }
    while (j < pair.b) {
      rows.push({ kind: "added", right: b[j++] });
    }
    rows.push({ kind: "equal", left: a[i++], right: b[j++] });
  }
  while (i < a.length) {
    rows.push({ kind: "removed", left: a[i++] });
  }
  while (j < b.length) {
    rows.push({ kind: "added", right: b[j++] });
  }
  return coalesceChanged(rows);
}

export function compareNcsCounts(rows: NcsCompareRow[]): { added: number; removed: number; changed: number; equal: number } {
  const counts = { added: 0, removed: 0, changed: 0, equal: 0 };
  for (const row of rows) {
    counts[row.kind]++;
  }
  return counts;
}
