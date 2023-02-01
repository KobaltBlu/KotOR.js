import React from "react"

export interface SectionContainerProps {
  name: string;
  children?: React.ReactNode;
}

export const SectionContainer = function(props: any){
  return (
    <div className="section">
      <div className="section-header">
        {props.name}
      </div>
      <div className="section-content">
        {props.children}
      </div>
    </div>
  )
}