import React, { SelectHTMLAttributes, forwardRef } from "react";

export interface ForgeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  size?: any;
}

export const ForgeSelect = forwardRef<HTMLSelectElement, ForgeSelectProps>(function ForgeSelect(
  { className = "", size: _size, ...rest },
  ref,
) {
  return <select ref={ref} className={`forge-select ${className}`.trim()} {...rest} />;
});
