/**
 * Inline 2DA row picker for Forge inspectors.
 *
 * @file ForgeTwoDAIndexField.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React, { useMemo, useState } from "react";
import * as KotORNs from "@/apps/forge/KotOR";
import { ForgeInput } from "./ForgeInput";
import { ForgeSelect } from "./ForgeSelect";
import {
  TWO_DA_FILTER_THRESHOLD,
  listTwoDAIndexOptions,
  twoDATableHasRows,
  type TwoDAIndexSentinel,
  type TwoDALike,
} from "@/apps/forge/helpers/twoDAIndexOptions";
import "@/apps/forge/components/ui/ForgeTwoDAIndexField.scss";

export interface ForgeTwoDAIndexFieldProps {
  table: string;
  value: number;
  onChange: (value: number) => void;
  labelColumn?: string;
  sentinels?: TwoDAIndexSentinel[];
  emptyLabel?: string;
}

function liveTwoDATable(table: string): TwoDALike | undefined {
  const KotOR = (globalThis as any).KotOR ?? KotORNs;
  const datatables = KotOR?.TwoDAManager?.datatables;
  if (!datatables || typeof datatables.get !== "function") {
    return undefined;
  }
  return datatables.get(table.toLowerCase()) as TwoDALike | undefined;
}

export function ForgeTwoDAIndexField(props: ForgeTwoDAIndexFieldProps) {
  const [filter, setFilter] = useState("");
  const table = liveTwoDATable(props.table);
  const hasRows = twoDATableHasRows(table);
  const rowCount = table?.RowCount ?? (table?.rows ? Object.keys(table.rows).length : 0);
  const showFilter = hasRows && rowCount >= TWO_DA_FILTER_THRESHOLD;

  const options = useMemo(() => {
    if (!hasRows) {
      return [];
    }
    return listTwoDAIndexOptions(table, {
      currentValue: props.value,
      sentinels: props.sentinels,
      labelColumn: props.labelColumn,
      filter: showFilter ? filter : "",
    });
  }, [filter, hasRows, props.labelColumn, props.sentinels, props.value, showFilter, table]);

  if (!hasRows) {
    return (
      <ForgeInput
        type="number"
        step={1}
        value={Number.isFinite(props.value) ? props.value : 0}
        title={props.emptyLabel || `${props.table}.2da not loaded`}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    );
  }

  return (
    <div className="forge-twoda-field">
      {showFilter ? (
        <ForgeInput
          className="forge-twoda-field__filter"
          type="search"
          placeholder={`Filter ${props.table}.2da\u2026`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label={`Filter ${props.table}`}
        />
      ) : null}
      <ForgeSelect
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        aria-label={props.table}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </ForgeSelect>
    </div>
  );
}
