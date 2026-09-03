import React, { HTMLAttributes } from "react";

export interface ForgeInputGroupProps extends HTMLAttributes<HTMLDivElement> {}

export const ForgeInputGroupText = function ForgeInputGroupText({ className = "", ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`forge-input-group__text ${className}`.trim()} {...rest} />;
};

export const ForgeInputGroup = Object.assign(
  function ForgeInputGroup({ className = "", ...rest }: ForgeInputGroupProps) {
    return <div className={`forge-input-group ${className}`.trim()} {...rest} />;
  },
  { Text: ForgeInputGroupText },
);
