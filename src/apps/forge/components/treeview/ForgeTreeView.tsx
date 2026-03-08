import React from "react";
import "@/apps/forge/components/treeview/ForgeTreeView.scss";

export const ForgeTreeView = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <ul className={["forgeTreeView", className].filter(Boolean).join(" ")}>
      {children}
    </ul>
  );
};
