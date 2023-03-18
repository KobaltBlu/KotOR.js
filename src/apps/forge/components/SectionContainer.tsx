import React from "react"

export interface SectionContainerProps {
  name: string;
  children?: React.ReactNode;
}

export const SectionContainer = function(props: any){
  const slim = props.slim ? true : false;
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