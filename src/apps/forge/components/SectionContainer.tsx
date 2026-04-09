import React, { useState } from "react"

export interface SectionContainerProps {
  name: string;
  children?: React.ReactNode;
  slim?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const SectionContainer = function(props: SectionContainerProps){
  const slim = props.slim ? true : false;
  const collapsible = props.collapsible ?? false;
  const [open, setOpen] = useState<boolean>(props.defaultOpen ?? true);

  const handleHeaderClick = () => {
    if (collapsible) setOpen(!open);
  };

  return (
    <div className={`section ${collapsible && !open ? 'section-collapsed' : ''}`}>
      <div
        className={`section-header ${collapsible ? 'section-header-collapsible' : ''}`}
        onClick={handleHeaderClick}
      >
        {collapsible && (
          <span className={`section-collapse-arrow ${open ? 'open' : ''}`}>&#9656;</span>
        )}
        {props.name}
      </div>
      {(!collapsible || open) && (
        <div className={`section-content ${slim ? 'section-content-slim' : ''}`}>
          {props.children}
        </div>
      )}
    </div>
  )
}
