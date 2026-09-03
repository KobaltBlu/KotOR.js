import React, { HTMLAttributes } from "react";

export interface ForgeButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  size?: string;
}

export const ForgeButtonGroup = function ForgeButtonGroup({ className = "", size: _size, ...rest }: ForgeButtonGroupProps) {
  return <div className={`forge-btn-group ${className}`.trim()} role="group" {...rest} />;
};
