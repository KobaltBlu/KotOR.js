/**
 * Numeric 2DA index field: labeled select when options exist, otherwise a GFF-style number input.
 *
 * @file UtcRuleIndexField.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";

export interface UtcRuleIndexOption {
  id: number;
  label: string;
}

export interface UtcRuleIndexFieldProps {
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  options: UtcRuleIndexOption[];
  emptyTitle: string;
}

export function UtcRuleIndexField(props: UtcRuleIndexFieldProps) {
  if (!props.options.length) {
    return (
      <input
        type="number"
        min={0}
        className="form-select"
        value={Number.isFinite(props.value) ? props.value : 0}
        title={props.emptyTitle}
        onChange={props.onChange}
      />
    );
  }
  return (
    <select className="form-select" value={props.value} onChange={props.onChange}>
      {props.options.map((option) => (
        <option key={option.id} value={option.id}>{option.label}</option>
      ))}
    </select>
  );
}
