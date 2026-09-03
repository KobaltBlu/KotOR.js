import React, { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

export interface ForgeInputProps extends InputHTMLAttributes<HTMLInputElement> {
  size?: any;
  as?: string;
  rows?: number;
}

export const ForgeInput = forwardRef<HTMLInputElement, ForgeInputProps>(function ForgeInput(
  { className = "", type = "text", size: _size, as, ...rest }: ForgeInputProps & { as?: string },
  ref,
) {
  if (as === "textarea") {
    return <textarea ref={ref as any} className={`forge-input ${className}`.trim()} {...(rest as any)} />;
  }
  return <input ref={ref} type={type} className={`forge-input ${className}`.trim()} {...rest} />;
});

export interface ForgeTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const ForgeTextArea = forwardRef<HTMLTextAreaElement, ForgeTextAreaProps>(function ForgeTextArea(
  { className = "", ...rest },
  ref,
) {
  return <textarea ref={ref} className={`forge-input ${className}`.trim()} {...rest} />;
});
