import React from "react";
import { InfoBubble } from "../info-bubble/info-bubble";


// Helper component for form fields with info bubbles
export const FormField = ({ label, info, children, className = '' }: { 
  label: string; 
  info: string; 
  children: React.ReactNode; 
  className?: string;
}) => (
  <tr className={className}>
    <td>
      <InfoBubble content={info} position="right">
        <label style={{ cursor: 'help' }}>{label}</label>
      </InfoBubble>
    </td>
    <td>{children}</td>
  </tr>
);