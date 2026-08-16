/**
 * Compact GFF LIST editor: labeled number columns plus add/remove rows.
 *
 * @file UtcGffStructList.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import { ForgeButton, ForgeInput } from "@/apps/forge/components/ui";
import "@/apps/forge/components/tabs/tab-utc-editor/UtcGffStructList.scss";

export interface UtcGffNumberColumn<K extends string = string> {
  key: K;
  label: string;
  min?: number;
}

export interface UtcGffStructListProps<T extends Record<string, number>> {
  columns: UtcGffNumberColumn<Extract<keyof T, string>>[];
  rows: T[];
  createRow: () => T;
  onChange: (rows: T[]) => void;
  listLabel?: string;
  addLabel?: string;
}

export function UtcGffStructList<T extends Record<string, number>>(props: UtcGffStructListProps<T>) {
  const onFieldChange = (rowIndex: number, key: Extract<keyof T, string>, raw: string) => {
    const next = props.rows.map((row, index) => {
      if (index !== rowIndex) {
        return row;
      }
      return {
        ...row,
        [key]: parseInt(raw, 10) || 0,
      };
    });
    props.onChange(next);
  };

  const onRemove = (rowIndex: number) => {
    props.onChange(props.rows.filter((_, index) => index !== rowIndex));
  };

  const onAdd = () => {
    props.onChange(props.rows.concat(props.createRow()));
  };

  return (
    <div className="utc-gff-list">
      {props.listLabel ? <div className="utc-gff-list__caption">{props.listLabel}</div> : null}
      <table className="utc-gff-list__table">
        <thead>
          <tr>
            <th className="utc-gff-list__index">#</th>
            {props.columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            <th className="utc-gff-list__actions" />
          </tr>
        </thead>
        <tbody>
          {props.rows.length ? (
            props.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="utc-gff-list__index">{rowIndex}</td>
                {props.columns.map((column) => (
                  <td key={column.key}>
                    <ForgeInput
                      type="number"
                      min={column.min ?? 0}
                      value={row[column.key] ?? 0}
                      aria-label={`${column.label} ${rowIndex}`}
                      onChange={(e) => onFieldChange(rowIndex, column.key, e.target.value)}
                    />
                  </td>
                ))}
                <td className="utc-gff-list__actions">
                  <ForgeButton size="sm" variant="ghost" onClick={() => onRemove(rowIndex)}>
                    Remove
                  </ForgeButton>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={props.columns.length + 2} className="utc-gff-list__empty">
                No structs. Add a LIST entry to match the GFF field.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <ForgeButton size="sm" variant="secondary" onClick={onAdd}>
        {props.addLabel || "Add"}
      </ForgeButton>
    </div>
  );
}
