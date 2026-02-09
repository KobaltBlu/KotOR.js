import React from "react";
import "./ForgeTreeView.scss";

export const ForgeTreeView = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <ul className={["forgeTreeView", className].filter(Boolean).join(" ")}>
      {children}
    </ul>
  );
};
