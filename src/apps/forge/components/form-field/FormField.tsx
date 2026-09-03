import React from "react";
import { InfoBubble } from "@/apps/forge/components/info-bubble/info-bubble";

export const FormField = ({ label, info, children, className = '' }: {
  label: string;
  info: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <tr className={`forge-property-row ${className}`.trim()}>
    <td>
      <InfoBubble content={info} position="right">
        <label>{label}</label>
      </InfoBubble>
    </td>
    <td>{children}</td>
  </tr>
);
