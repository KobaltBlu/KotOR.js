import React from "react";
import "./ForgeTreeView.scss";

export const ForgeTreeView = ({ children, style }: { children: React.ReactNode, style?: React.CSSProperties }) => {
  return (
    <ul className="forgeTreeView" style={style}>
      {children}
    </ul>
  )
}