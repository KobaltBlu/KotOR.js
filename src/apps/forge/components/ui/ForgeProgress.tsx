import React, { HTMLAttributes } from "react";

export interface ForgeProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  label?: React.ReactNode;
  animated?: boolean;
  striped?: boolean;
}

export const ForgeProgress = function ForgeProgress({
  value = 0,
  label,
  className = "",
  animated,
  striped,
  ...rest
}: ForgeProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`forge-progress ${striped ? "forge-progress--striped" : ""} ${animated ? "forge-progress--animated" : ""} ${className}`.trim()}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...rest}
    >
      <div className="forge-progress__bar" style={{ width: `${clamped}%` }} />
      {label ? <span className="forge-progress__label">{label}</span> : null}
    </div>
  );
};
