import React from "react";

import { createScopedLogger, LogScope } from "../../../utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export interface SectionContainerProps {
  name: string;
  slim?: boolean;
  children?: React.ReactNode;
}

export const SectionContainer: React.FC<SectionContainerProps> = (props) => {
  log.trace('SectionContainer render', props.name);
  const slim = props.slim === true;
  return (
    <div className="section">
      <div className="section-header">
        {props.name}
      </div>
      <div className={`section-content ${slim ? 'section-content-slim' : ''}`}>
        {props.children}
      </div>
    </div>
  )
}