import React, { ButtonHTMLAttributes, forwardRef } from "react";

export type ForgeButtonVariant =
  | "default"
  | "primary"
  | "danger"
  | "ghost"
  | "secondary"
  | "outline-secondary"
  | "outline-danger"
  | "link"
  | "warning";
export type ForgeButtonSize = "md" | "sm";

export interface ForgeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ForgeButtonVariant;
  size?: ForgeButtonSize;
  active?: boolean;
}

const variantClass: Record<ForgeButtonVariant, string> = {
  default: "",
  secondary: "",
  "outline-secondary": "",
  primary: "forge-btn--primary",
  danger: "forge-btn--danger",
  "outline-danger": "forge-btn--danger",
  warning: "forge-btn--primary",
  ghost: "forge-btn--ghost",
  link: "forge-btn--ghost",
};

export const ForgeButton = forwardRef<HTMLButtonElement, ForgeButtonProps>(function ForgeButton(
  { variant = "default", size = "md", active, className = "", type = "button", ...rest },
  ref,
) {
  const classes = [
    "forge-btn",
    variantClass[variant] || "",
    size === "sm" ? "forge-btn--sm" : "",
    active ? "is-active" : "",
    className,
  ].filter(Boolean).join(" ");

  return <button ref={ref} type={type} className={classes} {...rest} />;
});
