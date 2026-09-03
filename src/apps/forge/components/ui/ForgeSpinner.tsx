import React, { HTMLAttributes } from "react";

export interface ForgeSpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md";
  animation?: string;
}

export const ForgeSpinner = function ForgeSpinner({ size = "md", animation: _animation, className = "", ...rest }: ForgeSpinnerProps) {
  return (
    <span
      className={`forge-spinner forge-spinner--${size} ${className}`.trim()}
      role="status"
      aria-label="Loading"
      {...rest}
    />
  );
};
